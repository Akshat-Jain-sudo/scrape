import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getNeonPool } from '../server/neonDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

async function inspect() {
  const pool = getNeonPool();

  console.log('=== Sample rows for WMNS AIR MAX SC Sneakers ===');
  const airmax = await pool.query("SELECT db_id, id, title, store, created_at FROM products WHERE user_id = 'a13bd266-cc2b-4ac2-8153-2b495c3e5c83' AND title LIKE '%AIR MAX SC%' ORDER BY created_at DESC");
  console.table(airmax.rows);

  await pool.end();
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
