import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const internalRoles = ['admin', 'sales_rep', 'sales_manager', 'finance'];

// GET /api/invoices — list all invoices with customer info
router.get('/', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT i.id, i.invoice_number, i.amount, i.status, i.due_date, i.is_recurring, i.created_at,
             COALESCE(c.name, cs.customer_name) as customer_name,
             q.code as quotation_code,
             sp.name as subscription_plan_name
      FROM invoices i
      LEFT JOIN quotations q ON q.id = i.quotation_id
      LEFT JOIN customers c ON c.id = q.customer_id
      LEFT JOIN subscriptions sub ON sub.id = i.subscription_id
      LEFT JOIN subscription_plans sp ON sp.id = sub.plan_id
      LEFT JOIN (
        SELECT s.id, cu.name as customer_name FROM subscriptions s JOIN customers cu ON cu.id = s.customer_id
      ) cs ON cs.id = i.subscription_id
      ORDER BY i.created_at DESC
    `);

    const rows = result.rows;
    const counts = {
      unpaid: rows.filter(r => r.status === 'Unpaid').length,
      paid: rows.filter(r => r.status === 'Paid').length,
    };

    return res.json({ invoices: rows, counts });
  } catch (error) { return next(error); }
});

// GET /api/invoices/:id — full invoice detail with payments and related invoices
router.get('/:id', requireRoles(...internalRoles), async (req, res, next) => {
  try {
    const invResult = await query(`
      SELECT i.id, i.invoice_number, i.amount, i.status, i.due_date, i.is_recurring, i.created_at,
             i.quotation_id, i.subscription_id,
             COALESCE(c.name, cs.customer_name) as customer_name,
             q.code as quotation_code, q.status as quotation_status,
             sp.name as subscription_plan_name
      FROM invoices i
      LEFT JOIN quotations q ON q.id = i.quotation_id
      LEFT JOIN customers c ON c.id = q.customer_id
      LEFT JOIN subscriptions sub ON sub.id = i.subscription_id
      LEFT JOIN subscription_plans sp ON sp.id = sub.plan_id
      LEFT JOIN (
        SELECT s.id, cu.name as customer_name FROM subscriptions s JOIN customers cu ON cu.id = s.customer_id
      ) cs ON cs.id = i.subscription_id
      WHERE i.id = $1
    `, [req.params.id]);

    if (!invResult.rows.length) return res.status(404).json({ message: 'Invoice not found.' });
    const invoice = invResult.rows[0];

    // Payments for this invoice
    const paymentsResult = await query(`
      SELECT id, amount, paid_at FROM payments WHERE invoice_id = $1 ORDER BY paid_at ASC
    `, [req.params.id]);

    // Related invoices — same customer (all their invoices)
    let relatedInvoices = [];
    if (invoice.quotation_id) {
      const relResult = await query(`
        SELECT i2.id, i2.invoice_number, i2.amount, i2.status, i2.due_date, i2.is_recurring
        FROM invoices i2
        JOIN quotations q2 ON q2.id = i2.quotation_id
        WHERE q2.customer_id = (SELECT customer_id FROM quotations WHERE id = $1)
        ORDER BY i2.created_at DESC
        LIMIT 10
      `, [invoice.quotation_id]);
      relatedInvoices = relResult.rows;
    } else if (invoice.subscription_id) {
      const relResult = await query(`
        SELECT i2.id, i2.invoice_number, i2.amount, i2.status, i2.due_date, i2.is_recurring
        FROM invoices i2
        WHERE i2.subscription_id IN (
          SELECT id FROM subscriptions WHERE customer_id = (SELECT customer_id FROM subscriptions WHERE id = $1)
        )
        ORDER BY i2.created_at DESC
        LIMIT 10
      `, [invoice.subscription_id]);
      relatedInvoices = relResult.rows;
    }

    // Credit notes for the subscription if any
    let creditNotes = [];
    if (invoice.subscription_id) {
      const cnResult = await query(`
        SELECT id, amount, reason, created_at FROM credit_notes WHERE subscription_id = $1 ORDER BY created_at DESC
      `, [invoice.subscription_id]);
      creditNotes = cnResult.rows;
    }

    // Derive pipeline stage from quotation status
    const pipelineStage = (() => {
      const qs = invoice.quotation_status;
      if (!qs) return invoice.status === 'Paid' ? 'paid' : 'invoiced';
      if (qs === 'Confirmed') return invoice.status === 'Paid' ? 'paid' : 'invoiced';
      if (qs === 'Approved') return 'shipped';
      return 'confirmed';
    })();

    return res.json({ invoice, payments: paymentsResult.rows, related_invoices: relatedInvoices, credit_notes: creditNotes, pipeline_stage: pipelineStage });
  } catch (error) { return next(error); }
});

// POST /api/invoices/:id/record-payment — mark invoice as paid
router.post('/:id/record-payment', requireRoles('admin', 'finance'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Valid amount is required.' });

    await client.query('BEGIN');

    const inv = (await client.query('SELECT * FROM invoices WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!inv) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Invoice not found.' }); }

    await client.query('INSERT INTO payments (invoice_id, amount, paid_at) VALUES ($1, $2, now())', [req.params.id, amount]);
    await client.query('UPDATE invoices SET status = $1 WHERE id = $2', ['Paid', req.params.id]);

    await client.query('COMMIT');
    return res.json({ message: 'Payment recorded successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

// GET /api/invoices/:id/download — download invoice as CSV summary
router.get('/:id/download', requireRoles(...internalRoles), async (req, res, next) => {
  try {
    const inv = (await query(`
      SELECT i.*, COALESCE(c.name, cs.customer_name) as customer_name, q.code as quotation_code
      FROM invoices i
      LEFT JOIN quotations q ON q.id = i.quotation_id
      LEFT JOIN customers c ON c.id = q.customer_id
      LEFT JOIN (SELECT s.id, cu.name as customer_name FROM subscriptions s JOIN customers cu ON cu.id = s.customer_id) cs ON cs.id = i.subscription_id
      WHERE i.id = $1
    `, [req.params.id])).rows[0];

    if (!inv) return res.status(404).json({ message: 'Invoice not found.' });

    const payments = (await query('SELECT amount, paid_at FROM payments WHERE invoice_id = $1', [req.params.id])).rows;

    const lines = [
      ['Field', 'Value'],
      ['Invoice #', inv.invoice_number],
      ['Customer', inv.customer_name || 'N/A'],
      ['Quotation', inv.quotation_code || 'N/A'],
      ['Amount', `$${Number(inv.amount).toFixed(2)}`],
      ['Status', inv.status],
      ['Due Date', inv.due_date || 'N/A'],
      ['Type', inv.is_recurring ? 'Recurring' : 'One-time'],
      ['Created', new Date(inv.created_at).toLocaleDateString()],
      [],
      ['Payments Received'],
      ...payments.map(p => ['Payment', `$${Number(p.amount).toFixed(2)} on ${new Date(p.paid_at).toLocaleDateString()}`]),
    ];

    const csv = lines.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoice_number}-summary.csv"`);
    return res.send(csv);
  } catch (error) { return next(error); }
});

export default router;
