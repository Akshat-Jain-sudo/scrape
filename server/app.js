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
import { 
  initDb, 
  getProducts, 
  saveProducts, 
  deleteProduct, 
  clearAllProducts, 
  updateTargetPrice,
  getProductHistory,
  saveScrapeHistory,
  getScrapeHistory,
  getAllScraperHealth,
  saveFeedback,
  getFeedback,
  saveChatMessage,
  getChatHistory
} from './db.js';
import { generateResponse } from './chatbot.js';
import { startPriceHistoryScheduler } from './cron.js';
import { createClient } from '@supabase/supabase-js';

import { saveCredentials, listCredentials, getCredentials, deleteCredentials } from './automator/credentialStore.js';
import { launchOrderSession, confirmOrder, getSupportedStores } from './automator/index.js';
import { getSession, takeScreenshot, listSessions } from './automator/sessionManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Supabase Server Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabaseServer = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase server client:', err);
  }
}

// User Verification Middleware
async function verifyUser(req, res, next) {
  const authHeader = req.headers.authorization;
  req.userId = 'anonymous'; // default fallback

  if (authHeader && authHeader.startsWith('Bearer ') && supabaseServer) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await supabaseServer.auth.getUser(token);
      if (!error && user) {
        req.userId = user.id;
      }
    } catch (e) {
      console.error('Error verifying Supabase user token:', e);
    }
  }
  next();
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(verifyUser);

// ── GET /api/config/supabase — Public Supabase Config for client ──
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// ── GET /api/location/autocomplete — Search address suggestions via Google Places or OSM ──
app.get('/api/location/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.json([]);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        const suggestions = (data.predictions || []).map(pred => ({
          placeId: pred.place_id,
          displayLabel: pred.structured_formatting?.main_text || pred.description,
          rawName: pred.description,
          source: 'google'
        }));
        return res.json(suggestions);
      }
    } catch (e) {
      console.error('Google Autocomplete Proxy failed, falling back to OSM:', e);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const resOsm = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&countrycodes=in&format=json&addressdetails=1&limit=5`,
      { headers: { 'User-Agent': 'Symbiote/1.0', 'Accept-Language': 'en' } }
    );
    if (resOsm.ok) {
      const data = await resOsm.json();
      const suggestions = data.map(item => {
        const addr = item.address || {};
        const locality = addr.neighbourhood || addr.suburb || addr.village || addr.city_district || '';
        const city = addr.city || addr.town || addr.county || '';
        const parts = [];
        if (locality) parts.push(locality);
        if (city && city !== locality) parts.push(city);
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          locality: locality || city || 'Unknown',
          city: city || addr.state || 'Unknown',
          state: addr.state || '',
          pincode: addr.postcode || '',
          displayLabel: parts.length > 0 ? parts.join(', ') : 'Unknown Location',
          rawName: item.display_name,
          source: 'osm'
        };
      });
      return res.json(suggestions);
    }
  } catch (e) {
    console.error('OSM Autocomplete failed:', e);
  }

  res.json([]);
});

// ── GET /api/location/details — Resolve Place ID to lat/lng coordinates (for Google Places) ──
app.get('/api/location/details', async (req, res) => {
  const { placeId } = req.query;
  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Google API key is not configured' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components&key=${apiKey}`
    );
    if (response.ok) {
      const data = await response.json();
      const result = data.result || {};
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;

      let locality = '';
      let city = '';
      let state = '';
      let pincode = '';

      (result.address_components || []).forEach(comp => {
        if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          locality = comp.long_name;
        } else if (comp.types.includes('locality')) {
          city = comp.long_name;
        } else if (comp.types.includes('administrative_area_level_1')) {
          state = comp.long_name;
        } else if (comp.types.includes('postal_code')) {
          pincode = comp.long_name;
        }
      });

      const parts = [];
      if (locality) parts.push(locality);
      if (city && city !== locality) parts.push(city);

      return res.json({
        lat,
        lng,
        locality: locality || city || 'Unknown',
        city: city || state || 'Unknown',
        state,
        pincode,
        displayLabel: parts.length > 0 ? parts.join(', ') : 'Unknown Location'
      });
    }
  } catch (e) {
    console.error('Google Place details resolution failed:', e);
  }
  res.status(500).json({ error: 'Failed to resolve location details' });
});

