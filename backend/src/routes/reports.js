import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('admin', 'sales_manager', 'finance'));

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

router.get('/export', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT q.code, q.status, c.name as customer_name, u.name as rep_name, q.created_at
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.rep_id = u.id
      ORDER BY q.created_at DESC
    `);
    
    // Convert to CSV
    let csv = 'Quotation Code,Customer,Sales Rep,Status,Created At\n';
    result.rows.forEach(row => {
      csv += `${row.code},"${row.customer_name}","${row.rep_name}",${row.status},${new Date(row.created_at).toISOString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=quotations_export.csv');
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
});

export default router;
