import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('sales_manager', 'finance', 'admin'));

router.get('/', async (req, res, next) => {
  try {
    // 1. Fetch the tunable configs
    const configRes = await query('SELECT key, value FROM system_config');
    const config = {};
    configRes.rows.forEach(r => { config[r.key] = r.value; });

    const stalledDays = parseInt(config.stalled_deal_days || '5', 10);
    // const anomalyMult = parseFloat(config.anomaly_multiplier || '1.5');
    // const deliverySlippage = parseInt(config.delivery_slippage_days || '3', 10);

    // 2. Fetch Stalled Deals
    // Any quotation in Pending Approval or Negotiation that hasn't had activity in `stalled_deal_days`
    const stalledRes = await query(`
      SELECT q.id, q.code, q.status, q.last_activity_at, c.name as customer_name
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE q.status IN ('Pending Approval', 'Negotiation')
        AND q.last_activity_at < NOW() - INTERVAL '1 day' * $1
      ORDER BY q.last_activity_at ASC
    `, [stalledDays]);

    // 3. Fetch Delivery Slippage or other anomalies (mocking complex anomaly checks for now)
    // In a full system, anomaly_multiplier would compare rep historical average vs current quote
    
    // We can just query `deal_health_flags` to see if there are any hard flags inserted.
    const flagsRes = await query(`
      SELECT f.id, f.flag_type, f.detail, f.created_at, q.code as quotation_code, c.name as customer_name
      FROM deal_health_flags f
      JOIN quotations q ON f.quotation_id = q.id
      JOIN customers c ON q.customer_id = c.id
      ORDER BY f.created_at DESC
    `);

    return res.json({
      stalled: stalledRes.rows,
      flags: flagsRes.rows,
      config
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