// ── GET /api/location/reverse — Reverse Geocode lat/lng to Address ──
app.get('/api/location/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        const first = data.results?.[0] || {};
        let locality = '';
        let city = '';
        let state = '';
        let pincode = '';

        (first.address_components || []).forEach(comp => {
          if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
            locality = comp.long_name;
          } else if (comp.types.includes('locality')) {
            city = comp.long_name;
          } else if (comp.types.includes('administrative_area_level_1')) {
            state = comp.long_name;
          } else if (comp.types.includes('postal_code')) {
            pincode = comp.long_name;
          }
        });

        const parts = [];
        if (locality) parts.push(locality);
        if (city && city !== locality) parts.push(city);

        return res.json({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          locality: locality || city || 'Unknown',
          city: city || state || 'Unknown',
          state,
          pincode,
          displayLabel: parts.length > 0 ? parts.join(', ') : 'Unknown Location',
          rawName: first.formatted_address || 'Google Location'
        });
      }
    } catch (e) {
      console.error('Google Reverse Geocoding failed, falling back to OSM:', e);
    }
  }

  // Fallback to OSM Nominatim reverse geocode
  try {
    const resOsm = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'Symbiote/1.0', 'Accept-Language': 'en' } }
    );
    if (resOsm.ok) {
      const data = await resOsm.json();
      const addr = data.address || {};
      const locality = addr.neighbourhood || addr.suburb || addr.village || addr.city_district || '';
      const city = addr.city || addr.town || addr.county || '';
      const parts = [];
      if (locality) parts.push(locality);
      if (city && city !== locality) parts.push(city);

      return res.json({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        locality: locality || city || 'Unknown',
        city: city || addr.state || 'Unknown',
        state: addr.state || '',
        pincode: addr.postcode || '',
        displayLabel: parts.length > 0 ? parts.join(', ') : 'Unknown Location',
        rawName: data.display_name
      });
    }
  } catch (e) {
    console.error('OSM Reverse Geocode failed:', e);
  }

  res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
});

// Initialize DB and Cron background scheduler
try {
  initDb();
  startPriceHistoryScheduler();
} catch (err) {
  console.error('Database initialization failed:', err);
}


// -- GET /api/location/pincode-check -- Check if a store delivers to a location --
app.get('/api/location/pincode-check', (req, res) => {
  const { store, city, pincode, lat, lng } = req.query;
  const loc = { city: city || '', pincode: pincode || '', lat: parseFloat(lat) || null, lng: parseFloat(lng) || null, state: '', locality: '', full: city || '' };
  // Import-free inline tier logic (mirrors scraper.js getLocationTier)
  const metroCities = ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','surat','jaipur','lucknow','noida','gurgaon','gurugram','thane','navi mumbai','ncr'];
  const tier2Cities = ['indore','bhopal','patna','vadodara','ludhiana','agra','nagpur','visakhapatnam','coimbatore','kochi','chandigarh','bhubaneswar','dehradun','mysuru','mysore','raipur','vijayawada','madurai','varanasi','rajkot','nashik','amritsar','faridabad','meerut','kanpur','ranchi','jodhpur','guwahati','thiruvananthapuram','hubli','jalandhar','udaipur','siliguri','mangalore','puducherry','kolhapur','solapur','salem'];
  const cityLower = (city || '').toLowerCase();
  let tier = 'rural';
  if (metroCities.some(m => cityLower.includes(m))) tier = 'metro';
  else if (tier2Cities.some(t => cityLower.includes(t))) tier = 'tier2';
  else if (pincode && pincode.length === 6) tier = 'tier3';

  const QC_CITIES = {
    blinkit: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','lucknow','noida','gurgaon','gurugram','thane','indore','chandigarh','coimbatore','kochi','vadodara','surat','nagpur','agra','patna','bhopal','mysuru','mysore','visakhapatnam'],
    zepto: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','noida','gurgaon','gurugram','thane','surat','vadodara','chandigarh','coimbatore','kochi','nagpur','lucknow','indore','bhopal'],
    instamart: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','noida','gurgaon','gurugram','thane','surat','chandigarh','coimbatore','kochi','nagpur','lucknow','indore','visakhapatnam','bhopal','mysuru','mysore'],
    bbnow: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','noida','gurgaon','gurugram','thane','surat','chandigarh','coimbatore','kochi','nagpur','lucknow'],
    fkminutes: ['bengaluru','bangalore','delhi','mumbai','hyderabad','pune','chennai','noida','gurgaon','gurugram'],
    amazonfresh: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','noida','gurgaon','gurugram','thane'],
    jiomartexpress: ['mumbai','delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad','jaipur','noida','gurgaon','gurugram','thane','surat','nagpur'],
    dunzo: ['bengaluru','bangalore','delhi','mumbai','hyderabad','pune','chennai','gurgaon','gurugram','noida'],
    bbdaily: ['bengaluru','bangalore','mumbai','pune','hyderabad','delhi','noida','gurgaon','gurugram','chennai'],
    countrydelight: ['bengaluru','bangalore','mumbai','pune','hyderabad','delhi','noida','gurgaon','gurugram','chennai','ahmedabad','jaipur']
  };

  if (store) {
    const qcStores = Object.keys(QC_CITIES);
    const isQC = qcStores.includes(store);
    const available = isQC ? (QC_CITIES[store] || []).some(sc => cityLower.includes(sc)) : true;
    return res.json({ store, city, tier, available, reason: available ? null : ${store} does not deliver to  yet });
  }

  // Return availability for all quick-commerce stores
  const result = {};
  Object.keys(QC_CITIES).forEach(s => {
    result[s] = (QC_CITIES[s] || []).some(sc => cityLower.includes(sc));
  });
  res.json({ city, tier, pincode, quickCommerceAvailability: result });
});

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
    saveScrapeHistory({
      id: `scrape-${Date.now()}`,
      query: query.trim(),
      category,
      source,
      pages: pageCount,
      productsFound: uniqueProducts.length,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute scraper' });
  }
});

