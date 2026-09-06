import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { calculateBlendedRisk } from '../utils/blendedRiskScore.js';
import { generateBillingForQuotation } from './billing.js';

const router = Router();
router.use(requireAuth);

async function loadQuotation(id, user) {
  const params = [id];
  let scope = '';
  if (user.role === 'sales_rep') { params.push(user.id); scope = 'AND q.rep_id = $2'; }
  if (user.role === 'customer') { params.push(user.id); scope = 'AND q.user_id = $2'; }
  return (await query(`SELECT q.*, COALESCE(u.name, c.name) AS customer_name FROM quotations q LEFT JOIN users u ON u.id = q.user_id LEFT JOIN customers c ON c.id = q.customer_id WHERE q.id = $1 ${scope}`, params)).rows[0];
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let scope = '';
    if (req.user.role === 'sales_rep') { params.push(req.user.id); scope = 'WHERE q.rep_id = $1'; }
    if (req.user.role === 'customer') { params.push(req.user.id); scope = 'WHERE q.user_id = $1'; }
    const result = await query(`SELECT q.id, q.code, q.status, q.blended_risk_score, q.risk_label, q.created_at, COALESCE(u.name, c.name) AS customer_name FROM quotations q LEFT JOIN users u ON u.id = q.user_id LEFT JOIN customers c ON c.id = q.customer_id ${scope} ORDER BY q.created_at DESC`, params);
    return res.json({ quotations: result.rows });
  } catch (error) { return next(error); }
});

