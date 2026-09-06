import 'dotenv/config';
import { query } from './src/db.js';

async function run() {
  try {
    const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' AND table_schema = 'public' ORDER BY ordinal_position`);
    console.log('Invoices:', JSON.stringify(cols.rows));
    
    const payments = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' AND table_schema = 'public' ORDER BY ordinal_position`);
    console.log('Payments:', JSON.stringify(payments.rows));
    
    const sample = await query(`SELECT * FROM invoices LIMIT 3`);
    console.log('Sample invoices:', JSON.stringify(sample.rows));
    
    const creditNotes = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'credit_notes' AND table_schema = 'public' ORDER BY ordinal_position`);
    console.log('Credit notes:', JSON.stringify(creditNotes.rows));
    
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
run();
