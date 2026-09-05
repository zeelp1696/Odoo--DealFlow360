import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', requireRoles('admin', 'sales_manager', 'finance'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT a.id, a.quotation_id, a.requires_manager, a.requires_finance,
             a.current_stage, a.status, a.created_at, q.code, q.status AS quotation_status,
             q.blended_risk_score, q.risk_label, c.name AS customer_name,
             u.name AS rep_name
      FROM approvals a
      JOIN quotations q ON q.id = a.quotation_id
      JOIN customers c ON c.id = q.customer_id
      JOIN users u ON u.id = q.rep_id
      WHERE a.status = 'Pending'
        AND ($1 = 'admin' OR ($1 = 'sales_manager' AND a.current_stage = 'Sales Manager') OR ($1 = 'finance' AND a.current_stage = 'Finance'))
      ORDER BY a.created_at ASC
    `, [req.user.role]);
    return res.json({ approvals: result.rows });
  } catch (error) { return next(error); }
});

router.patch('/:id', requireRoles('admin', 'sales_manager', 'finance'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { action, note = '' } = req.body;
    if (!['Approved', 'Rejected', 'Returned'].includes(action)) return res.status(400).json({ message: 'Action must be Approved, Rejected, or Returned.' });
    await client.query('BEGIN');
    const approval = (await client.query(`SELECT a.*, q.code FROM approvals a JOIN quotations q ON q.id = a.quotation_id WHERE a.id = $1 FOR UPDATE`, [req.params.id])).rows[0];
    if (!approval || approval.status !== 'Pending') { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Pending approval not found.' }); }
    const managerAction = req.user.role === 'sales_manager' && approval.current_stage === 'Sales Manager';
    const financeAction = req.user.role === 'finance' && approval.current_stage === 'Finance';
    if (req.user.role !== 'admin' && !managerAction && !financeAction) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'This approval is not assigned to your role.' }); }

    let nextStatus = 'Pending';
    let nextStage = approval.current_stage;
    let quotationStatus = 'Pending Approval';
    if (action === 'Rejected') { nextStatus = 'Rejected'; quotationStatus = 'Rejected'; }
    if (action === 'Returned') { nextStatus = 'Returned'; quotationStatus = 'Negotiation'; }
    if (action === 'Approved' && approval.current_stage === 'Sales Manager' && approval.requires_finance) nextStage = 'Finance';
    if (action === 'Approved' && (approval.current_stage === 'Finance' || !approval.requires_finance)) { nextStatus = 'Approved'; quotationStatus = 'Approved'; nextStage = 'Done'; }
    await client.query('UPDATE approvals SET status = $1, current_stage = $2, assigned_to = $3 WHERE id = $4', [nextStatus, nextStage, req.user.id, req.params.id]);
    await client.query('UPDATE quotations SET status = $1, last_activity_at = now() WHERE id = $2', [quotationStatus, approval.quotation_id]);
    await client.query('INSERT INTO approval_audit_log (approval_id, user_id, action, note) VALUES ($1, $2, $3, $4)', [approval.id, req.user.id, action, note]);
    await client.query('COMMIT');
    return res.json({ approval: { ...approval, status: nextStatus, current_stage: nextStage }, quotationStatus });
  } catch (error) { await client.query('ROLLBACK'); return next(error); }
  finally { client.release(); }
});

export default router;