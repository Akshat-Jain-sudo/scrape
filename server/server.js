import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  scrapeFlipkartSearch, 
  scrapeSnapdealSearch,
  simulateStoreSearch,
  computeProductAnalytics, 
  TRENDING_DEALS, 
  compareProductPrices 
} from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Initialize Local JSON Database ──
function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ products: [], scrapeHistory: [] }, null, 2));
    console.log('Local JSON Database initialized.');
  } else {
    // Migrate old schema if needed
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (!data.products) {
        data.products = data.articles || [];
        delete data.articles;
      }
      if (!data.scrapeHistory) {
        data.scrapeHistory = [];
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ products: [], scrapeHistory: [] }, null, 2));
    }
  }
}
initDb();

// ── Database helpers ──
function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { products: [], scrapeHistory: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// ══════════════════════════════════════
// API Routes
// ══════════════════════════════════════

// ── GET /api/trending — Get trending deals configuration ──
app.get('/api/trending', (req, res) => {
  res.json(TRENDING_DEALS);
});

// ── POST /api/compare — Compare product prices across stores ──
app.post('/api/compare', async (req, res) => {
  const { query, category = 'electronics' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const comparison = await compareProductPrices(query.trim(), category);
    res.json(comparison);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message || 'Failed to compare product prices' });
  }
});

