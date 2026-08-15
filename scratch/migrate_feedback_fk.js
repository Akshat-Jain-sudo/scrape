import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const res = await pool.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'feedback'::regclass AND contype = 'f';
  `);
  console.log('Feedback FK constraints:', res.rows);
  for (const row of res.rows) {
    await pool.query(`ALTER TABLE feedback DROP CONSTRAINT ${row.conname};`);
  }
  await pool.query(`
    ALTER TABLE feedback 
    ADD CONSTRAINT feedback_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);
  console.log('Updated feedback foreign key to ON DELETE CASCADE');
  await pool.end();
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
