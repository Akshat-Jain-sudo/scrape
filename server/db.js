import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Use /tmp/db.json if running in a serverless function, otherwise use local directory
const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV;
const filePath = isServerless ? '/tmp/db.json' : DB_PATH;

export async function initDb() {
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify({ products: [], scrapeHistory: [] }, null, 2));
      console.log(`Database initialized at: ${filePath}`);
    } catch (e) {
      console.error('Error initializing file database:', e);
    }
  }
}

export async function readDb() {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.products) {
        parsed.products = parsed.articles || [];
        delete parsed.articles;
      }
      if (!parsed.scrapeHistory) {
        parsed.scrapeHistory = [];
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error reading file database:', error);
  }
  return { products: [], scrapeHistory: [] };
}

export async function writeDb(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing file database:', error);
  }
}
