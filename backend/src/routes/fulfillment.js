import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Get all pending fulfillment orders
router.get('/', requireRoles('admin', 'finance'), async (_req, res, next) => {
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

// Run split algorithm for an order
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

export default router;
