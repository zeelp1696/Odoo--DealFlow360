import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRoles('admin', 'sales_manager', 'finance'));

// Helper: load config from system_config table
async function getConfig() {
  const result = await query('SELECT key, value FROM system_config');
  const config = {};
  for (const row of result.rows) {
    config[row.key] = row.value;
  }
  return config;
}

// GET /api/deal-health — compute flags dynamically from live data
router.get('/', async (req, res, next) => {
  try {
    const config = await getConfig();
    const stalledDays = parseInt(config.stalled_deal_days) || 7;
    const anomalyMultiplier = parseFloat(config.anomaly_multiplier) || 1.5;

    // 1. Stalled deals — quotations with no activity for stalled_deal_days
    const stalledResult = await query(`
      SELECT q.id as quotation_id, q.code, c.name as customer_name,
             q.status, q.last_activity_at,
             EXTRACT(DAY FROM now() - q.last_activity_at)::int as idle_days,
             u.name as rep_name,
             dhf.id as flag_id, dhf.flag_type, dhf.detail as action_taken, dhf.created_at as flagged_at
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN users u ON u.id = q.rep_id
      LEFT JOIN deal_health_flags dhf ON dhf.quotation_id = q.id AND dhf.flag_type = 'stalled'
      WHERE q.status IN ('Draft', 'Pending Approval', 'Negotiation')
        AND q.last_activity_at < now() - ($1 || ' days')::interval
      ORDER BY q.last_activity_at ASC
    `, [stalledDays]);

    // 2. Discount anomalies — HIGH risk quotations compared to rep average
    const repAvgResult = await query(`
      SELECT q.rep_id, AVG(ql.discount_percent) as avg_discount
      FROM quotations q
      JOIN quotation_lines ql ON ql.quotation_id = q.id
      WHERE q.status != 'Draft'
      GROUP BY q.rep_id
    `);
    const repAvgMap = {};
    for (const r of repAvgResult.rows) repAvgMap[r.rep_id] = parseFloat(r.avg_discount);

    const anomalyResult = await query(`
      SELECT q.id as quotation_id, q.code, c.name as customer_name, q.status,
             q.blended_risk_score, q.risk_label, q.rep_id, u.name as rep_name,
             q.created_at as last_activity_at,
             AVG(ql.discount_percent) as avg_discount_given,
             dhf.id as flag_id, dhf.flag_type, dhf.detail as action_taken, dhf.created_at as flagged_at
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN users u ON u.id = q.rep_id
      JOIN quotation_lines ql ON ql.quotation_id = q.id
      LEFT JOIN deal_health_flags dhf ON dhf.quotation_id = q.id AND dhf.flag_type = 'discount_anomaly'
      WHERE q.risk_label = 'HIGH'
      GROUP BY q.id, q.code, c.name, q.status, q.blended_risk_score, q.risk_label, q.rep_id, u.name, q.created_at, dhf.id, dhf.flag_type, dhf.detail, dhf.created_at
      ORDER BY q.blended_risk_score DESC
    `);

    // Filter to those above the multiplier threshold
    const anomalies = anomalyResult.rows.filter(r => {
      const repAvg = repAvgMap[r.rep_id] || 0;
      return repAvg > 0 && parseFloat(r.avg_discount_given) > repAvg * anomalyMultiplier;
    }).map(r => ({
      ...r,
      rep_avg_discount: repAvgMap[r.rep_id]?.toFixed(1) || '0',
    }));

    // 3. Delivery slippage — backorder fulfillment orders
    const slippageResult = await query(`
      SELECT fo.id as fulfillment_id, fo.status, q.id as quotation_id, q.code,
             c.name as customer_name, q.created_at as last_activity_at,
             u.name as rep_name,
             dhf.id as flag_id, dhf.flag_type, dhf.detail as action_taken, dhf.created_at as flagged_at
      FROM fulfillment_orders fo
      JOIN quotations q ON q.id = fo.quotation_id
      JOIN customers c ON c.id = q.customer_id
      JOIN users u ON u.id = q.rep_id
      LEFT JOIN deal_health_flags dhf ON dhf.quotation_id = q.id AND dhf.flag_type = 'delivery_slippage'
      WHERE fo.status = 'Backorder'
      ORDER BY fo.id DESC
    `);

    // Merge all flags into a unified list
    const allFlags = [
      ...stalledResult.rows.map(r => ({
        ...r,
        flag_type: 'stalled',
        issue: `Idle ${r.idle_days} days`,
        issue_detail: `Quotation in ${r.status} with no activity for ${r.idle_days} days (threshold: ${stalledDays} days)`,
      })),
      ...anomalies.map(r => ({
        ...r,
        flag_type: 'discount_anomaly',
        issue: `Discount ${parseFloat(r.avg_discount_given).toFixed(0)}% vs avg ${r.rep_avg_discount}%`,
        issue_detail: `HIGH risk quote — discount ${parseFloat(r.avg_discount_given).toFixed(1)}% is ${anomalyMultiplier}x above this rep's average of ${r.rep_avg_discount}%`,
      })),
      ...slippageResult.rows.map(r => ({
        ...r,
        flag_type: 'delivery_slippage',
        issue: 'Backorder — promise date at risk',
        issue_detail: 'Fulfillment order is in Backorder status. Customer delivery may be delayed.',
      })),
    ];

    return res.json({
      kpis: {
        stalled_deals: stalledResult.rows.length,
        discount_anomalies: anomalies.length,
        delivery_slippage: slippageResult.rows.length,
      },
      config: { stalled_deal_days: stalledDays, anomaly_multiplier: anomalyMultiplier },
      flags: allFlags,
    });
  } catch (error) { return next(error); }
});

// POST /api/deal-health/:quotationId/action — record action against a flag
router.post('/:quotationId/action', requireRoles('admin', 'sales_manager'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { action, flag_type } = req.body; // action: 'escalate' | 'nudge'
    if (!['escalate', 'nudge'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "escalate" or "nudge".' });
    }

    const actionLabel = action === 'escalate' ? 'Escalated to Manager' : 'Nudge sent';

    await client.query('BEGIN');

    // Upsert — update if flag exists, insert if not
    await client.query(`
      INSERT INTO deal_health_flags (quotation_id, flag_type, detail, created_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT DO NOTHING
    `, [req.params.quotationId, flag_type || 'stalled', actionLabel]);

    // Update the detail of any existing flag for this quotation + type
    await client.query(`
      UPDATE deal_health_flags SET detail = $1
      WHERE quotation_id = $2 AND flag_type = $3
    `, [actionLabel, req.params.quotationId, flag_type || 'stalled']);

    await client.query('COMMIT');
    return res.json({ message: `Action "${actionLabel}" recorded successfully.` });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

// GET /api/deal-health/config — expose system_config thresholds (admin only)
router.get('/config', requireRoles('admin'), async (req, res, next) => {
  try {
    const result = await query('SELECT key, value, description FROM system_config ORDER BY key');
    return res.json({ config: result.rows });
  } catch (error) { return next(error); }
});

export default router;
