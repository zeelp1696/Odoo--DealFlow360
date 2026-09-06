import 'dotenv/config';
import { query } from './src/db.js';

async function run() {
  try {
    const enumQuery = await query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'product_category';`);
    console.log('Categories:', JSON.stringify(enumQuery.rows));
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
run();
