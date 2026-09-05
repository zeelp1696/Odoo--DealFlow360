import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();

async function getDashboardStats() {
  try {
    const [pending, open, atRisk, recent] = await Promise.all([
      query("SELECT COUNT(*) FROM approvals WHERE status = 'Pending'"),
      query("SELECT COUNT(*) FROM quotations WHERE status NOT IN ('Accepted', 'Rejected')"),
      query("SELECT COUNT(DISTINCT quotation_id) FROM quotation_lines WHERE over_limit_points > 0 AND quotation_id IN (SELECT id FROM quotations WHERE status NOT IN ('Accepted', 'Rejected'))"),
      query("SELECT 'Quotation ' || code || ' updated to ' || status AS action, last_activity_at AS timestamp FROM quotations ORDER BY last_activity_at DESC NULLS LAST, created_at DESC LIMIT 3")
    ]);

    return {
      pendingApprovals: parseInt(pending.rows[0].count, 10) || 0,
      openQuotations: parseInt(open.rows[0].count, 10) || 0,
      atRiskDeals: parseInt(atRisk.rows[0].count, 10) || 0,
      recentActivity: recent.rows
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { pendingApprovals: 0, openQuotations: 0, atRiskDeals: 0, recentActivity: [] };
  }
}

router.get('/admin', requireAuth, requireRoles('admin'), async (_req, res) => {
  const stats = await getDashboardStats();
  res.json({ title: 'Admin control room', actions: ['Products', 'Discount rules', 'Approval chains', 'Warehouses'], stats });
});

router.get('/sales', requireAuth, requireRoles('sales_rep', 'sales_manager'), async (_req, res) => {
  const stats = await getDashboardStats();
  res.json({ title: 'Sales workspace', actions: ['New quotation', 'Pipeline', 'Approvals', 'Deal health'], stats });
});

router.get('/operations', requireAuth, requireRoles('finance', 'sales_manager'), async (_req, res) => {
  const stats = await getDashboardStats();
  res.json({ title: 'Operations workspace', actions: ['Approval queue', 'Fulfillment', 'Invoices', 'Payments'], stats });
});

router.get('/customer', requireAuth, requireRoles('customer'), (_req, res) => {
  res.json({ title: 'Customer portal', actions: ['My quotations', 'Negotiation', 'Confirm terms'] });
});

export default router;