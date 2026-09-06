import 'dotenv/config';
import { query } from './src/db.js';

async function check() {
  const r1 = await query('SELECT count(*) as c FROM upsell_rules');
  const r2 = await query('SELECT id, name, category, base_price FROM products LIMIT 5');
  const r3 = await query('SELECT * FROM approval_chain_rules ORDER BY min_over_limit_points');
  const r4 = await query(`
    SELECT w.name as warehouse, p.name as product, ws.in_stock, ws.reserved, (ws.in_stock - ws.reserved) as available
    FROM warehouse_stock ws
    JOIN warehouses w ON w.id = ws.warehouse_id
    JOIN products p ON p.id = ws.product_id
    LIMIT 8
  `);
  const r5 = await query(`SELECT sp.id, p.name, sp.cycle, sp.price FROM subscription_plans sp JOIN products p ON p.id = sp.product_id`);
  const r6 = await query(`SELECT id, role, name FROM users WHERE role != 'customer' ORDER BY role`);
  const r7 = await query(`SELECT count(*) as c FROM invoices`);
  const r8 = await query(`SELECT count(*) as c FROM fulfillment_orders`);

  console.log('upsell_rules count:', r1.rows[0].c);
  console.log('\nSample products:');
  r2.rows.forEach(p => console.log(`  [${p.id}] ${p.name} | ${p.category} | $${p.base_price}`));
  console.log('\nApproval chain rules:');
  r3.rows.forEach(r => console.log(`  min_over_limit_points=${r.min_over_limit_points}, requires_manager=${r.requires_manager}, requires_finance=${r.requires_finance}`));
  console.log('\nWarehouse stock:');
  r4.rows.forEach(r => console.log(`  ${r.warehouse} | ${r.product} | in_stock=${r.in_stock}, reserved=${r.reserved}, available=${r.available}`));
  console.log('\nSubscription plans:');
  r5.rows.forEach(r => console.log(`  [${r.id}] ${r.name} | ${r.cycle} | $${r.price}`));
  console.log('\nInternal users:', r6.rows.map(u => `${u.name}(${u.role})`).join(', '));
  console.log('\nExisting invoices:', r7.rows[0].c);
  console.log('Existing fulfillment_orders:', r8.rows[0].c);

  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
