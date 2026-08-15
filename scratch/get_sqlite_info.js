import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../server/database.db');

async function getStats() {
  console.log(`Checking SQLite stats at ${DB_PATH}...\n`);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('SQLite file does not exist!');
    process.exit(1);
  }

  const stats = fs.statSync(DB_PATH);
  console.log(`File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)\n`);

  const db = new Database(DB_PATH);
  const tables = ['products', 'price_history', 'scraper_health', 'feedback', 'chat_messages', 'user_profiles'];

  for (const table of tables) {
    try {
      const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`Table: ${table.padEnd(20)} | Rows: ${count}`);
    } catch (e) {
      console.log(`Table: ${table.padEnd(20)} | ERROR: ${e.message}`);
    }
  }

  db.close();
}

getStats();