router.post('/', requireRoles('sales_rep', 'sales_manager', 'admin'), async (req, res, next) => {
  try {
    const { userId, priceListId = null } = req.body;
    const targetUser = (await query('SELECT id, customer_id, name FROM users WHERE id = $1', [userId])).rows[0];
    if (!targetUser) return res.status(400).json({ message: 'Select a valid user.' });
    
    const customerId = targetUser.customer_id;
    const code = `Q-${Date.now().toString().slice(-7)}`;
    const result = await query('INSERT INTO quotations (code, customer_id, user_id, rep_id, price_list_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [code, customerId, userId, req.user.id, priceListId]);
    return res.status(201).json({ quotation: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quotation = await loadQuotation(req.params.id, req.user);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
    const lines = (await query(`SELECT ql.*, p.name AS product_name, p.category FROM quotation_lines ql JOIN products p ON p.id = ql.product_id WHERE ql.quotation_id = $1 ORDER BY ql.id`, [req.params.id])).rows;
    return res.json({ quotation, lines });
  } catch (error) { return next(error); }
});

router.post('/:id/lines', requireRoles('sales_rep', 'sales_manager', 'admin'), async (req, res, next) => {
  try {
    const quotation = await loadQuotation(req.params.id, req.user);
    if (!quotation || quotation.status !== 'Draft') return res.status(404).json({ message: 'Editable draft quotation not found.' });
    const { productId, quantity = 1, discountPercent = 0 } = req.body;
    const product = (await query('SELECT p.* FROM products p WHERE p.id = $1', [productId])).rows[0];
    if (!product || Number(quantity) < 1 || Number(discountPercent) < 0 || Number(discountPercent) > 100) return res.status(400).json({ message: 'Select a valid product, quantity, and discount.' });
    
    const targetUser = (await query('SELECT customer_id FROM users WHERE id = $1', [quotation.user_id])).rows[0];
    let tier = 'Bronze';
    if (targetUser && targetUser.customer_id) {
      const customer = (await query('SELECT tier FROM customers WHERE id = $1', [targetUser.customer_id])).rows[0];
      if (customer && customer.tier) tier = customer.tier;
    }
    
    const ceiling = (await query('SELECT max_discount_percent FROM discount_tier_ceilings WHERE tier = $1 AND category = $2', [tier, product.category])).rows[0];
    const allowedLimit = Number(ceiling?.max_discount_percent || 0);
    const line = (await query(`INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, discount_percent, allowed_limit_percent, over_limit_points, line_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [req.params.id, productId, quantity, product.base_price, discountPercent, allowedLimit, Math.max(0, discountPercent - allowedLimit), Number(discountPercent) > allowedLimit ? 'OVER' : 'OK'])).rows[0];
    await query('UPDATE quotations SET last_activity_at = now() WHERE id = $1', [req.params.id]);
    return res.status(201).json({ line });
  } catch (error) { return next(error); }
});

router.patch('/:id/lines/:lineId', requireRoles('sales_rep', 'sales_manager', 'admin'), async (req, res, next) => {
  try {
    const quotation = await loadQuotation(req.params.id, req.user);
    if (!quotation || quotation.status !== 'Draft') return res.status(404).json({ message: 'Editable draft quotation not found.' });
    
    const { quantity, discountPercent } = req.body;
    
    const existingLine = (await query('SELECT * FROM quotation_lines WHERE id = $1 AND quotation_id = $2', [req.params.lineId, req.params.id])).rows[0];
    if (!existingLine) return res.status(404).json({ message: 'Quotation line not found.' });

    const product = (await query('SELECT p.*, c.tier FROM products p JOIN customers c ON c.id = $2 WHERE p.id = $1', [existingLine.product_id, quotation.customer_id])).rows[0];
    const newQty = quantity !== undefined ? Number(quantity) : existingLine.quantity;
    const newDiscount = discountPercent !== undefined ? Number(discountPercent) : existingLine.discount_percent;

    if (newQty < 1 || newDiscount < 0 || newDiscount > 100) return res.status(400).json({ message: 'Invalid quantity or discount.' });

    const ceiling = (await query('SELECT max_discount_percent FROM discount_tier_ceilings WHERE tier = $1 AND category = $2', [product.tier, product.category])).rows[0];
    const allowedLimit = Number(ceiling?.max_discount_percent || 0);
    const overLimitPoints = Math.max(0, newDiscount - allowedLimit);
    const lineStatus = newDiscount > allowedLimit ? 'OVER' : 'OK';

    const line = (await query(
      `UPDATE quotation_lines SET quantity = $1, discount_percent = $2, over_limit_points = $3, line_status = $4 WHERE id = $5 RETURNING *`,
      [newQty, newDiscount, overLimitPoints, lineStatus, req.params.lineId]
    )).rows[0];
    
    await query('UPDATE quotations SET last_activity_at = now() WHERE id = $1', [req.params.id]);
    return res.json({ line });
  } catch (error) { return next(error); }
});

router.delete('/:id/lines/:lineId', requireRoles('sales_rep', 'sales_manager', 'admin'), async (req, res, next) => {
  try {
    const quotation = await loadQuotation(req.params.id, req.user);
    if (!quotation || quotation.status !== 'Draft') return res.status(404).json({ message: 'Editable draft quotation not found.' });
    
    const result = await query('DELETE FROM quotation_lines WHERE id = $1 AND quotation_id = $2 RETURNING *', [req.params.lineId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Quotation line not found.' });
    
    await query('UPDATE quotations SET last_activity_at = now() WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Line deleted' });
  } catch (error) { return next(error); }
});

router.post('/:id/submit', requireRoles('sales_rep', 'sales_manager', 'admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quote = await loadQuotation(req.params.id, req.user);
    if (!quote || quote.status !== 'Draft') { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Editable draft quotation not found.' }); }
    const lines = (await client.query('SELECT quantity, unit_price AS "unitPrice", discount_percent AS "discountPercent", allowed_limit_percent AS "allowedLimitPercent" FROM quotation_lines WHERE quotation_id = $1', [req.params.id])).rows;
    if (!lines.length) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Add at least one product line before submitting.' }); }
    const rules = (await client.query('SELECT * FROM approval_chain_rules ORDER BY min_over_limit_points')).rows;
    const risk = calculateBlendedRisk(lines, rules);
    const status = risk.requiresManager || risk.requiresFinance ? 'Pending Approval' : 'Approved';
    const updated = (await client.query('UPDATE quotations SET status = $1, blended_risk_score = $2, risk_label = $3, last_activity_at = now() WHERE id = $4 RETURNING *', [status, risk.score, risk.riskLabel, req.params.id])).rows[0];
    if (status === 'Pending Approval') {
      const approvalResult = await client.query('INSERT INTO approvals (quotation_id, requires_manager, requires_finance, current_stage) VALUES ($1, $2, $3, $4) RETURNING id', [updated.id, risk.requiresManager, risk.requiresFinance, risk.requiresManager ? 'Sales Manager' : 'Finance']);
      await client.query('INSERT INTO approval_audit_log (approval_id, user_id, action, note) VALUES ($1, $2, $3, $4)', [approvalResult.rows[0].id, req.user.id, 'Submitted', 'Initial submission for approval']);
    } else if (status === 'Approved') {
      await client.query("INSERT INTO fulfillment_orders (quotation_id, status) VALUES ($1, 'Split Pending')", [updated.id]);
      await generateBillingForQuotation(client, updated.id);
    }
    await client.query('COMMIT');
    return res.json({ quotation: updated, risk });
  } catch (error) { await client.query('ROLLBACK'); return next(error); }
  finally { client.release(); }
});

export default router;