// ── GET /api/products — Get all saved products ──
app.get('/api/products', async (req, res) => {
  try {
    const products = getProducts(req.userId);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── POST /api/products — Save scraped products (batch) ──
app.post('/api/products', async (req, res) => {
  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products array is required' });
  }

  try {
    // Generate IDs for new products that don't have them
    const preparedProducts = products.map(p => ({
      ...p,
      id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    saveProducts(preparedProducts, req.userId);
    
    res.status(201).json({ 
      message: `Saved ${preparedProducts.length} products to database`,
      savedCount: preparedProducts.length
    });
  } catch (error) {
    console.error('Error saving products:', error);
    res.status(500).json({ error: 'Failed to save products' });
  }
});

// ── POST /api/extension/sync — Sync product from Chrome Extension ──
app.post('/api/extension/sync', async (req, res) => {
  const { product } = req.body;
  if (!product || !product.productLink || !product.price) {
    return res.status(400).json({ error: 'Valid product object is required' });
  }

  try {
    // Generate a stable ID based on clean URL to prevent duplicates
    const cleanUrl = product.productLink.split('?')[0];
    const productId = `ext-${Buffer.from(cleanUrl).toString('base64').replace(/=/g, '').substring(0, 24)}`;
    
    const preparedProduct = {
      ...product,
      id: productId,
      query: product.searchQuery || product.name.substring(0, 30),
      category: 'extension',
    };

    saveProducts([preparedProduct], req.userId);

    res.json({
      success: true,
      message: 'Product synced successfully',
      productId
    });
  } catch (error) {
    console.error('Extension sync error:', error);
    res.status(500).json({ error: 'Failed to sync extension product' });
  }
});

// ── GET /api/products/:id/history — Real price history ──
app.get('/api/products/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const history = getProductHistory(id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch product history' });
  }
});

// ── PUT /api/products/:id/alert — Update target alert price ──
app.put('/api/products/:id/alert', async (req, res) => {
  const { id } = req.params;
  const { targetPrice } = req.body;

  try {
    updateTargetPrice(id, targetPrice ? parseFloat(targetPrice) : null, req.userId);
    res.json({ message: 'Target price updated successfully', targetPrice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// ── DELETE /api/products/:id — Delete a saved product ──
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    deleteProduct(id, req.userId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ── DELETE /api/products — Clear all saved products ──
app.delete('/api/products', async (req, res) => {
  try {
    clearAllProducts(req.userId);
    res.json({ message: 'All products cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear products' });
  }
});

// ── GET /api/analytics — Product analytics ──
app.get('/api/analytics', async (req, res) => {
  const db = await readDb();
  const analytics = computeProductAnalytics(db.products);
  res.json(analytics);
});

// ── GET /api/export/csv — Export saved products as CSV ──
app.get('/api/export/csv', async (req, res) => {
  const products = getProducts(req.userId);
  
  if (products.length === 0) {
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
    const csv = parser.parse(products);

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
  const products = getProducts();
  
  if (products.length === 0) {
    return res.status(404).json({ error: 'No products to export' });
  }

  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'Symbiote';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products', {
      headerFooter: { firstHeader: 'Symbiote - Flipkart Product Data' }
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
    products.forEach(product => {
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
  try {
    res.json(getScrapeHistory());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scrape history' });
  }
});

// ── GET /api/health/scrapers — Scraper Health endpoint ──
app.get('/api/health/scrapers', (req, res) => {
  try {
    const health = getAllScraperHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scraper health' });
  }
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
      const prompt = `You are Symbiote Value Analyst, an expert shopping assistant. Analyze this price comparison payload:
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
app.post('/api/cab-compare', async (req, res) => {
  const { pickup, drop, city = 'Mumbai' } = req.body;
  if (!pickup || !drop) {
    return res.status(400).json({ error: 'Pickup and drop locations are required' });
  }

  try {
    const comparison = await compareCabFares(pickup.trim(), drop.trim(), city.trim());
    res.json(comparison);
  } catch (error) {
    console.error('Cab comparison error:', error);
    res.status(500).json({ error: error.message || 'Failed to compare cab fares' });
  }
});

// ── POST /api/chat — AI Chatbot message endpoint ──
app.post('/api/chat', (req, res) => {
  const { message, sessionId, currentPage } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId are required' });
  }

  try {
    // Save user message
    saveChatMessage({ sessionId, role: 'user', content: message, userId: req.userId });

    // Generate AI response
    const result = generateResponse(message, sessionId, currentPage);

    // Save assistant response
    saveChatMessage({ sessionId, role: 'assistant', content: result.reply, userId: req.userId });

    // If feedback was collected, save it
    if (result.feedbackSaved) {
      saveFeedback({ ...result.feedbackSaved, userId: req.userId });
    }

    res.json({
      reply: result.reply,
      intent: result.intent,
      feedbackSaved: !!result.feedbackSaved,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// ── POST /api/feedback — Submit structured feedback ──
app.post('/api/feedback', (req, res) => {
  const { category, message, rating, page } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Feedback message is required' });
  }

  try {
    saveFeedback({ category, message, rating, page, userId: req.userId });
    res.json({ success: true, message: 'Feedback saved successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// ── GET /api/feedback — Retrieve all feedback ──
app.get('/api/feedback', (req, res) => {
  try {
    const feedback = getFeedback(req.userId);
    res.json(feedback);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ── GET /api/chat/history/:sessionId — Retrieve chat history ──
app.get('/api/chat/history/:sessionId', (req, res) => {
  try {
    const history = getChatHistory(req.params.sessionId, req.userId);
    res.json(history);
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
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


// -- Order Relay Routes --

// GET /api/order/stores -- List supported stores for automated ordering
app.get('/api/order/stores', (req, res) => {
  res.json(getSupportedStores());
});

// POST /api/order/credentials -- Save encrypted platform credentials
app.post('/api/order/credentials', (req, res) => {
  const { platform, username, password } = req.body;
  if (!platform || !username || !password) return res.status(400).json({ error: 'platform, username, and password are required' });
  try {
    saveCredentials(req.userId, platform, username, password);
    res.json({ success: true, message: Credentials saved for  });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save credentials: ' + e.message });
  }
});

// GET /api/order/credentials -- List saved platforms (no passwords returned)
app.get('/api/order/credentials', (req, res) => {
  try {
    const creds = listCredentials(req.userId);
    res.json(creds);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/order/credentials/:platform -- Remove credentials
app.delete('/api/order/credentials/:platform', (req, res) => {
  const deleted = deleteCredentials(req.userId, req.params.platform);
  res.json({ success: deleted });
});

// POST /api/order/initiate -- Start order automation session
app.post('/api/order/initiate', async (req, res) => {
  const { store, productUrl, productName, deliveryAddress } = req.body;
  if (!store || !productUrl) return res.status(400).json({ error: 'store and productUrl are required' });
  const creds = getCredentials(req.userId, store);
  if (!creds) return res.status(400).json({ error: No saved credentials for . Please add credentials first via POST /api/order/credentials });
  try {
    const result = await launchOrderSession({ store, credentials: creds, productUrl, productName, deliveryAddress, userId: req.userId });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to launch session: ' + e.message });
  }
});

// GET /api/order/screenshot/:sessionId -- Get latest browser screenshot
app.get('/api/order/screenshot/:sessionId', async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  const b64 = await takeScreenshot(req.params.sessionId);
  if (!b64) return res.status(500).json({ error: 'Screenshot not available' });
  res.json({ screenshotBase64: b64, status: session.status, history: session.history });
});

// POST /api/order/confirm/:sessionId -- User confirms -> system places order
app.post('/api/order/confirm/:sessionId', async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  if (session.status !== 'awaiting_payment') return res.status(400).json({ error: Session is in state '', not 'awaiting_payment' });
  try {
    const result = await confirmOrder(req.params.sessionId, session);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to confirm order: ' + e.message });
  }
});

// GET /api/order/sessions -- List all active sessions for user
app.get('/api/order/sessions', (req, res) => {
  res.json(listSessions(req.userId));
});

export default app;
