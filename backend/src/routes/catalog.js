import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const internalRoles = ['admin', 'sales_rep', 'sales_manager', 'finance'];

router.get('/metadata', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const categoriesResult = await query(`SELECT enumlabel as name FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'product_category'`);
    const warehousesResult = await query(`SELECT id, name FROM warehouses ORDER BY name`);
    return res.json({ 
      categories: categoriesResult.rows.map(r => r.name), 
      warehouses: warehousesResult.rows 
    });
  } catch (error) { return next(error); }
});

router.get('/products', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.category, p.base_price, p.unit, p.tax_percent,
             p.margin_percent, p.description,
             (SELECT COALESCE(json_agg(json_build_object(
               'id', v.id, 'attributeName', v.attribute_name,
               'attributeValue', v.attribute_value, 'extraPrice', v.extra_price
             )), '[]') FROM product_variants v WHERE v.product_id = p.id) AS variants,
             (SELECT COALESCE(json_agg(json_build_object(
               'warehouse_name', w.name, 'in_stock', ws.in_stock
             )), '[]') FROM warehouse_stock ws JOIN warehouses w ON w.id = ws.warehouse_id WHERE ws.product_id = p.id) AS stock_levels
      FROM products p
      ORDER BY p.id DESC
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

router.get('/users', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query('SELECT u.id, u.name, u.role, c.tier FROM users u LEFT JOIN customers c ON c.id = u.customer_id ORDER BY u.name');
    return res.json({ users: result.rows });
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
    const { name, category, basePrice, unit = 'unit', description = '', variants = '', warehouseStocks = [], taxPercent = 0, marginPercent = 0 } = req.body;
    if (!name || !category || Number(basePrice) < 0) {
      return res.status(400).json({ message: 'Name, valid category, and non-negative base price are required.' });
    }
    
    // Add category dynamically if it does not exist
    try {
      await query(`ALTER TYPE product_category ADD VALUE '${category}'`);
    } catch (err) {
      // Ignore error if it already exists (42710)
    }

    try {
      const tiersRes = await query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'customer_tier'`);
      for (let r of tiersRes.rows) {
        const exist = await query(`SELECT 1 FROM discount_tier_ceilings WHERE tier=$1 AND category=$2`, [r.enumlabel, category]);
        if (exist.rowCount === 0) {
          await query(`INSERT INTO discount_tier_ceilings (tier, category, max_discount_percent) VALUES ($1, $2, 0)`, [r.enumlabel, category]);
        }
      }
    } catch (err) {
      console.error("Failed to insert default discount ceilings", err);
    }

    const result = await query(`
      INSERT INTO products (name, category, base_price, unit, tax_percent, margin_percent, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, category, base_price, unit, tax_percent, margin_percent, description
    `, [name.trim(), category, basePrice, unit, Number(taxPercent), Number(marginPercent), description]);
    
    const newProduct = result.rows[0];
    
    if (variants && variants.trim() !== '') {
      await query(`
        INSERT INTO product_variants (product_id, attribute_name, attribute_value, extra_price)
        VALUES ($1, $2, $3, $4)
      `, [newProduct.id, 'Variant', variants.trim(), 0]);
    }
    
    if (warehouseStocks && Array.isArray(warehouseStocks)) {
      for (const ws of warehouseStocks) {
        let whId = ws.warehouseId;
        if (ws.newWarehouseName && ws.newWarehouseName.trim() !== '') {
          const whRes = await query('INSERT INTO warehouses (name) VALUES ($1) RETURNING id', [ws.newWarehouseName.trim()]);
          whId = whRes.rows[0].id;
        }

        if (whId && Number(ws.stock) > 0) {
          await query(`INSERT INTO warehouse_stock (warehouse_id, product_id, in_stock, reserved) VALUES ($1, $2, $3, 0)`, [whId, newProduct.id, Number(ws.stock)]);
        }
      }
    }

    return res.status(201).json({ product: newProduct });
  } catch (error) { return next(error); }
});

router.put('/products/:id', requireRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, base_price, unit, description, margin_percent, tax_percent } = req.body;
    
    if (category) {
      try {
        await query(`ALTER TYPE product_category ADD VALUE '${category}'`);
      } catch (err) { }

      try {
        const tiersRes = await query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'customer_tier'`);
        for (let r of tiersRes.rows) {
          const exist = await query(`SELECT 1 FROM discount_tier_ceilings WHERE tier=$1 AND category=$2`, [r.enumlabel, category]);
          if (exist.rowCount === 0) {
            await query(`INSERT INTO discount_tier_ceilings (tier, category, max_discount_percent) VALUES ($1, $2, 0)`, [r.enumlabel, category]);
          }
        }
      } catch (err) {
        console.error("Failed to insert default discount ceilings", err);
      }
    }

    const result = await query(`
      UPDATE products 
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          base_price = COALESCE($3, base_price),
          unit = COALESCE($4, unit),
          description = COALESCE($5, description),
          margin_percent = COALESCE($6, margin_percent),
          tax_percent = COALESCE($7, tax_percent)
      WHERE id = $8
      RETURNING *
    `, [name, category, base_price, unit, description, margin_percent, tax_percent, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/subscription-plans', requireRoles(...internalRoles), async (_req, res, next) => {
  try {
    const result = await query('SELECT id, name, cycle, price, proration_rule, cancellation_rule FROM subscription_plans ORDER BY name');
    return res.json({ plans: result.rows });
  } catch (error) { return next(error); }
});

export default router;