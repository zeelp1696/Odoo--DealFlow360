import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('customer'));

router.patch('/profile', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    if (name.length > 120) return res.status(400).json({ message: 'Name must be 120 characters or fewer.' });
    const result = await query('UPDATE users SET name = $1 WHERE id = $2 AND role = \'customer\' RETURNING id, name, email, role, customer_id', [name, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Customer profile not found.' });
    return res.json({ user: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/quotes', async (req, res, next) => {
  try {
    const quotes = (await query(`SELECT q.id, q.code, q.status, q.created_at, q.customer_id, COALESCE(u.name, c.name) AS customer_name FROM quotations q LEFT JOIN users u ON u.id = q.user_id LEFT JOIN customers c ON c.id = q.customer_id WHERE q.user_id = $1 AND q.status NOT IN ('Draft', 'Pending Approval') ORDER BY q.created_at DESC`, [req.user.id])).rows;
    return res.json({ quotes });
  } catch (error) { return next(error); }
});

router.get('/quotes/:id', async (req, res, next) => {
  try {
    const quote = (await query(`SELECT q.id, q.code, q.status, q.customer_id, COALESCE(u.name, c.name) AS customer_name FROM quotations q LEFT JOIN users u ON u.id = q.user_id LEFT JOIN customers c ON c.id = q.customer_id WHERE q.user_id = $1 AND q.id = $2`, [req.user.id, req.params.id])).rows[0];
    if (!quote) return res.status(404).json({ message: 'Quotation not found.' });
    const lines = (await query(`SELECT ql.id, p.name, ql.quantity, ql.unit_price, ql.discount_percent, ql.allowed_limit_percent FROM quotation_lines ql JOIN products p ON p.id = ql.product_id WHERE ql.quotation_id = $1 ORDER BY ql.id`, [quote.id])).rows;
    const messages = (await query(`SELECT id, quotation_line_id, sender_role, comment, counter_discount_percent, requested_delivery_date, created_at FROM negotiation_messages WHERE quotation_id = $1 ORDER BY created_at ASC`, [quote.id])).rows;
    return res.json({ quote, lines, messages });
  } catch (error) { return next(error); }
});

router.post('/quotes/:id/messages', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ownsQuote = (await client.query(
      'SELECT id FROM quotations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )).rows[0];
    if (!ownsQuote) return res.status(404).json({ message: 'Quotation not found in your portal.' });

    const { quotationLineId = null, comment = '', counterDiscountPercent, requestedDeliveryDate } = req.body;
    if (!comment.trim() || counterDiscountPercent === undefined || counterDiscountPercent === null || counterDiscountPercent === '' || !requestedDeliveryDate) {
      return res.status(400).json({ message: 'Comment, counter discount, and requested delivery date are required.' });
    }
    if (Number(counterDiscountPercent) < 0 || Number(counterDiscountPercent) > 100) {
      return res.status(400).json({ message: 'Counter discount must be between 0 and 100.' });
    }

    await client.query('BEGIN');

    // Save the negotiation message
    const msgResult = await client.query(
      `INSERT INTO negotiation_messages (quotation_id, quotation_line_id, sender_role, comment, counter_discount_percent, requested_delivery_date)
       VALUES ($1, $2, 'customer', $3, $4, $5) RETURNING *`,
      [req.params.id, quotationLineId, comment.trim(), counterDiscountPercent, requestedDeliveryDate]
    );

    // Check if the counter-discount exceeds the allowed limit on the targeted line (or any line)
    const limitCheck = await client.query(`
      SELECT
        bool_or(nm.counter_discount_percent > ql.allowed_limit_percent) AS exceeds_limit
      FROM negotiation_messages nm
      LEFT JOIN quotation_lines ql ON ql.id = nm.quotation_line_id
      WHERE nm.quotation_id = $1
        AND nm.counter_discount_percent IS NOT NULL
        AND ql.allowed_limit_percent IS NOT NULL
    `, [req.params.id]);

    const exceedsLimit = limitCheck.rows[0]?.exceeds_limit === true;

    let newQuotationStatus = 'Negotiation';
    let reEnteredApproval = false;

    if (exceedsLimit) {
      // Re-enter approval flow — close any existing pending approval first
      await client.query(
        `UPDATE approvals SET status = 'Superseded' WHERE quotation_id = $1 AND status = 'Pending'`,
        [req.params.id]
      );

      // Create a fresh approval record
      const approvalResult = await client.query(
        `INSERT INTO approvals (quotation_id, requires_manager, requires_finance, current_stage, status)
         VALUES ($1, true, false, 'Sales Manager', 'Pending') RETURNING id`,
        [req.params.id]
      );

      // Log the re-entry in the audit trail
      await client.query(
        `INSERT INTO approval_audit_log (approval_id, user_id, action, note)
         VALUES ($1, $2, 'Re-submitted', 'Customer counter-offer exceeded discount limit — re-entered approval flow')`,
        [approvalResult.rows[0].id, req.user.id]
      );

      newQuotationStatus = 'Pending Approval';
      reEnteredApproval = true;
    }

    await client.query(
      `UPDATE quotations SET status = $1, last_activity_at = now() WHERE id = $2`,
      [newQuotationStatus, req.params.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: msgResult.rows[0],
      quotationStatus: newQuotationStatus,
      reEnteredApproval,
      ...(reEnteredApproval && {
        notice: 'Your counter-offer exceeds the allowed discount threshold. The quotation has been automatically re-submitted for approval.'
      })
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/quotes/:id/confirm', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quote = (await client.query(
      'SELECT id, status FROM quotations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]
    )).rows[0];
    if (!quote) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Quotation not found in your portal.' }); }

    // Confirm is only valid from Negotiation or Approved state
    if (!['Negotiation', 'Approved'].includes(quote.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot confirm a quotation in "${quote.status}" status.` });
    }

    // Final threshold check on all counter-offers
    const counter = (await client.query(`
      SELECT
        max(nm.counter_discount_percent) AS counter_discount,
        bool_or(nm.counter_discount_percent > ql.allowed_limit_percent) AS exceeds_limit
      FROM negotiation_messages nm
      LEFT JOIN quotation_lines ql ON ql.id = nm.quotation_line_id
      WHERE nm.quotation_id = $1
        AND nm.counter_discount_percent IS NOT NULL
        AND ql.allowed_limit_percent IS NOT NULL
    `, [quote.id])).rows[0];

    const needsApproval = counter.exceeds_limit === true;
    const nextStatus = needsApproval ? 'Pending Approval' : 'Confirmed';

    await client.query(
      'UPDATE quotations SET status = $1, last_activity_at = now() WHERE id = $2',
      [nextStatus, quote.id]
    );

    if (needsApproval) {
      // Supersede any previous pending approval
      await client.query(
        `UPDATE approvals SET status = 'Superseded' WHERE quotation_id = $1 AND status = 'Pending'`,
        [quote.id]
      );
      const approvalResult = await client.query(
        `INSERT INTO approvals (quotation_id, requires_manager, requires_finance, current_stage, status)
         VALUES ($1, true, false, 'Sales Manager', 'Pending') RETURNING id`,
        [quote.id]
      );
      await client.query(
        `INSERT INTO approval_audit_log (approval_id, user_id, action, note)
         VALUES ($1, $2, 'Re-submitted', 'Customer confirmed with terms exceeding discount threshold — approval required')`,
        [approvalResult.rows[0].id, req.user.id]
      );
    }

    await client.query('COMMIT');
    return res.json({
      status: nextStatus,
      requiresApproval: needsApproval,
      ...(needsApproval && {
        notice: 'Your confirmed terms exceed the allowed discount limit. The quotation has been re-submitted for manager approval.'
      })
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

export default router;