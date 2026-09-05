import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const publicUser = row => ({ id: row.id, name: row.name, email: row.email, role: row.role, customerId: row.customer_id, salesTeamId: row.sales_team_id });

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const result = await query('SELECT * FROM users WHERE lower(email) = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
    const safeUser = publicUser(user);
    return res.json({ token: jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: '8h' }), user: safeUser });
  } catch (error) { return next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, role, customer_id, sales_team_id FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(401).json({ message: 'User no longer exists.' });
    return res.json({ user: publicUser(result.rows[0]) });
  } catch (error) { return next(error); }
});

export default router;