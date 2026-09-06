import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(requireAuth, requireRoles('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    return res.json({ users: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, email, role, password, tier } = req.body;
    
    // Check if email exists
    const check = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password || 'DealFlow360!24', 10);

    let customerId = null;
    if (role === 'customer') {
      const custRes = await query(`INSERT INTO customers (name, tier, currency) VALUES ($1, $2, 'USD') RETURNING id`, [name + ' Company', tier || 'Silver']);
      customerId = custRes.rows[0].id;
    }

    const result = await query(`
      INSERT INTO users (name, email, role, password_hash, customer_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, created_at
    `, [name, email, role, hashedPassword, customerId]);

    return res.status(201).json({ user: result.rows[0], message: 'Role assigned successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unexpected server error.' });
  }
});

export default router;
