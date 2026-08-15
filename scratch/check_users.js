import { getNeonPool } from '../server/neonDb.js';

async function main() {
  const pool = getNeonPool();
  try {
    const res = await pool.query('SELECT id, email, created_at FROM users');
    console.log('Users in DB count:', res.rows.length);
    console.log('Users:', res.rows);
  } catch (e) {
    console.error('Query error:', e);
  } finally {
    pool.end();
  }
}

main();
