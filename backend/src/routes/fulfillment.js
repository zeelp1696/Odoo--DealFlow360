import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Get all pending fulfillment orders (Upstream)
router.get('/pending', requireRoles('admin', 'finance'), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        fo.id, fo.status,
        q.code as quotation_code,
        c.name as customer_name,
        json_agg(
          json_build_object(
            'line_id', ql.id,
            'product_id', p.id,
            'product_name', p.name,
            'quantity', ql.quantity
          )
        ) as lines
      FROM fulfillment_orders fo
      JOIN quotations q ON fo.quotation_id = q.id
      JOIN customers c ON q.customer_id = c.id
      JOIN quotation_lines ql ON ql.quotation_id = q.id
      JOIN products p ON ql.product_id = p.id
      WHERE fo.status IN ('Split Pending', 'Backorder')
      GROUP BY fo.id, q.code, c.name
    `);
    return res.json({ orders: result.rows });
  } catch (error) { return next(error); }
});

// Run split algorithm for an order (Upstream)
router.post('/:id/split', requireRoles('admin', 'finance'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Begin conceptual transaction
    
    // 1. Get the order lines
    const linesRes = await query(`
      SELECT ql.product_id, ql.quantity 
      FROM fulfillment_orders fo
      JOIN quotation_lines ql ON ql.quotation_id = fo.quotation_id
      WHERE fo.id = $1
    `, [id]);
    
    if (linesRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order or lines not found' });
    }
    
    // 2. Get warehouses and stock
    const warehousesRes = await query('SELECT id, name FROM warehouses ORDER BY id ASC');
    const warehouses = warehousesRes.rows;
    
    if (warehouses.length === 0) {
       return res.status(400).json({ message: 'No warehouses configured.' });
    }

    const splits = [];
    let hasBackorder = false;

    // 3. Split logic
    for (const line of linesRes.rows) {
      let remainingQty = line.quantity;
      
      for (const wh of warehouses) {
        if (remainingQty <= 0) break;
        
        // Get stock for this product in this warehouse
        const stockRes = await query(
          'SELECT in_stock, reserved FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2',
          [wh.id, line.product_id]
        );
        
        const stock = stockRes.rows[0];
        const available = stock ? (stock.in_stock - stock.reserved) : 0;
        
        if (available > 0) {
          const allocate = Math.min(available, remainingQty);
          remainingQty -= allocate;
          
          splits.push({
            warehouse_id: wh.id,
            warehouse_name: wh.name,
            product_id: line.product_id,
            qty_fulfilled: allocate,
            backorder_qty: 0
          });
          
          // Update reserved stock
          await query(
            'UPDATE warehouse_stock SET reserved = reserved + $1 WHERE warehouse_id = $2 AND product_id = $3',
            [allocate, wh.id, line.product_id]
          );
        }
      }
      
      if (remainingQty > 0) {
        hasBackorder = true;
        // The remaining is a backorder
        splits.push({
          warehouse_id: warehouses[0].id,
          warehouse_name: warehouses[0].name,
          product_id: line.product_id,
          qty_fulfilled: 0,
          backorder_qty: remainingQty
        });
      }
    }
    
    // 4. Save splits
    for (const split of splits) {
      await query(
        'INSERT INTO fulfillment_splits (fulfillment_order_id, warehouse_id, product_id, qty_fulfilled, backorder_qty) VALUES ($1, $2, $3, $4, $5)',
        [id, split.warehouse_id, split.product_id, split.qty_fulfilled, split.backorder_qty]
      );
    }
    
    // 5. Update order status
    const newStatus = hasBackorder ? 'Backorder' : 'Fulfilled';
    await query('UPDATE fulfillment_orders SET status = $1 WHERE id = $2', [newStatus, id]);
    
    return res.json({ message: 'Split generated successfully', status: newStatus, splits });
    
  } catch (error) { return next(error); }
});

// Local GET /
router.get('/', requireRoles('admin', 'finance'), async (req, res, next) => {
  try {
    // 1. Fetch Stock
    const stockResult = await query(`
      SELECT ws.id, w.name as warehouse_name, p.name as product_name, 
             ws.in_stock, ws.reserved, (ws.in_stock - ws.reserved) as available
      FROM warehouse_stock ws
      JOIN warehouses w ON w.id = ws.warehouse_id
      JOIN products p ON p.id = ws.product_id
      ORDER BY w.name, p.name
    `);

    // 2. Fetch Orders Awaiting Fulfillment
    // We group by fulfillment order to aggregate warehouses
    const ordersResult = await query(`
      SELECT fo.id, fo.status, q.code as quotation_code, c.name as customer_name,
             STRING_AGG(DISTINCT w.name, ' + ') as warehouses
      FROM fulfillment_orders fo
      JOIN quotations q ON q.id = fo.quotation_id
      JOIN customers c ON c.id = q.customer_id
      LEFT JOIN fulfillment_splits fs ON fs.fulfillment_order_id = fo.id
      LEFT JOIN warehouses w ON w.id = fs.warehouse_id
      WHERE fo.status != 'Fulfilled'
      GROUP BY fo.id, fo.status, q.code, c.name
      ORDER BY fo.id DESC
    `);

    return res.json({
      stock: stockResult.rows,
      orders: ordersResult.rows
    });
  } catch (error) { return next(error); }
});

router.get('/:id', requireRoles('admin', 'finance'), async (req, res, next) => {
  try {
    const orderResult = await query(`
      SELECT fo.*, q.code as quotation_code, c.name as customer_name
      FROM fulfillment_orders fo
      JOIN quotations q ON q.id = fo.quotation_id
      JOIN customers c ON c.id = q.customer_id
      WHERE fo.id = $1
    `, [req.params.id]);

    if (!orderResult.rows.length) return res.status(404).json({ message: 'Fulfillment order not found' });
    const order = orderResult.rows[0];

    const splitsResult = await query(`
      SELECT fs.*, w.name as warehouse_name
      FROM fulfillment_splits fs
      JOIN warehouses w ON w.id = fs.warehouse_id
      WHERE fs.fulfillment_order_id = $1
      ORDER BY w.name
    `, [req.params.id]);

    return res.json({
      order,
      splits: splitsResult.rows
    });
  } catch (error) { return next(error); }
});

router.patch('/:id', requireRoles('admin', 'finance'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { action, manualSplits } = req.body;
    await client.query('BEGIN');
    
    const order = (await client.query('SELECT * FROM fulfillment_orders WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!order) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Order not found' }); }

    if (action === 'accept_suggested' || action === 'manual_override') {
      let isManual = action === 'manual_override';
      
      if (isManual && manualSplits && Array.isArray(manualSplits)) {
        for (const split of manualSplits) {
          await client.query(
            'UPDATE fulfillment_splits SET qty_fulfilled = $1, is_manual_override = true WHERE id = $2 AND fulfillment_order_id = $3',
            [split.qty, split.id, req.params.id]
          );
        }
      } else {
        await client.query(
          'UPDATE fulfillment_splits SET is_manual_override = false WHERE fulfillment_order_id = $1',
          [req.params.id]
        );
      }

      await client.query('UPDATE fulfillment_orders SET status = $1 WHERE id = $2', ['Processing', req.params.id]);
    }
    
    await client.query('COMMIT');
    return res.json({ message: 'Fulfillment updated successfully' });
  } catch (error) { 
    await client.query('ROLLBACK'); 
    return next(error); 
  } finally { 
    client.release(); 
  }
});

export default router;
