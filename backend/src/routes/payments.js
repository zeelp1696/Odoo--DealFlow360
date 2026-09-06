import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('finance', 'sales_manager', 'admin'));

router.post('/:invoiceId/pay', async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    
    // Validate the invoice
    const invRes = await query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    const invoice = invRes.rows[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    if (invoice.status === 'Paid') return res.status(400).json({ message: 'Invoice is already paid.' });

    // In a real app we would insert into a `payments` table, but the schema doesn't have one!
    // Wait, let's check if the schema has a `payments` table.
    // I can just update the invoice status for now since the problem statement says "Payment (build invoice payment endpoint and status transition)."
    
    const result = await query(
      'UPDATE invoices SET status = $1, paid_at = now() WHERE id = $2 RETURNING *',
      ['Paid', invoiceId]
    );

    return res.json({ message: 'Payment recorded successfully', invoice: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

export default router;
