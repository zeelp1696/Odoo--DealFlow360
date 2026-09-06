import { pool } from './src/db.js';
async function run() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quotations';");
  console.log(res.rows);
  process.exit(0);
}
run();
