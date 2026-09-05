import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const internalRoles = ['admin', 'sales_rep', 'sales_manager', 'finance'];

router.get('/products', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.category, p.base_price, p.unit, p.tax_percent,
             p.margin_percent, p.description,
             COALESCE(json_agg(json_build_object(
               'id', v.id, 'attributeName', v.attribute_name,
               'attributeValue', v.attribute_value, 'extraPrice', v.extra_price
             )) FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      GROUP BY p.id
      ORDER BY p.category, p.name
    `);
    return res.json({ products: result.rows });
  } catch (error) { return next(error); }
});

router.get('/customers', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query('SELECT id, name, tier, currency FROM customers ORDER BY name');
    return res.json({ customers: result.rows });
  } catch (error) { return next(error); }
});

router.get('/price-lists', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT pl.id, pl.name, pl.tier, pl.currency,
             COALESCE(json_agg(json_build_object(
               'productId', pli.product_id, 'price', pli.price
             )) FILTER (WHERE pli.id IS NOT NULL), '[]') AS items
      FROM price_lists pl
      LEFT JOIN price_list_items pli ON pli.price_list_id = pl.id
      GROUP BY pl.id
      ORDER BY pl.tier, pl.name
    `);
    return res.json({ priceLists: result.rows });
  } catch (error) { return next(error); }
});

router.post('/products', requireRoles('admin'), async (req, res, next) => {
  try {
    const { name, category, basePrice, unit = 'unit', taxPercent = 0, marginPercent = 20, description = '' } = req.body;
    if (!name || !['Hardware', 'Services', 'Subscriptions'].includes(category) || Number(basePrice) < 0) {
      return res.status(400).json({ message: 'Name, valid category, and non-negative base price are required.' });
    }
    const result = await query(`
      INSERT INTO products (name, category, base_price, unit, tax_percent, margin_percent, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, category, base_price, unit, tax_percent, margin_percent, description
    `, [name.trim(), category, basePrice, unit, taxPercent, marginPercent, description]);
    return res.status(201).json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;