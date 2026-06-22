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
  compareProductPrices,
  getRandomUserAgent,
  STORE_NAMES,
  getStoreLink,
  getStoreDeliveryTime,
  getEstimatedBasePrice
} from './scraper.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { initDb, readDb, writeDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB (runs asynchronously on load)
initDb().catch(err => console.error('Database initialization failed:', err));

// ── GET /api/trending — Get trending deals configuration ──
app.get('/api/trending', (req, res) => {
  res.json(TRENDING_DEALS);
});

// ── POST /api/compare — Compare product prices across stores ──
app.post('/api/compare', async (req, res) => {
  const { query, category = 'electronics', location = 'Mumbai' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const comparison = await compareProductPrices(query.trim(), category, location);
    res.json(comparison);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message || 'Failed to compare product prices' });
  }
});

// ── POST /api/cart/optimize — Calculate the cheapest store overall for a list of items ──
app.post('/api/cart/optimize', async (req, res) => {
  const { items, location = 'Mumbai', category = 'quickcommerce' } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const cartByStore = {};
    const targetStores = category === 'quickcommerce' 
      ? ['blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes']
      : category === 'food' 
        ? ['zomato', 'swiggy']
        : ['amazon', 'flipkart', 'snapdeal', 'jiomart', 'tatacliq'];

    // Initialize stores in the result
    targetStores.forEach(store => {
      const deliveryFee = category === 'food' ? 30 + Math.floor(Math.random() * 20) :
                         category === 'quickcommerce' ? 15 + Math.floor(Math.random() * 15) : 0;
      const packagingFee = category === 'food' ? 10 + Math.floor(Math.random() * 15) : 0;
      
      cartByStore[store] = {
        storeName: STORE_NAMES[store] || store,
        items: [],
        subtotal: 0,
        deliveryFee,
        packagingFee,
        total: 0,
        deliveryTime: getStoreDeliveryTime(store)
      };
    });

    // Scrape/simulate each item
    for (const itemQuery of items) {
      const queryStr = itemQuery.trim();
      if (!queryStr) continue;

      for (const store of targetStores) {
        const storeProducts = simulateStoreSearch(queryStr, store, 1, location);
        if (storeProducts && storeProducts.length > 0) {
          // Find the cheapest match
          const bestMatch = storeProducts.sort((a, b) => a.price - b.price)[0];
          cartByStore[store].items.push({
            query: queryStr,
            name: bestMatch.name,
            price: bestMatch.price,
            priceFormatted: bestMatch.priceFormatted,
            imageUrl: bestMatch.imageUrl,
            productLink: bestMatch.productLink
          });
          cartByStore[store].subtotal += bestMatch.price;
        } else {
          // Fallback if no item found
          const estPrice = getEstimatedBasePrice(queryStr, category);
          cartByStore[store].items.push({
            query: queryStr,
            name: `${store.toUpperCase()} ${queryStr} (Simulated)`,
            price: estPrice,
            priceFormatted: `₹${estPrice}`,
            imageUrl: '',
            productLink: getStoreLink(store, queryStr)
          });
          cartByStore[store].subtotal += estPrice;
        }
      }
    }

    // Compute totals
    let cheapestStore = targetStores[0];
    let cheapestTotal = Infinity;
    let mostExpensiveTotal = 0;

    targetStores.forEach(store => {
      const storeCart = cartByStore[store];
      storeCart.total = storeCart.subtotal + storeCart.deliveryFee + storeCart.packagingFee;
      
      if (storeCart.total < cheapestTotal) {
        cheapestTotal = storeCart.total;
        cheapestStore = store;
      }
      if (storeCart.total > mostExpensiveTotal) {
        mostExpensiveTotal = storeCart.total;
      }
    });

    const savings = mostExpensiveTotal - cheapestTotal;

    res.json({
      cartByStore,
      cheapestStore,
      cheapestTotal,
      savings,
      location,
      category
    });
  } catch (err) {
    console.error('Cart optimization error:', err);
    res.status(500).json({ error: 'Failed to optimize cart' });
  }
});

