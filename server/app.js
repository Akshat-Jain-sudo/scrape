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
  getEstimatedBasePrice,
  doesStoreSellQuery,
  compareCabFares
} from './scraper.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { initDb, readDb, writeDb } from './db.js';
import { startPriceHistoryScheduler } from './cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB and Cron background scheduler
initDb()
  .then(() => {
    startPriceHistoryScheduler();
  })
  .catch(err => console.error('Database initialization failed:', err));

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
        : ['amazon', 'flipkart', 'snapdeal', 'jiomart', 'tatacliq', 'shopsy', 'paytmmall', 'meesho', 'shopclues', 'ebay'];

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

    const itemPrices = [];
    const itemProducts = [];

    // Scrape/simulate each item
    for (const itemQuery of items) {
      const queryStr = itemQuery.trim();
      if (!queryStr) continue;

      const pricesForQuery = {};
      const productsForQuery = {};

      for (const store of targetStores) {
        const isSold = doesStoreSellQuery(store, queryStr);
        let bestMatch = null;

        if (isSold) {
          const storeProducts = simulateStoreSearch(queryStr, store, 1, location);
          if (storeProducts && storeProducts.length > 0) {
            bestMatch = { ...storeProducts.sort((a, b) => a.price - b.price)[0], available: true };
          } else {
            const estPrice = getEstimatedBasePrice(queryStr, category);
            bestMatch = {
              query: queryStr,
              name: `${store.toUpperCase()} ${queryStr} (Simulated)`,
              price: estPrice,
              priceFormatted: `₹${estPrice}`,
              imageUrl: '',
              productLink: getStoreLink(store, queryStr),
              available: true
            };
          }
        } else {
          bestMatch = {
            query: queryStr,
            name: `${STORE_NAMES[store] || store.toUpperCase()} does not sell "${queryStr}"`,
            price: 9999999, // Penalty price
            priceFormatted: 'N/A',
            imageUrl: '',
            productLink: getStoreLink(store, queryStr),
            available: false
          };
        }
        
        cartByStore[store].items.push({
          query: queryStr,
          name: bestMatch.name,
          price: bestMatch.price,
          priceFormatted: bestMatch.priceFormatted,
          imageUrl: bestMatch.imageUrl,
          productLink: bestMatch.productLink,
          available: bestMatch.available
        });
        
        if (bestMatch.available) {
          cartByStore[store].subtotal += bestMatch.price;
        }

        pricesForQuery[store] = bestMatch.price;
        productsForQuery[store] = bestMatch;
      }
      itemPrices.push(pricesForQuery);
      itemProducts.push(productsForQuery);
    }

    // Compute totals for single store options (only valid if store can fulfill ALL items)
    let cheapestStore = null;
    let cheapestTotal = Infinity;
    let mostExpensiveTotal = 0;

    targetStores.forEach(store => {
      const storeCart = cartByStore[store];
      const hasUnavailable = storeCart.items.some(item => !item.available);

      if (hasUnavailable) {
        storeCart.total = 'N/A';
        storeCart.subtotalFormatted = 'N/A';
        storeCart.totalFormatted = 'N/A';
      } else {
        storeCart.total = storeCart.subtotal + storeCart.deliveryFee + storeCart.packagingFee;
        storeCart.subtotalFormatted = `₹${storeCart.subtotal}`;
        storeCart.totalFormatted = `₹${storeCart.total}`;
        
        if (storeCart.total < cheapestTotal) {
          cheapestTotal = storeCart.total;
          cheapestStore = store;
        }
        if (storeCart.total > mostExpensiveTotal) {
          mostExpensiveTotal = storeCart.total;
        }
      }
    });

    const savings = cheapestTotal !== Infinity && mostExpensiveTotal > 0 ? mostExpensiveTotal - cheapestTotal : 0;

    // Mathematical Split-Cart Solver (Branch-and-Bound Backtracking)
    const N = itemPrices.length;
    const storeOverheads = {};
    targetStores.forEach(store => {
      storeOverheads[store] = cartByStore[store].deliveryFee + cartByStore[store].packagingFee;
    });

    let bestTotal = cheapestTotal === Infinity ? 9999999 : cheapestTotal; // Start with single cheapest total (or large number) as upper bound
    let bestAssignments = [];      // Best store for each item index

    // Default to cheapest single store if it exists
    for (let i = 0; i < N; i++) {
      bestAssignments.push(cheapestStore || 'none');
    }

    function solve(itemIdx, currentItemCost, usedStoresSet, currentAssignments) {
      if (itemIdx === N) {
        let overhead = 0;
        usedStoresSet.forEach(s => {
          overhead += storeOverheads[s];
        });
        const grandTotal = currentItemCost + overhead;
        if (grandTotal < bestTotal) {
          bestTotal = grandTotal;
          bestAssignments = [...currentAssignments];
        }
        return;
      }

      for (const store of targetStores) {
        const price = itemPrices[itemIdx][store];
        if (price >= 9999999) {
          continue; // Mismatch: store does not sell this item
        }
        const isNewStore = !usedStoresSet.has(store);
        const addedOverhead = isNewStore ? storeOverheads[store] : 0;

        let currentOverhead = 0;
        usedStoresSet.forEach(s => {
          currentOverhead += storeOverheads[s];
        });

        if (currentItemCost + price + currentOverhead + addedOverhead >= bestTotal) {
          continue; // Branch-and-bound prune
        }

        currentAssignments.push(store);
        if (isNewStore) usedStoresSet.add(store);

        solve(itemIdx + 1, currentItemCost + price, usedStoresSet, currentAssignments);

        if (isNewStore) usedStoresSet.delete(store);
        currentAssignments.pop();
      }
    }

    if (N > 0) {
      solve(0, 0, new Set(), []);
    }

    // Build the splitCart response
    let splitCart = null;
    if (bestTotal < 9999999 && bestAssignments.length > 0 && !bestAssignments.includes('none')) {
      const splitCartBreakdown = {};
      const usedStoresList = Array.from(new Set(bestAssignments));

      usedStoresList.forEach(store => {
        splitCartBreakdown[store] = {
          storeName: STORE_NAMES[store] || store,
          items: [],
          subtotal: 0,
          deliveryFee: cartByStore[store].deliveryFee,
          packagingFee: cartByStore[store].packagingFee,
          total: 0,
          deliveryTime: cartByStore[store].deliveryTime
        };
      });

      for (let i = 0; i < N; i++) {
        const assignedStore = bestAssignments[i];
        const product = itemProducts[i][assignedStore];
        splitCartBreakdown[assignedStore].items.push(product);
        splitCartBreakdown[assignedStore].subtotal += product.price;
      }

      let splitGrandTotal = 0;
      usedStoresList.forEach(store => {
        const breakdown = splitCartBreakdown[store];
        breakdown.total = breakdown.subtotal + breakdown.deliveryFee + breakdown.packagingFee;
        splitGrandTotal += breakdown.total;
      });

      splitCart = {
        grandTotal: splitGrandTotal,
        savings: cheapestTotal !== Infinity ? Math.max(0, cheapestTotal - splitGrandTotal) : 0,
        usedStores: usedStoresList,
        storeBreakdown: splitCartBreakdown
      };
    }

    res.json({
      cartByStore,
      cheapestStore: cheapestStore === 'none' ? null : cheapestStore,
      cheapestTotal: cheapestTotal === Infinity ? 'N/A' : cheapestTotal,
      savings,
      splitCart,
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
    console.log(`\n🔍 Scrape request: "${query}" | Category: ${category} | Sources: ${JSON.stringify(source)} | Pages: ${pageCount} | Location: ${location}`);
    
    let products = [];
    
    // Support multi-source array or comma-separated string
    const activeSources = Array.isArray(source) 
      ? source 
      : typeof source === 'string' && source.includes(',') 
        ? source.split(',').map(s => s.trim()) 
        : [source];

    const matchesSource = (storeKey) => activeSources.includes('all') || activeSources.includes(storeKey);
    const isSingleRequest = activeSources.length === 1 && !activeSources.includes('all');

    if (category === 'ecommerce') {
      // 1. Live Scrapers
      if (matchesSource('flipkart')) {
        const fkProducts = await scrapeFlipkartSearch(query.trim(), pageCount);
        products = [...products, ...fkProducts];
      }
      
      if (matchesSource('snapdeal')) {
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
        'joyalukkas', 'snitch', 'cultstore', 'vishalmegamart',
        'shopsy', 'paytmmall', 'dealshare', 'citymall', 'udaan', 'ondc',
        'tatacliq_luxury', 'nnnow', 'lifestylestores', 'shoppersstop', 'westside', 'zudio', 'azorte', 'reliancetrends', 'yousta', 'centro',
        'souledstore', 'rarerabbit', 'bombayshirt', 'powerlook', 'beyoung', 'redwolf', 'campussutra', 'hubberholme', 'mufti', 'spykar', 'killerjeans', 'flyingmachine',
        'roadster', 'highlander', 'tokyotalkies', 'mastandharbour', 'urbanic', 'redtape',
        'hm', 'uniqlo', 'marksandspencer', 'levis', 'benetton', 'tommyhilfiger', 'calvinklein', 'uspoloassn', 'forever21', 'jackjones', 'only', 'veromoda', 'superdry', 'gasjeans',
        'fabindia', 'manyavar', 'mohey', 'wforwoman', 'aurelia', 'biba', 'globaldesi', 'houseofindya', 'libas', 'soch', 'meenabazaar', 'nallisilks', 'karagiri', 'suta', 'kalkifashion',
        'bata', 'metroshoes', 'mochishoes', 'libertyshoes', 'khadims', 'paragon', 'campusshoes', 'relaxo', 'woodland', 'crocs', 'skechers', 'nike', 'reebok',
        'sony', 'xiaomi', 'realme', 'vivo', 'oppo', 'motorola', 'dell', 'asus', 'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar',
        'boat', 'noise', 'boult', 'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 'anker', 'sennheiser', 'ambrane', 'leafstudios',
        'caratlane', 'bluestone', 'giva', 'melorra', 'miabytanishq', 'kalyanjewellers', 'malabargold', 'sencogold', 'pcjeweller', 'voylla', 'orrajewellery', 'candere', 'kushals',
        'titan', 'fastrack', 'sonata', 'casio', 'fossil', 'danielwellington', 'ethoswatches', 'helioswatches', 'baggit', 'caprese', 'lavie', 'hidesign', 'damilano', 'wildhorn',
        'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 'sunglasshut', 'specsmakers', 'lenspick', 'cleardekho', 'vincentchase',
        'purplle', 'myglamm', 'sugarcosmetics', 'mamaearth', 'wowskin', 'dermaco', 'plumgoodness', 'mcaffeine', 'forestessentials', 'kamaayurveda', 'biotique', 'lotusherbals', 'himalaya', 'minimalist', 'foxtale', 'pilgrim', 'dotandkey', 'facescanada',
        'urbanladder', 'woodenstreet', 'homecentre', 'ikea', 'sleepwell', 'wakefit', 'flomattress', 'thesleepcompany', 'borosil', 'wonderchef', 'pigeon', 'prestige', 'hawkins',
        'hopscotch', 'hamleys', 'decathlon', 'vectorx', 'cosco', 'nivia', 'yonex', 'starsports'
      ];

      for (const store of simulatedEcommerceStores) {
        if (matchesSource(store)) {
          if (isSingleRequest) {
            await new Promise(r => setTimeout(r, 200));
          }
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
      }
    } else if (category === 'food') {
      const foodStores = ['zomato', 'swiggy'];
      for (const store of foodStores) {
        if (matchesSource(store)) {
          if (isSingleRequest) {
            await new Promise(r => setTimeout(r, 200));
          }
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
      }
    } else {
      const quickCommerceStores = [
        'blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes', 
        'amazonfresh', 'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight'
      ];

      for (const store of quickCommerceStores) {
        if (matchesSource(store)) {
          if (isSingleRequest) {
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

    // Find bestPriceDeal across all stores in the category
    let bestPriceDeal = null;
    let lowestPrice = Infinity;

    const simulatedEcommerceStores = [
      'amazon', 'meesho', 'jiomart', 'tatacliq', 'shopclues', 'indiamart',
      'myntra', 'ajio', 'nykaa', 'nykaafashion', 'firstcry', 'pepperfry',
      'bookswagon', 'ebay', 'etsy', 'alibaba', 'aliexpress', 'walmart', 'croma',
      'reliance', 'samsung', 'vijaysales', 'hp', 'oneplus', 'lenovo', 'lg',
      'dailyobjects', 'headphones', 'apple', 'puma', 'lenskart', 'zara',
      'tanishq', 'pantaloons', 'adidas', 'maxfashion', 'bewakoof', 'chumbak',
      'joyalukkas', 'snitch', 'cultstore', 'vishalmegamart',
      'shopsy', 'paytmmall', 'dealshare', 'citymall', 'udaan', 'ondc',
      'tatacliq_luxury', 'nnnow', 'lifestylestores', 'shoppersstop', 'westside', 'zudio', 'azorte', 'reliancetrends', 'yousta', 'centro',
      'souledstore', 'rarerabbit', 'bombayshirt', 'powerlook', 'beyoung', 'redwolf', 'campussutra', 'hubberholme', 'mufti', 'spykar', 'killerjeans', 'flyingmachine',
      'roadster', 'highlander', 'tokyotalkies', 'mastandharbour', 'urbanic', 'redtape',
      'hm', 'uniqlo', 'marksandspencer', 'levis', 'benetton', 'tommyhilfiger', 'calvinklein', 'uspoloassn', 'forever21', 'jackjones', 'only', 'veromoda', 'superdry', 'gasjeans',
      'fabindia', 'manyavar', 'mohey', 'wforwoman', 'aurelia', 'biba', 'globaldesi', 'houseofindya', 'libas', 'soch', 'meenabazaar', 'nallisilks', 'karagiri', 'suta', 'kalkifashion',
      'bata', 'metroshoes', 'mochishoes', 'libertyshoes', 'khadims', 'paragon', 'campusshoes', 'relaxo', 'woodland', 'crocs', 'skechers', 'nike', 'reebok',
      'sony', 'xiaomi', 'realme', 'vivo', 'oppo', 'motorola', 'dell', 'asus', 'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar',
      'boat', 'noise', 'boult', 'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 'anker', 'sennheiser', 'ambrane', 'leafstudios',
      'caratlane', 'bluestone', 'giva', 'melorra', 'miabytanishq', 'kalyanjewellers', 'malabargold', 'sencogold', 'pcjeweller', 'voylla', 'orrajewellery', 'candere', 'kushals',
      'titan', 'fastrack', 'sonata', 'casio', 'fossil', 'danielwellington', 'ethoswatches', 'helioswatches', 'baggit', 'caprese', 'lavie', 'hidesign', 'damilano', 'wildhorn',
      'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 'sunglasshut', 'specsmakers', 'lenspick', 'cleardekho', 'vincentchase',
      'purplle', 'myglamm', 'sugarcosmetics', 'mamaearth', 'wowskin', 'dermaco', 'plumgoodness', 'mcaffeine', 'forestessentials', 'kamaayurveda', 'biotique', 'lotusherbals', 'himalaya', 'minimalist', 'foxtale', 'pilgrim', 'dotandkey', 'facescanada',
      'urbanladder', 'woodenstreet', 'homecentre', 'ikea', 'sleepwell', 'wakefit', 'flomattress', 'thesleepcompany', 'borosil', 'wonderchef', 'pigeon', 'prestige', 'hawkins',
      'hopscotch', 'hamleys', 'decathlon', 'vectorx', 'cosco', 'nivia', 'yonex', 'starsports'
    ];

    const allStoresList = category === 'ecommerce'
      ? ['flipkart', 'snapdeal', ...simulatedEcommerceStores]
      : category === 'food'
        ? ['zomato', 'swiggy']
        : [
            'blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes',
            'amazonfresh', 'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight'
          ];

    for (const store of allStoresList) {
      let storeProducts = [];
      const matchesActive = matchesSource(store);
      
      if (store === 'flipkart' && matchesActive) {
        storeProducts = uniqueProducts.filter(p => p.source === 'flipkart');
      } else if (store === 'snapdeal' && matchesActive) {
        storeProducts = uniqueProducts.filter(p => p.source === 'snapdeal');
      } else {
        storeProducts = simulateStoreSearch(query.trim(), store, 1, location);
      }

      if (storeProducts && storeProducts.length > 0) {
        const cheapestInStore = storeProducts.reduce((lowest, p) => p.price < lowest.price ? p : lowest, storeProducts[0]);
        if (cheapestInStore && cheapestInStore.price < lowestPrice) {
          lowestPrice = cheapestInStore.price;
          bestPriceDeal = cheapestInStore;
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const result = {
      products: uniqueProducts,
      bestPriceDeal,
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

// ── POST /api/ai/analyze — Gemini AI / NLP Analyst recommendation ──
app.post('/api/ai/analyze', async (req, res) => {
  const { cartData, type = 'cart' } = req.body;
  if (!cartData) {
    return res.status(400).json({ error: 'Cart data is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are FlipScrape Value Analyst, an expert shopping assistant. Analyze this price comparison payload:
${JSON.stringify(cartData, null, 2)}

Provide a natural language recommendation (approx 3-5 sentences) on where the user should shop. Factor in total cost, delivery times, ratings, distance, and whether the split-cart option offers better value. Write in a premium, helpful, and concise tone. Reference specific store names and savings values (use ₹ symbol for currency).`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return res.json({ analysis: text.trim(), source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local NLP analyst:', err.message);
    }
  }

  // Local rule-based NLP Fallback Analyst
  try {
    let analysis = '';
    if (type === 'cart') {
      const { cartByStore, cheapestStore, cheapestTotal, splitCart, category } = cartData;
      const cheapestStoreName = cartByStore[cheapestStore]?.storeName || cheapestStore;
      
      let splitInfo = '';
      if (splitCart && splitCart.savings > 0) {
        const storesStr = splitCart.usedStores.map(s => cartByStore[s]?.storeName || s).join(' and ');
        splitInfo = ` Alternatively, by splitting your cart across ${storesStr}, you can reduce your total outlay to ₹${splitCart.grandTotal}, pocketing an extra ₹${splitCart.savings} in net savings after accounting for all delivery fees.`;
      }

      analysis = `Based on our Smart Value analysis, **${cheapestStoreName}** offers the best single-store value for your cart, bringing your grand total to **₹${cheapestTotal}** (including delivery & packaging).${splitInfo} We recommend completing checkout with this optimized distribution to maximize your budget efficiency.`;
    } else {
      // Product comparison mode
      const { products } = cartData;
      if (products && products.length > 0) {
        const sorted = [...products].sort((a, b) => a.price - b.price);
        const cheapest = sorted[0];
        const highestRated = [...products].sort((a, b) => b.rating - a.rating)[0];
        
        analysis = `Our value scan recommends the **${cheapest.name}** on **${cheapest.source.toUpperCase()}** as the most economical option at **₹${cheapest.price}** (${cheapest.discount}% off). However, if quality is your priority, the **${highestRated.name}** on **${highestRated.source.toUpperCase()}** boasts the highest consumer rating of **${highestRated.rating}★** for ₹${highestRated.price}.`;
      } else {
        analysis = "No products were found in the query response. Try broadening your keywords to compare features, prices, and shipping options across major marketplaces.";
      }
    }
    res.json({ analysis, source: 'fallback-nlp' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run NLP analysis' });
  }
});

// ── POST /api/ai/parse-voice — AI/NLP Speech-to-Cart parser ──
app.post('/api/ai/parse-voice', async (req, res) => {
  const { transcription } = req.body;
  if (!transcription) {
    return res.status(400).json({ error: 'Transcription text is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a voice shopping assistant. Extract the list of product items and determine the category ("quickcommerce", "food", or "ecommerce") from this speech:
"${transcription}"

Respond with ONLY a valid JSON object. Do not include markdown code block formatting or backticks. Format:
{
  "items": ["item1", "item2", ...],
  "category": "quickcommerce"
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Clean JSON formatting from text
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        return res.json(parsed);
      }
    } catch (err) {
      console.warn('Gemini Voice Parser failed, falling back to local parser:', err.message);
    }
  }

  // Regex-based Local Fallback NLP Parser
  try {
    const text = transcription.toLowerCase();
    let category = 'quickcommerce'; // default

    if (/\b(food|restaurant|dinner|lunch|breakfast|pizza|burger|biryani|paneer|curry|roti|zomato|swiggy)\b/.test(text)) {
      category = 'food';
    } else if (/\b(ecommerce|amazon|flipkart|snapdeal|phone|laptop|jeans|shirt|clothing|shoes|tshirt|hoodie)\b/.test(text)) {
      category = 'ecommerce';
    }

    // Attempt to extract items
    // Look for phrases like "search for", "add", "buy", "get", "need"
    let listPart = text;
    const match = text.match(/(?:search for|add|buy|get|need)\s+(.+)/i);
    if (match) {
      listPart = match[1];
    }

    // Split on "and", "or", commas
    const rawItems = listPart.split(/\band\b|,|\bor\b/);
    const items = rawItems
      .map(item => {
        // Clean up common fillers, numbers, articles
        return item
          .replace(/\b(a|an|the|some|please|packs? of|kgs?|litres?|cans? of|bottles? of|pieces?|box|to the cart|to cart)\b/g, '')
          .replace(/\b\d+\s*\b/g, '') // remove numbers
          .trim();
      })
      .filter(item => item.length > 2);

    res.json({
      items: items.length > 0 ? items : [transcription],
      category
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse voice query' });
  }
});

// ── POST /api/cab-compare — Compare cab fares across platforms ──
app.post('/api/cab-compare', (req, res) => {
  const { pickup, drop, city = 'Mumbai' } = req.body;
  if (!pickup || !drop) {
    return res.status(400).json({ error: 'Pickup and drop locations are required' });
  }

  try {
    const comparison = compareCabFares(pickup.trim(), drop.trim(), city.trim());
    res.json(comparison);
  } catch (error) {
    console.error('Cab comparison error:', error);
    res.status(500).json({ error: error.message || 'Failed to compare cab fares' });
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