// ── POST /api/scrape — Scrape products from selected stores ──
app.post('/api/scrape', async (req, res) => {
  const { query, category = 'ecommerce', source = 'all', pages = 3 } = req.body;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const pageCount = Math.min(Math.max(1, parseInt(pages) || 3), 10);
  const startTime = Date.now();

  try {
    console.log(`\n🔍 Scrape request: "${query}" | Category: ${category} | Source: ${source} | Pages: ${pageCount}`);
    
    let products = [];
    
    if (category === 'ecommerce') {
      if (source === 'flipkart' || source === 'all') {
        const fkProducts = await scrapeFlipkartSearch(query.trim(), pageCount);
        products = [...products, ...fkProducts];
      }
      
      if (source === 'snapdeal' || source === 'all') {
        const sdProducts = await scrapeSnapdealSearch(query.trim(), pageCount);
        products = [...products, ...sdProducts];
      }

      if (source === 'croma' || source === 'all') {
        await new Promise(r => setTimeout(r, 600));
        const cromaProducts = simulateStoreSearch(query.trim(), 'croma', pageCount);
        products = [...products, ...cromaProducts];
      }

      if (source === 'myntra' || source === 'all') {
        await new Promise(r => setTimeout(r, 500));
        const myntraProducts = simulateStoreSearch(query.trim(), 'myntra', pageCount);
        products = [...products, ...myntraProducts];
      }

      if (source === 'ajio' || source === 'all') {
        await new Promise(r => setTimeout(r, 500));
        const ajioProducts = simulateStoreSearch(query.trim(), 'ajio', pageCount);
        products = [...products, ...ajioProducts];
      }
    } else {
      // Quick Commerce
      if (source === 'blinkit' || source === 'all') {
        await new Promise(r => setTimeout(r, 400));
        const blinkitProducts = simulateStoreSearch(query.trim(), 'blinkit', pageCount);
        products = [...products, ...blinkitProducts];
      }
      
      if (source === 'zepto' || source === 'all') {
        await new Promise(r => setTimeout(r, 400));
        const zeptoProducts = simulateStoreSearch(query.trim(), 'zepto', pageCount);
        products = [...products, ...zeptoProducts];
      }

      if (source === 'instamart' || source === 'all') {
        await new Promise(r => setTimeout(r, 400));
        const instamartProducts = simulateStoreSearch(query.trim(), 'instamart', pageCount);
        products = [...products, ...instamartProducts];
      }
    }

    // Deduplicate by name and source
    const seen = new Set();
    const uniqueProducts = products.filter(p => {
      const key = `${p.source}-${p.name.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const result = {
      products: uniqueProducts,
      meta: {
        query: query.trim(),
        category,
        source,
        pagesScraped: pageCount,
        totalExtracted: products.length,
        uniqueProducts: uniqueProducts.length,
        errors: [],
        elapsedSeconds: parseFloat(elapsed),
        scrapedAt: new Date().toISOString()
      }
    };

    // Save to scrape history
    const db = readDb();
    db.scrapeHistory.unshift({
      id: `scrape-${Date.now()}`,
      query: query.trim(),
      category,
      source,
      pages: pageCount,
      productsFound: uniqueProducts.length,
      timestamp: new Date().toISOString()
    });
    db.scrapeHistory = db.scrapeHistory.slice(0, 20);
    writeDb(db);

    res.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute scraper' });
  }
});

// ── GET /api/products — Get all saved products ──
app.get('/api/products', (req, res) => {
  const db = readDb();
  res.json(db.products || []);
});

// ── POST /api/products — Save scraped products (batch) ──
app.post('/api/products', (req, res) => {
  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products array is required' });
  }

  const db = readDb();
  let savedCount = 0;
  let skippedCount = 0;

  products.forEach(product => {
    // Check for duplicates by name
    const exists = db.products.find(p => 
      p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase()
    );
    if (!exists) {
      db.products.push({
        ...product,
        id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        savedAt: new Date().toISOString()
      });
      savedCount++;
    } else {
      skippedCount++;
    }
  });

  writeDb(db);
  res.status(201).json({ 
    message: `Saved ${savedCount} products (${skippedCount} duplicates skipped)`,
    savedCount,
    skippedCount,
    totalInDb: db.products.length
  });
});

// ── DELETE /api/products/:id — Delete a saved product ──
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const initialLength = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  
  if (db.products.length === initialLength) {
    return res.status(404).json({ error: 'Product not found' });
  }

  writeDb(db);
  res.json({ message: 'Product deleted successfully', id });
});

// ── DELETE /api/products — Clear all saved products ──
app.delete('/api/products', (req, res) => {
  const db = readDb();
  const count = db.products.length;
  db.products = [];
  writeDb(db);
  res.json({ message: `Cleared ${count} products from database` });
});

// ── GET /api/analytics — Product analytics ──
app.get('/api/analytics', (req, res) => {
  const db = readDb();
  const analytics = computeProductAnalytics(db.products);
  res.json(analytics);
});

// ── GET /api/export/csv — Export saved products as CSV ──
app.get('/api/export/csv', async (req, res) => {
  const db = readDb();
  
  if (db.products.length === 0) {
    return res.status(404).json({ error: 'No products to export' });
  }

  try {
    const { Parser } = await import('json2csv');
    
    const fields = [
      'name', 'price', 'priceFormatted', 'originalPrice', 'originalPriceFormatted',
      'discount', 'discountFormatted', 'rating', 'ratingsCount', 'reviewsCount',
      'productLink', 'imageUrl', 'searchQuery', 'page', 'scrapedAt'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(db.products);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=flipkart_products_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// ── GET /api/export/excel — Export saved products as Excel ──
app.get('/api/export/excel', async (req, res) => {
  const db = readDb();
  
  if (db.products.length === 0) {
    return res.status(404).json({ error: 'No products to export' });
  }

  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'FlipScrape';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products', {
      headerFooter: { firstHeader: 'FlipScrape - Flipkart Product Data' }
    });

    // Define columns
    sheet.columns = [
      { header: 'Product Name', key: 'name', width: 50 },
      { header: 'Price (₹)', key: 'price', width: 15 },
      { header: 'Original Price (₹)', key: 'originalPrice', width: 18 },
      { header: 'Discount (%)', key: 'discount', width: 14 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Ratings Count', key: 'ratingsCount', width: 15 },
      { header: 'Reviews Count', key: 'reviewsCount', width: 15 },
      { header: 'Product Link', key: 'productLink', width: 60 },
      { header: 'Image URL', key: 'imageUrl', width: 40 },
      { header: 'Search Query', key: 'searchQuery', width: 20 },
      { header: 'Page', key: 'page', width: 8 },
      { header: 'Scraped At', key: 'scrapedAt', width: 22 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2874F0' } // Flipkart blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add product data
    db.products.forEach(product => {
      sheet.addRow({
        name: product.name || '',
        price: product.price || '',
        originalPrice: product.originalPrice || '',
        discount: product.discount || '',
        rating: product.rating || '',
        ratingsCount: product.ratingsCount || '',
        reviewsCount: product.reviewsCount || '',
        productLink: product.productLink || '',
        imageUrl: product.imageUrl || '',
        searchQuery: product.searchQuery || '',
        page: product.page || '',
        scrapedAt: product.scrapedAt || ''
      });
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: 'L1' };

    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=flipkart_products_${Date.now()}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

// ── GET /api/history — Get scrape history ──
app.get('/api/history', (req, res) => {
  const db = readDb();
  res.json(db.scrapeHistory || []);
});

// ── Serve React build assets in production ──
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
  console.log(`Serving static client files from: ${clientBuildPath}`);
}

// ── Server Start ──
app.listen(PORT, () => {
  console.log(`\n🚀 FlipScrape Server running on http://localhost:${PORT}`);
  console.log(`   API endpoints:`);
  console.log(`   POST /api/scrape          — Scrape Flipkart products`);
  console.log(`   GET  /api/products        — List saved products`);
  console.log(`   POST /api/products        — Save products`);
  console.log(`   DEL  /api/products/:id    — Delete a product`);
  console.log(`   DEL  /api/products        — Clear all products`);
  console.log(`   GET  /api/analytics       — Product analytics`);
  console.log(`   GET  /api/export/csv      — Export CSV`);
  console.log(`   GET  /api/export/excel    — Export Excel`);
  console.log(`   GET  /api/history         — Scrape history\n`);
});