// ── POST /api/scrape — Scrape products from selected stores ──
app.post('/api/scrape', async (req, res) => {
  const { query, category = 'ecommerce', source = 'all', pages = 3, location = 'Mumbai' } = req.body;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const pageCount = Math.min(Math.max(1, parseInt(pages) || 3), 10);
  const startTime = Date.now();

  try {
    console.log(`\n🔍 Scrape request: "${query}" | Category: ${category} | Source: ${source} | Pages: ${pageCount} | Location: ${location}`);
    
    let products = [];
    
    if (category === 'ecommerce') {
      // 1. Live Scrapers
      if (source === 'flipkart' || source === 'all') {
        const fkProducts = await scrapeFlipkartSearch(query.trim(), pageCount);
        products = [...products, ...fkProducts];
      }
      
      if (source === 'snapdeal' || source === 'all') {
        const sdProducts = await scrapeSnapdealSearch(query.trim(), pageCount);
        products = [...products, ...sdProducts];
      }

      // 2. Simulated Store Engines
      const simulatedEcommerceStores = [
        'amazon', 'meesho', 'jiomart', 'tatacliq', 'shopclues', 'indiamart',
        'myntra', 'ajio', 'nykaa', 'nykaafashion', 'firstcry', 'pepperfry',
        'bookswagon', 'ebay', 'etsy', 'alibaba', 'aliexpress', 'walmart', 'croma',
        'reliance', 'samsung', 'vijaysales', 'hp', 'oneplus', 'lenovo', 'lg',
        'dailyobjects', 'headphones', 'apple', 'puma', 'lenskart', 'zara',
        'tanishq', 'pantaloons', 'adidas', 'maxfashion', 'bewakoof', 'chumbak',
        'joyalukkas', 'snitch', 'cultstore', 'vishalmegamart'
      ];

      for (const store of simulatedEcommerceStores) {
        if (source === store || source === 'all') {
          if (source !== 'all') {
            await new Promise(r => setTimeout(r, 200));
          }
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
      }
    } else if (category === 'food') {
      // Food Delivery (Zomato & Swiggy)
      const foodStores = ['zomato', 'swiggy'];
      for (const store of foodStores) {
        if (source === store || source === 'all') {
          if (source !== 'all') {
            await new Promise(r => setTimeout(r, 200));
          }
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
      }
    } else {
      // Quick Commerce
      const quickCommerceStores = [
        'blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes', 
        'amazonfresh', 'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight'
      ];

      for (const store of quickCommerceStores) {
        if (source === store || source === 'all') {
          if (source !== 'all') {
            await new Promise(r => setTimeout(r, 200));
          }
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
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
    const db = await readDb();
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
    await writeDb(db);

    res.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute scraper' });
  }
});

// ── GET /api/products — Get all saved products ──
app.get('/api/products', async (req, res) => {
  const db = await readDb();
  res.json(db.products || []);
});

// ── POST /api/products — Save scraped products (batch) ──
app.post('/api/products', async (req, res) => {
  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products array is required' });
  }

  const db = await readDb();
  let savedCount = 0;
  let skippedCount = 0;

  products.forEach(product => {
    // Check for duplicates by name and source
    const exists = db.products.find(p => 
      p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase() &&
      p.source && product.source && p.source.toLowerCase() === product.source.toLowerCase()
    );
    if (!exists) {
      // Generate simulated price history for the last 5 days
      const basePrice = product.price || 100;
      const history = [];
      for (let d = 4; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        // Variance factor between 0.88 and 1.12
        const varPercent = 0.88 + Math.random() * 0.24;
        const histPrice = Math.round(basePrice * varPercent);
        history.push({
          price: histPrice,
          date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        });
      }

      db.products.push({
        ...product,
        id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        priceHistory: history,
        targetPrice: null, // default
        savedAt: new Date().toISOString()
      });
      savedCount++;
    } else {
      skippedCount++;
    }
  });

  await writeDb(db);
  res.status(201).json({ 
    message: `Saved ${savedCount} products (${skippedCount} duplicates skipped)`,
    savedCount,
    skippedCount,
    totalInDb: db.products.length
  });
});

// ── PUT /api/products/:id/alert — Update target alert price ──
app.put('/api/products/:id/alert', async (req, res) => {
  const { id } = req.params;
  const { targetPrice } = req.body;

  const db = await readDb();
  const product = db.products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  product.targetPrice = targetPrice ? parseFloat(targetPrice) : null;
  await writeDb(db);
  res.json({ message: 'Target price updated successfully', targetPrice: product.targetPrice });
});

// ── DELETE /api/products/:id — Delete a saved product ──
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const db = await readDb();
  
  const initialLength = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  
  if (db.products.length === initialLength) {
    return res.status(404).json({ error: 'Product not found' });
  }

  await writeDb(db);
  res.json({ message: 'Product deleted successfully', id });
});

// ── DELETE /api/products — Clear all saved products ──
app.delete('/api/products', async (req, res) => {
  const db = await readDb();
  const count = db.products.length;
  db.products = [];
  await writeDb(db);
  res.json({ message: `Cleared ${count} products from database` });
});

// ── GET /api/analytics — Product analytics ──
app.get('/api/analytics', async (req, res) => {
  const db = await readDb();
  const analytics = computeProductAnalytics(db.products);
  res.json(analytics);
});

// ── GET /api/export/csv — Export saved products as CSV ──
app.get('/api/export/csv', async (req, res) => {
  const db = await readDb();
  
  if (db.products.length === 0) {
    return res.status(404).json({ error: 'No products to export' });
  }

  try {
    const { Parser } = await import('json2csv');
    
    const fields = [
      'name', 'price', 'priceFormatted', 'originalPrice', 'originalPriceFormatted',
      'discount', 'discountFormatted', 'rating', 'ratingsCount', 'reviewsCount',
      'productLink', 'imageUrl', 'searchQuery', 'page', 'source', 'scrapedAt'
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
  const db = await readDb();
  
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
      { header: 'Source', key: 'source', width: 15 },
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
        source: product.source || '',
        scrapedAt: product.scrapedAt || ''
      });
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: 'M1' };

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
app.get('/api/history', async (req, res) => {
  const db = await readDb();
  res.json(db.scrapeHistory || []);
});

// ── GET /api/proxy-image — Proxy product images to bypass WAF/Hotlinking blocks ──
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    if (decodedUrl.startsWith('/') || decodedUrl.includes('unsplash.com')) {
      return res.redirect(decodedUrl);
    }

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': decodedUrl.includes('flipkart') ? 'https://www.flipkart.com/' : 'https://www.snapdeal.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 6000
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error(`Image proxy failed for ${url}:`, error.message);
    res.redirect('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200');
  }
});

// ── Serve React build assets in production ──
const clientBuildPath = path.join(__dirname, '../dist');
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

export default app;
