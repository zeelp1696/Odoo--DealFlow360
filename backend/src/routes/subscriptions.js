import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/subscriptions - list all subscriptions
router.get('/', requireRoles('admin', 'sales_rep', 'sales_manager', 'finance'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.id, s.status, s.next_bill_date, s.quantity,
             c.name AS customer_name,
             sp.name AS plan_name, sp.cycle, sp.price
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN subscription_plans sp ON sp.id = s.plan_id
      ORDER BY s.created_at DESC
    `);

    const rows = result.rows;
    const counts = {
      active: rows.filter(r => r.status === 'Active').length,
      paused: rows.filter(r => r.status === 'Paused').length,
      cancelled: rows.filter(r => r.status === 'Cancelled').length,
    };

    return res.json({ subscriptions: rows, counts });
  } catch (error) { return next(error); }
});

// GET /api/subscriptions/:id - billing detail for a subscription
router.get('/:id', requireRoles('admin', 'sales_rep', 'sales_manager', 'finance'), async (req, res, next) => {
  try {
    const subResult = await query(`
      SELECT s.id, s.status, s.next_bill_date, s.quantity, s.quotation_id, s.customer_id,
             c.name AS customer_name,
             sp.name AS plan_name, sp.cycle, sp.price, sp.proration_rule, sp.cancellation_rule
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!subResult.rows.length) return res.status(404).json({ message: 'Subscription not found.' });
    const subscription = subResult.rows[0];

    // One-time lines from the originating quotation
    const oneTimeLines = subscription.quotation_id ? (await query(`
      SELECT ql.quantity, ql.unit_price, (ql.quantity * ql.unit_price) AS amount, p.name AS product_name
      FROM quotation_lines ql
      JOIN products p ON p.id = ql.product_id
      WHERE ql.quotation_id = $1 AND (ql.is_subscription_line = false OR ql.is_subscription_line IS NULL)
      ORDER BY ql.id
    `, [subscription.quotation_id])).rows : [];

    // All recurring subscriptions for this customer
    const recurringLines = (await query(`
      SELECT s.id, s.next_bill_date, s.quantity, s.status,
             sp.name AS plan_name, sp.cycle, sp.price,
             (s.quantity * sp.price) AS amount
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.customer_id = $1 AND s.status != 'Cancelled'
      ORDER BY s.id
    `, [subscription.customer_id])).rows;

    return res.json({ subscription, one_time_lines: oneTimeLines, recurring_lines: recurringLines });
  } catch (error) { return next(error); }
});

// PATCH /api/subscriptions/:id - modify or cancel
router.patch('/:id', requireRoles('admin', 'sales_manager'), async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['modify', 'cancel'].includes(action)) return res.status(400).json({ message: 'Action must be "modify" or "cancel".' });

    const newStatus = action === 'cancel' ? 'Cancelled' : 'Active';
    const result = await query(
      'UPDATE subscriptions SET status = $1 WHERE id = $2 RETURNING *',
      [newStatus, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Subscription not found.' });
    return res.json({ subscription: result.rows[0] });
  } catch (error) { return next(error); }
});

// POST /api/subscriptions - create a new subscription (admin only)
router.post('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const { customer_id, plan_id, quantity = 1, next_bill_date } = req.body;
    if (!customer_id || !plan_id) return res.status(400).json({ message: 'customer_id and plan_id are required.' });

    const result = await query(
      'INSERT INTO subscriptions (customer_id, plan_id, quantity, next_bill_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_id, plan_id, quantity, next_bill_date || null, 'Active']
    );

    return res.status(201).json({ subscription: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
