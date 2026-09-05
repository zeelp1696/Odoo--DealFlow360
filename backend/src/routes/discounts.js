import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
const internalRoles = ['admin', 'sales_rep', 'sales_manager', 'finance'];
router.use(requireAuth);

router.get('/ceilings', requireRoles(...internalRoles), async (_req, res, next) => {
  try { return res.json({ ceilings: (await query('SELECT id, tier, category, max_discount_percent FROM discount_tier_ceilings ORDER BY tier, category')).rows }); }
  catch (error) { return next(error); }
});

router.get('/approval-rules', requireRoles(...internalRoles), async (_req, res, next) => {
  try { return res.json({ rules: (await query('SELECT id, min_over_limit_points, max_over_limit_points, requires_manager, requires_finance, risk_label FROM approval_chain_rules ORDER BY min_over_limit_points')).rows }); }
  catch (error) { return next(error); }
});

router.post('/ceilings', requireRoles('admin', 'sales_manager'), async (req, res, next) => {
  try {
    const { tier, category, maxDiscountPercent, reason = 'Configured discount ceiling' } = req.body;
    if (!['Bronze', 'Silver', 'Gold'].includes(tier) || !['Hardware', 'Services', 'Subscriptions'].includes(category) || Number(maxDiscountPercent) < 0) return res.status(400).json({ message: 'Valid tier, category, and non-negative ceiling are required.' });
    const result = await query('INSERT INTO discount_tier_ceilings (tier, category, max_discount_percent) VALUES ($1, $2, $3) RETURNING *', [tier, category, maxDiscountPercent]);
    await query('INSERT INTO edit_audit_log (entity_type, entity_id, user_id, action, after_value, reason) VALUES ($1, $2, $3, $4, $5, $6)', ['discount_tier_ceiling', result.rows[0].id, req.user.id, 'Created', JSON.stringify(result.rows[0]), reason]);
    return res.status(201).json({ ceiling: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/approval-rules', requireRoles('admin', 'sales_manager'), async (req, res, next) => {
  try {
    const { minOverLimitPoints, maxOverLimitPoints = null, requiresManager = true, requiresFinance = false, riskLabel, reason = 'Configured approval rule' } = req.body;
    if (Number(minOverLimitPoints) < 0 || !riskLabel) return res.status(400).json({ message: 'Minimum risk points and risk label are required.' });
    const result = await query('INSERT INTO approval_chain_rules (min_over_limit_points, max_over_limit_points, requires_manager, requires_finance, risk_label) VALUES ($1, $2, $3, $4, $5) RETURNING *', [minOverLimitPoints, maxOverLimitPoints, requiresManager, requiresFinance, riskLabel]);
    await query('INSERT INTO edit_audit_log (entity_type, entity_id, user_id, action, after_value, reason) VALUES ($1, $2, $3, $4, $5, $6)', ['approval_chain_rule', result.rows[0].id, req.user.id, 'Created', JSON.stringify(result.rows[0]), reason]);
    return res.status(201).json({ rule: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;