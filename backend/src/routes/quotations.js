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
  if (user.role === 'customer') { params.push(user.customerId); scope = 'AND q.customer_id = $2'; }
  return (await query(`SELECT q.*, c.name AS customer_name FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE q.id = $1 ${scope}`, params)).rows[0];
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let scope = '';
    if (req.user.role === 'sales_rep') { params.push(req.user.id); scope = 'WHERE q.rep_id = $1'; }
    if (req.user.role === 'customer') { params.push(req.user.customerId); scope = 'WHERE q.customer_id = $1'; }
    const result = await query(`SELECT q.id, q.code, q.status, q.blended_risk_score, q.risk_label, q.created_at, c.name AS customer_name FROM quotations q JOIN customers c ON c.id = q.customer_id ${scope} ORDER BY q.created_at DESC`, params);
    return res.json({ quotations: result.rows });
  } catch (error) { return next(error); }
});

router.post('/', requireRoles('sales_rep'), async (req, res, next) => {
  try {
    const { customerId, priceListId = null } = req.body;
    const customer = (await query('SELECT id FROM customers WHERE id = $1', [customerId])).rows[0];
    if (!customer) return res.status(400).json({ message: 'Select a valid customer.' });
    const code = `Q-${Date.now().toString().slice(-7)}`;
    const result = await query('INSERT INTO quotations (code, customer_id, rep_id, price_list_id) VALUES ($1, $2, $3, $4) RETURNING *', [code, customerId, req.user.id, priceListId]);
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

router.post('/:id/lines', requireRoles('sales_rep'), async (req, res, next) => {
  try {
    const quotation = await loadQuotation(req.params.id, req.user);
    if (!quotation || quotation.status !== 'Draft') return res.status(404).json({ message: 'Editable draft quotation not found.' });
    const { productId, quantity = 1, discountPercent = 0 } = req.body;
    const product = (await query('SELECT p.*, c.tier FROM products p JOIN customers c ON c.id = $2 WHERE p.id = $1', [productId, quotation.customer_id])).rows[0];
    if (!product || Number(quantity) < 1 || Number(discountPercent) < 0 || Number(discountPercent) > 100) return res.status(400).json({ message: 'Select a valid product, quantity, and discount.' });
    const ceiling = (await query('SELECT max_discount_percent FROM discount_tier_ceilings WHERE tier = $1 AND category = $2', [product.tier, product.category])).rows[0];
    const allowedLimit = Number(ceiling?.max_discount_percent || 0);
    const line = (await query(`INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, discount_percent, allowed_limit_percent, over_limit_points, line_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [req.params.id, productId, quantity, product.base_price, discountPercent, allowedLimit, Math.max(0, discountPercent - allowedLimit), Number(discountPercent) > allowedLimit ? 'OVER' : 'OK'])).rows[0];
    await query('UPDATE quotations SET last_activity_at = now() WHERE id = $1', [req.params.id]);
    return res.status(201).json({ line });
  } catch (error) { return next(error); }
});

router.post('/:id/submit', requireRoles('sales_rep'), async (req, res, next) => {
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
      await client.query('INSERT INTO approvals (quotation_id, requires_manager, requires_finance, current_stage) VALUES ($1, $2, $3, $4)', [updated.id, risk.requiresManager, risk.requiresFinance, risk.requiresManager ? 'Sales Manager' : 'Finance']);
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