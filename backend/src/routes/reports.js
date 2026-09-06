import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRoles('admin', 'sales_manager', 'finance'));

router.get('/audit', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT a.id, a.action, a.note, a.created_at, u.name as user_name, q.code as quotation_code
      FROM approval_audit_log a
      JOIN users u ON a.user_id = u.id
      JOIN approvals ap ON a.approval_id = ap.id
      JOIN quotations q ON ap.quotation_id = q.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    
    return res.json({ logs: result.rows });
  } catch (error) {
    return next(error);
  }
});

// GET /api/reports — summary stats with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { period, approval_status, product } = req.query;

    // Build date filter
    let dateFilter = '';
    if (period === 'this_month') dateFilter = `AND q.created_at >= date_trunc('month', now())`;
    else if (period === 'last_month') dateFilter = `AND q.created_at >= date_trunc('month', now() - interval '1 month') AND q.created_at < date_trunc('month', now())`;
    else if (period === 'this_year') dateFilter = `AND q.created_at >= date_trunc('year', now())`;

    // Build status filter
    let statusFilter = approval_status ? `AND q.status = $1` : '';
    const statusParam = approval_status ? [approval_status] : [];

    // Quotes created
    const quotesResult = await query(`
      SELECT COUNT(*) as total FROM quotations q WHERE 1=1 ${dateFilter} ${statusFilter}
    `, statusParam);

    // Approved vs rejected
    const approvedResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE q.status = 'Approved') as approved,
        COUNT(*) FILTER (WHERE q.status = 'Rejected') as rejected,
        COUNT(*) FILTER (WHERE q.status = 'Pending Approval') as pending,
        COUNT(*) FILTER (WHERE q.status = 'Draft') as draft,
        COUNT(*) FILTER (WHERE q.status = 'Negotiation') as negotiation
      FROM quotations q WHERE 1=1 ${dateFilter}
    `);

    // Risk distribution
    const riskResult = await query(`
      SELECT risk_label, COUNT(*) as count 
      FROM quotations q WHERE risk_label IS NOT NULL ${dateFilter}
      GROUP BY risk_label
    `);

    // Top subscription plan
    const topSubResult = await query(`
      SELECT sp.name, COUNT(*) as count 
      FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id 
      WHERE s.status = 'Active'
      GROUP BY sp.name ORDER BY count DESC LIMIT 1
    `);

    // Top product by quotation lines
    const topProductResult = await query(`
      SELECT p.name, COUNT(*) as appearances, SUM(ql.quantity) as total_qty
      FROM quotation_lines ql
      JOIN products p ON p.id = ql.product_id
      JOIN quotations q ON q.id = ql.quotation_id
      WHERE 1=1 ${dateFilter}
      ${product ? `AND p.name ILIKE '%${product.replace(/'/g, "''")}%'` : ''}
      GROUP BY p.name ORDER BY appearances DESC LIMIT 5
    `);

    // Avg approval time (from submit to first audit decision)
    const avgApprovalResult = await query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (aal.created_at - a.created_at)) / 3600.0)::numeric, 1) as avg_hours
      FROM approvals a
      JOIN approval_audit_log aal ON aal.approval_id = a.id
      WHERE aal.action IN ('Approved', 'Rejected', 'Returned')
    `);

    // User activity: quotes per rep
    const repActivityResult = await query(`
      SELECT u.name as rep_name, u.role, COUNT(q.id) as quote_count
      FROM users u
      LEFT JOIN quotations q ON q.rep_id = u.id ${dateFilter.replace('AND', 'AND')}
      WHERE u.role IN ('sales_rep', 'sales_manager')
      GROUP BY u.id, u.name, u.role
      ORDER BY quote_count DESC
    `);

    // Monthly trend (last 6 months)
    const trendResult = await query(`
      SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YY') as month,
             COUNT(*) as count
      FROM quotations
      WHERE created_at >= now() - interval '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)
    `);

    return res.json({
      stats: {
        quotes_created: quotesResult.rows[0].total,
        avg_approval_hours: avgApprovalResult.rows[0]?.avg_hours || null,
        top_upsold_plan: topSubResult.rows[0]?.name || 'N/A',
      },
      status_breakdown: approvedResult.rows[0],
      risk_distribution: riskResult.rows,
      top_products: topProductResult.rows,
      rep_activity: repActivityResult.rows,
      monthly_trend: trendResult.rows,
    });
  } catch (error) { return next(error); }
});

// GET /api/reports/export — returns raw data for CSV/XLS download
router.get('/export', async (req, res, next) => {
  try {
    const { format = 'csv', period, product } = req.query;

    let dateFilter = '';
    if (period === 'this_month') dateFilter = `AND q.created_at >= date_trunc('month', now())`;
    else if (period === 'last_month') dateFilter = `AND q.created_at >= date_trunc('month', now() - interval '1 month') AND q.created_at < date_trunc('month', now())`;
    else if (period === 'this_year') dateFilter = `AND q.created_at >= date_trunc('year', now())`;

    const result = await query(`
      SELECT q.code, c.name as customer, q.status, q.risk_label, q.blended_risk_score,
             u.name as rep_name, q.created_at::date as created_date
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN users u ON u.id = q.rep_id
      WHERE 1=1 ${dateFilter}
      ${product ? `AND EXISTS (SELECT 1 FROM quotation_lines ql JOIN products p ON p.id = ql.product_id WHERE ql.quotation_id = q.id AND p.name ILIKE '%${product.replace(/'/g, "''")}%')` : ''}
      ORDER BY q.created_at DESC
    `);

    const rows = result.rows;
    const headers = ['Quotation Code', 'Customer', 'Status', 'Risk Label', 'Blended Score', 'Rep Name', 'Created Date'];
    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        r.code, r.customer, r.status, r.risk_label || '', r.blended_risk_score || '',
        r.rep_name, r.created_date
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ];
    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dealflow360-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (error) { return next(error); }
});

export default router;
