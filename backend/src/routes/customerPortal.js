import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('customer'));

router.patch('/profile', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    if (name.length > 120) return res.status(400).json({ message: 'Name must be 120 characters or fewer.' });
    const result = await query('UPDATE users SET name = $1 WHERE id = $2 AND role = \'customer\' RETURNING id, name, email, role, customer_id', [name, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Customer profile not found.' });
    return res.json({ user: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/quote', async (req, res, next) => {
  try {
    const quote = (await query(`SELECT q.id, q.code, q.status, q.customer_id, c.name AS customer_name FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE q.customer_id = $1 ORDER BY q.created_at DESC LIMIT 1`, [req.user.customerId])).rows[0];
    if (!quote) return res.json({ quote: null, lines: [], messages: [] });
    const lines = (await query(`SELECT ql.id, p.name, ql.quantity, ql.unit_price, ql.discount_percent, ql.allowed_limit_percent FROM quotation_lines ql JOIN products p ON p.id = ql.product_id WHERE ql.quotation_id = $1 ORDER BY ql.id`, [quote.id])).rows;
    const messages = (await query(`SELECT id, quotation_line_id, sender_role, comment, counter_discount_percent, requested_delivery_date, created_at FROM negotiation_messages WHERE quotation_id = $1 ORDER BY created_at ASC`, [quote.id])).rows;
    return res.json({ quote, lines, messages });
  } catch (error) { return next(error); }
});

router.post('/quote/:id/messages', async (req, res, next) => {
  try {
    const ownsQuote = (await query('SELECT id FROM quotations WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.customerId])).rows[0];
    if (!ownsQuote) return res.status(404).json({ message: 'Quotation not found in your portal.' });
    const { quotationLineId = null, comment = '', counterDiscountPercent, requestedDeliveryDate } = req.body;
    if (!comment.trim() || counterDiscountPercent === undefined || counterDiscountPercent === null || counterDiscountPercent === '' || !requestedDeliveryDate) return res.status(400).json({ message: 'Question, counter discount, and requested delivery date are required.' });
    if (Number(counterDiscountPercent) < 0 || Number(counterDiscountPercent) > 100) return res.status(400).json({ message: 'Counter discount must be between 0 and 100.' });
    const result = await query(`INSERT INTO negotiation_messages (quotation_id, quotation_line_id, sender_role, comment, counter_discount_percent, requested_delivery_date) VALUES ($1, $2, 'customer', $3, $4, $5) RETURNING *`, [req.params.id, quotationLineId, comment.trim(), counterDiscountPercent, requestedDeliveryDate]);
    await query(`UPDATE quotations SET status = 'Negotiation', last_activity_at = now() WHERE id = $1`, [req.params.id]);
    return res.status(201).json({ message: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/quote/:id/confirm', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quote = (await client.query('SELECT id, status FROM quotations WHERE id = $1 AND customer_id = $2 FOR UPDATE', [req.params.id, req.user.customerId])).rows[0];
    if (!quote) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Quotation not found in your portal.' }); }
    const counter = (await client.query(`SELECT max(counter_discount_percent) AS counter_discount, bool_or(counter_discount_percent > ql.allowed_limit_percent) AS exceeds_limit FROM negotiation_messages nm LEFT JOIN quotation_lines ql ON ql.id = nm.quotation_line_id WHERE nm.quotation_id = $1`, [quote.id])).rows[0];
    const needsApproval = counter.exceeds_limit === true;
    const nextStatus = needsApproval ? 'Pending Approval' : 'Confirmed';
    await client.query('UPDATE quotations SET status = $1, last_activity_at = now() WHERE id = $2', [nextStatus, quote.id]);
    if (needsApproval) await client.query(`INSERT INTO approvals (quotation_id, requires_manager, requires_finance, current_stage) SELECT $1, true, false, 'Sales Manager' WHERE NOT EXISTS (SELECT 1 FROM approvals WHERE quotation_id = $1 AND status = 'Pending')`, [quote.id]);
    await client.query('COMMIT');
    return res.json({ status: nextStatus, requiresApproval: needsApproval });
  } catch (error) { await client.query('ROLLBACK'); return next(error); }
  finally { client.release(); }
});

export default router;