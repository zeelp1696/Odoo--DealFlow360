import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/admin', requireAuth, requireRoles('admin'), (_req, res) => res.json({ title: 'Admin control room', actions: ['Products', 'Discount rules', 'Approval chains', 'Warehouses'] }));
router.get('/sales', requireAuth, requireRoles('sales_rep', 'sales_manager'), (_req, res) => res.json({ title: 'Sales workspace', actions: ['New quotation', 'Pipeline', 'Approvals', 'Deal health'] }));
router.get('/operations', requireAuth, requireRoles('finance', 'sales_manager'), (_req, res) => res.json({ title: 'Operations workspace', actions: ['Approval queue', 'Fulfillment', 'Invoices', 'Payments'] }));
router.get('/customer', requireAuth, requireRoles('customer'), (_req, res) => res.json({ title: 'Customer portal', actions: ['My quotations', 'Negotiation', 'Confirm terms'] }));
export default router;