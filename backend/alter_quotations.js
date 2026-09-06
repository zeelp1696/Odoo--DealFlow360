import { pool } from './src/db.js';
async function run() {
  await pool.query('ALTER TABLE quotations ALTER COLUMN customer_id DROP NOT NULL;');
  console.log('Made customer_id nullable');
  process.exit(0);
}
run();
