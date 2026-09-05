import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const permissions = {
  inventory: ['admin', 'sales_manager', 'finance'], fulfillment: ['sales_rep', 'sales_manager', 'finance'],
  subscriptions: ['admin', 'sales_manager', 'finance'], billing: ['sales_rep', 'sales_manager', 'finance', 'customer'],
  negotiation: ['sales_rep', 'sales_manager', 'finance', 'customer'], 'deal-health': ['admin', 'sales_manager', 'finance'],
  reports: ['admin', 'sales_rep', 'sales_manager', 'finance'], upsell: ['admin', 'sales_rep', 'sales_manager'],
  administration: ['admin'], orders: ['customer'], support: ['customer', 'sales_rep', 'sales_manager', 'finance'],
};

const queries = {
  inventory: async () => ({ title: 'Warehouse & stock', rows: (await query(`SELECT w.name AS warehouse, p.name AS product, s.in_stock, s.reserved, s.in_stock - s.reserved AS available FROM warehouse_stock s JOIN warehouses w ON w.id = s.warehouse_id JOIN products p ON p.id = s.product_id ORDER BY w.name, p.name`)).rows }),
  fulfillment: async () => ({ title: 'Fulfillment operations', rows: (await query(`SELECT fo.id, fo.status, q.code, c.name AS customer FROM fulfillment_orders fo JOIN quotations q ON q.id = fo.quotation_id JOIN customers c ON c.id = q.customer_id ORDER BY fo.id DESC`)).rows }),
  subscriptions: async () => ({ title: 'Subscription plans', rows: (await query(`SELECT sp.name, p.name AS product, sp.cycle, sp.price FROM subscription_plans sp JOIN products p ON p.id = sp.product_id ORDER BY sp.name`)).rows }),
  billing: async req => ({ title: 'Invoices & payments', rows: (await query(`SELECT i.invoice_number, i.amount, i.status, i.is_recurring FROM invoices i JOIN quotations q ON q.id = i.quotation_id ${req.user.role === 'customer' ? 'WHERE q.customer_id = $1' : ''} ORDER BY i.created_at DESC`, req.user.role === 'customer' ? [req.user.customerId] : [])).rows }),
  'deal-health': async () => ({ title: 'Deal health & alerts', rows: (await query(`SELECT q.code, c.name AS customer, q.status, q.risk_label, q.last_activity_at FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE q.status IN ('Draft', 'Pending Approval', 'Negotiation') ORDER BY q.last_activity_at ASC`)).rows }),
  reports: async () => ({ title: 'Reports & analytics', rows: (await query(`SELECT status, count(*)::int AS quotations, coalesce(round(avg(blended_risk_score), 2), 0) AS average_risk FROM quotations GROUP BY status ORDER BY status`)).rows }),
  upsell: async () => ({ title: 'Upsell recommendations', rows: (await query(`SELECT base.name AS base_product, suggested.name AS recommendation, u.co_purchase_score, u.is_promoted, u.promo_label FROM upsell_rules u JOIN products base ON base.id = u.base_product_id JOIN products suggested ON suggested.id = u.suggested_product_id ORDER BY u.is_promoted DESC, u.co_purchase_score DESC`)).rows }),
  negotiation: async req => ({ title: 'Customer negotiation', rows: (await query(`SELECT nm.comment, nm.sender_role, nm.counter_discount_percent, q.code FROM negotiation_messages nm JOIN quotations q ON q.id = nm.quotation_id ${req.user.role === 'customer' ? 'WHERE q.customer_id = $1' : ''} ORDER BY nm.created_at DESC`, req.user.role === 'customer' ? [req.user.customerId] : [])).rows }),
  administration: async () => ({ title: 'Users & roles', rows: (await query('SELECT name, email, role FROM users ORDER BY role, name')).rows }),
  orders: async req => ({ title: 'My orders', rows: (await query(`SELECT code, status, created_at FROM quotations WHERE customer_id = $1 AND status = 'Confirmed' ORDER BY created_at DESC`, [req.user.customerId])).rows }),
  support: async req => ({ title: 'Questions & requests', rows: (await query(`SELECT q.code, nm.sender_role, nm.comment, nm.created_at FROM negotiation_messages nm JOIN quotations q ON q.id = nm.quotation_id ${req.user.role === 'customer' ? 'WHERE q.customer_id = $1' : ''} ORDER BY nm.created_at DESC`, req.user.role === 'customer' ? [req.user.customerId] : [])).rows }),
};

router.get('/:module', (req, res, next) => {
  const allowed = permissions[req.params.module];
  if (!allowed) return res.status(404).json({ message: 'Module not found.' });
  return requireRoles(...allowed)(req, res, async () => { try { return res.json(await queries[req.params.module](req)); } catch (error) { return next(error); } });
});

export default router;