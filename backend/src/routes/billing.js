import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/invoices', requireRoles('admin', 'finance', 'sales_manager'), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT i.*, q.code as quotation_code, c.name as customer_name
      FROM invoices i
      JOIN quotations q ON i.quotation_id = q.id
      JOIN customers c ON q.customer_id = c.id
      ORDER BY i.created_at DESC
    `);
    return res.json({ invoices: result.rows });
  } catch (error) { return next(error); }
});

router.get('/subscriptions', requireRoles('admin', 'finance', 'sales_manager'), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT s.*, c.name as customer_name, p.name as plan_name, sp.cycle
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      JOIN products p ON sp.product_id = p.id
      ORDER BY s.created_at DESC
    `);
    return res.json({ subscriptions: result.rows });
  } catch (error) { return next(error); }
});

/**
 * Core Hybrid Billing Algorithm
 * Given an approved quotation, it splits the lines into one-time hardware/services
 * and recurring subscriptions, generating the respective invoices and subscription records.
 */
export async function generateBillingForQuotation(client, quotationId) {
  const qRes = await client.query('SELECT * FROM quotations WHERE id = $1', [quotationId]);
  const quotation = qRes.rows[0];
  if (!quotation) return;

  const linesRes = await client.query('SELECT * FROM quotation_lines WHERE quotation_id = $1', [quotationId]);
  const lines = linesRes.rows;

  let oneTimeTotal = 0;
  const subscriptions = [];

  for (const line of lines) {
    const prodRes = await client.query('SELECT category FROM products WHERE id = $1', [line.product_id]);
    const product = prodRes.rows[0];
    
    const lineTotal = Number(line.unit_price) * Number(line.quantity) * (1 - Number(line.discount_percent) / 100);

    if (product.category === 'Subscriptions') {
      // Find the subscription plan
      const planRes = await client.query('SELECT * FROM subscription_plans WHERE product_id = $1', [line.product_id]);
      const plan = planRes.rows[0];
      if (plan) {
        subscriptions.push({
          plan_id: plan.id,
          quantity: line.quantity,
          amount: lineTotal
        });
      }
    } else {
      // One-time charge (Hardware / Services)
      oneTimeTotal += lineTotal;
    }
  }

  // 1. Generate One-Time Invoice (if any non-subscription products exist)
  if (oneTimeTotal > 0) {
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const due = new Date();
    due.setDate(due.getDate() + 30); // Net 30
    
    await client.query(
      'INSERT INTO invoices (invoice_number, quotation_id, amount, is_recurring, due_date) VALUES ($1, $2, $3, false, $4)',
      [invNum, quotationId, oneTimeTotal, due]
    );
  }

  // 2. Generate Subscriptions & their initial invoices
  for (const sub of subscriptions) {
    const nextBill = new Date();
    nextBill.setMonth(nextBill.getMonth() + 1); // Mock 1 month advance
    
    const subRes = await client.query(
      'INSERT INTO subscriptions (quotation_id, customer_id, plan_id, quantity, next_bill_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [quotationId, quotation.customer_id, sub.plan_id, sub.quantity, nextBill]
    );
    const subId = subRes.rows[0].id;

    // Generate the first recurring invoice for this subscription
    const recInvNum = `REC-${Date.now().toString().slice(-6)}-${subId}`;
    const recDue = new Date();
    await client.query(
      'INSERT INTO invoices (invoice_number, quotation_id, subscription_id, amount, is_recurring, due_date) VALUES ($1, $2, $3, $4, true, $5)',
      [recInvNum, quotationId, subId, sub.amount, recDue]
    );
  }
}

export default router;
