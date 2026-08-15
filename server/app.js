import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
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
  compareCabFares,
  getNearbyRestaurants,
  getRestaurantMenu
} from './scraper.js';
import { filterAndRankProducts, detectBrands } from './relevance.js';
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
import jwt from 'jsonwebtoken';
import { initNeonDb, createUser, authenticateUser, findUserById, getNeonUserProfile, updateNeonUserProfile } from './neonDb.js';

import { saveCredentials, listCredentials, getCredentials, deleteCredentials } from './automator/credentialStore.js';
import { launchOrderSession, confirmOrder, getSupportedStores } from './automator/index.js';
import { getSession, takeScreenshot, listSessions } from './automator/sessionManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && (JWT_SECRET === 'symbiote-jwt-secret-key-2024-change-in-prod' || JWT_SECRET === 'symbiote-fallback-secret')) {
  console.error('FATAL ERROR: A weak JWT_SECRET is configured in a production environment.');
  process.exit(1);
}

// Generate JWT token for a user
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// User Verification Middleware (JWT-based, replaces Supabase)
async function verifyUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const anonHeader = req.headers['x-anonymous-session'];
  req.userId = null; // No default shared anonymous bucket

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // Ignore stringified placeholders from frontend
    if (!token || token === 'null' || token === 'undefined') {
      req.userId = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        req.userId = decoded.userId;
      } else {
        return res.status(401).json({ error: 'Invalid authentication token payload' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
  } else if (anonHeader) {
    // Validate format of X-Anonymous-Session to prevent injection
    const ANON_REGEX = /^anon-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (ANON_REGEX.test(anonHeader)) {
      req.userId = anonHeader;
    } else {
      return res.status(400).json({ error: 'Invalid anonymous session format' });
    }
  }
  next();
}

// Middleware to ensure user is authenticated (not anonymous)
function requireAuth(req, res, next) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!req.userId || typeof req.userId !== 'string' || !UUID_REGEX.test(req.userId)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

const app = express();

// Configure CORS: restrict in production, preserve local development
app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const host = req.header('Host');
  const proto = req.connection.encrypted ? 'https' : 'http';
  const sameOrigin = origin === `${proto}://${host}`;
  
  let corsOptions = { origin: false, credentials: true };
  
  const isLocal = origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
  const isExtension = origin && origin.startsWith('chrome-extension://');
  const isProdFrontend = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;
  
  if (process.env.NODE_ENV === 'production') {
    if (sameOrigin || isProdFrontend || isExtension) {
      corsOptions.origin = true;
    }
  } else {
    // In development, allow localhost, extension, and sameOrigin
    if (!origin || sameOrigin || isLocal || isExtension) {
      corsOptions.origin = true;
    } else {
      corsOptions.origin = true; // Allow all other origins in development for simplicity
    }
  }
  
  callback(null, corsOptions);
}));

app.use(express.json({ limit: '10mb' }));
app.use(verifyUser);

// ── POST /api/auth/signup — Register new account ──
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await createUser(email, password, fullName || '');
    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      }
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create account' });
  }
});

// ── POST /api/auth/login — Login with email + password ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await authenticateUser(email, password);
    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

// ── GET /api/auth/me — Get current authenticated user ──
app.get('/api/auth/me', async (req, res) => {
  if (!req.userId || req.userId.startsWith('anon-')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const profile = await getNeonUserProfile(req.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: profile });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ── PUT /api/auth/profile — Update user profile ──
app.put('/api/auth/profile', async (req, res) => {
  if (!req.userId || req.userId.startsWith('anon-')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const updated = await updateNeonUserProfile(req.userId, req.body);
    res.json({ user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── GET /api/user/profile — Get user's connected store profiles & membership perks ──
app.get('/api/user/profile', async (req, res) => {
  try {
    const profile = await getNeonUserProfile(req.userId);
    res.json(profile || {
      userId: req.userId,
      pincode: '',
      lat: null,
      lng: null,
      memberships: {
        amazonPrime: false,
        flipkartPlus: false,
        zomatoGold: false,
        swiggyOne: false,
        blinkitPass: false
      },
      bankCards: [],
      wishlistUrls: {},
      dietaryPreference: 'any'
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ── POST /api/user/profile — Save/update user's connected store profiles & membership perks ──
app.post('/api/user/profile', requireAuth, async (req, res) => {
  const { pincode, lat, lng, memberships, bankCards, wishlistUrls, dietaryPreference } = req.body;
  try {
    await updateNeonUserProfile(req.userId, {
      pincode: pincode || '',
      lat: lat || null,
      lng: lng || null,
      memberships: memberships || {},
      bankCards: bankCards || [],
      wishlistUrls: wishlistUrls || {},
      dietaryPreference: dietaryPreference || 'any'
    });
    const updated = await getNeonUserProfile(req.userId);
    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error('Error saving user profile:', err);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
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
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
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
      console.error('Google Autocomplete Proxy failed, falling back to OSM:', e.message || e);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const resOsm = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&countrycodes=in&format=json&addressdetails=1&limit=5`,
      { 
        headers: { 'User-Agent': 'Symbiote/1.0', 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(5000)
      }
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
    console.error('OSM Autocomplete failed:', e.message || e);
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
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
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
    console.error('Google Place details resolution failed:', e.message || e);
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
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
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
      console.error('Google Reverse Geocoding failed, falling back to OSM:', e.message || e);
    }
  }

  // Fallback to OSM Nominatim reverse geocode
  try {
    const resOsm = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { 
        headers: { 'User-Agent': 'Symbiote/1.0', 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(5000)
      }
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
    console.error('OSM Reverse Geocode failed:', e.message || e);
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

// -- GET /api/food/restaurants --
app.get('/api/food/restaurants', (req, res) => {
  const { lat, lng, city, locality, query, mode } = req.query;
  const location = { lat: parseFloat(lat), lng: parseFloat(lng), city, locality };
  const restaurants = getNearbyRestaurants(location, query, mode);
  res.json(restaurants);
});

// -- GET /api/food/menu --
app.get('/api/food/menu', (req, res) => {
  const { restaurantId, restaurantName } = req.query;
  const menu = getRestaurantMenu(restaurantId, restaurantName);
  res.json(menu);
});

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
    return res.json({ store, city, tier, available, reason: available ? null : `${store} does not deliver to ${city || 'this location'} yet` });
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
  const { query, category = 'electronics', location = 'Mumbai', profileUrls } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const comparison = await compareProductPrices(query.trim(), category, location, profileUrls);
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

    const SOLVE_TIMEOUT_MS = 2000;
    const solveStartTime = Date.now();

    function solve(itemIdx, currentItemCost, usedStoresSet, currentAssignments) {
      if (Date.now() - solveStartTime > SOLVE_TIMEOUT_MS) return; // Bail out to prevent server hang
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

    const isQuickCommerce = category === 'quickcommerce' || category === 'grocery';
    const isFood = category === 'food';

    if (!isQuickCommerce && !isFood) {
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

      // Fast synchronous pre-filtering: only simulate stores that sell the query
      const eligibleStores = simulatedEcommerceStores.filter(store => 
        matchesSource(store) && doesStoreSellQuery(store, query.trim())
      );

      // Quality Safeguard: Rank eligible stores by relevance/niche suitability
      // Brand stores matching query and major marketplaces are prioritized first
      const queryLower = query.trim().toLowerCase();
      const detectedQueryBrands = detectBrands(queryLower).map(b => b.key);
      
      const rankedEligibleStores = [...eligibleStores].sort((a, b) => {
        const aIsBrand = detectedQueryBrands.includes(a);
        const bIsBrand = detectedQueryBrands.includes(b);
        if (aIsBrand && !bIsBrand) return -1;
        if (!aIsBrand && bIsBrand) return 1;

        const generalPriority = ['amazon', 'meesho', 'myntra', 'croma', 'reliance', 'tatacliq', 'nykaa', 'shopsy'];
        const aIsGeneral = generalPriority.includes(a);
        const bIsGeneral = generalPriority.includes(b);
        if (aIsGeneral && !bIsGeneral) return -1;
        if (!aIsGeneral && bIsGeneral) return 1;

        return 0;
      });

      // Target initial batch of up to 25 highest-value eligible stores
      const initialTargetStores = isSingleRequest ? rankedEligibleStores : rankedEligibleStores.slice(0, 25);

      for (const store of initialTargetStores) {
        if (isSingleRequest) {
          await new Promise(r => setTimeout(r, 200));
        }
        const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
        products = [...products, ...storeProducts];
      }

      // Controlled expansion: If initial yield is low (< 15 items) and more eligible stores exist, expand to remaining eligible stores
      if (!isSingleRequest && products.length < 15 && rankedEligibleStores.length > 25) {
        const expansionStores = rankedEligibleStores.slice(25, 45);
        for (const store of expansionStores) {
          const storeProducts = simulateStoreSearch(query.trim(), store, pageCount, location);
          products = [...products, ...storeProducts];
        }
      }
    } else if (isFood) {
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

    // Apply deterministic relevance scoring, cross-category noise rejection, and ranking
    const { products: uniqueProducts } = filterAndRankProducts(query.trim(), products, {
      threshold: 0.30,
      logAll: process.env.NODE_ENV !== 'production'
    });

    // Find bestPriceDeal from validated relevant products
    let bestPriceDeal = null;
    let lowestPrice = Infinity;

    for (const p of uniqueProducts) {
      if (p.price && p.price > 0 && p.price < lowestPrice) {
        lowestPrice = p.price;
        bestPriceDeal = p;
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
    const products = await getProducts(req.userId);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── POST /api/products — Save scraped products (batch) ──
app.post('/api/products', async (req, res) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products array is required' });
  }

  try {
    // Generate deterministic stable IDs for products to prevent duplicate rows per user
    const preparedProducts = products.map(p => {
      let stableId = p.id;
      if (!stableId || stableId.startsWith('prod-') || stableId.startsWith('comp-') || /-\d{13}-/.test(stableId)) {
        const store = p.source || p.store || 'retailer';
        const urlOrTitle = (p.productUrl || p.productLink || p.name || p.title || '').trim().toLowerCase();
        const hash = crypto.createHash('sha256').update(`${store}:${urlOrTitle}`).digest('hex').substring(0, 20);
        stableId = `p-${store}-${hash}`;
      }
      return {
        ...p,
        id: stableId
      };
    });

    await saveProducts(preparedProducts, req.userId);
    
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
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  const { product } = req.body;
  if (!product || !product.productLink || !product.price) {
    return res.status(400).json({ error: 'Valid product object is required' });
  }

  try {
    // Generate a stable ID based on clean URL to prevent duplicates
    const cleanUrl = product.productLink.split('?')[0];
    const productId = `ext-${crypto.createHash('sha256').update(cleanUrl).digest('hex').substring(0, 24)}`;
    
    const preparedProduct = {
      ...product,
      id: productId,
      query: product.searchQuery || product.name.substring(0, 30),
      category: 'extension',
    };

    await saveProducts([preparedProduct], req.userId);

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
    const history = await getProductHistory(id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch product history' });
  }
});

// ── PUT /api/products/:id/alert — Update target alert price ──
app.put('/api/products/:id/alert', async (req, res) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  const { id } = req.params;
  const { targetPrice } = req.body;

  try {
    await updateTargetPrice(id, targetPrice ? parseFloat(targetPrice) : null, req.userId);
    res.json({ message: 'Target price updated successfully', targetPrice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// ── DELETE /api/products/:id — Delete a saved product ──
app.delete('/api/products/:id', async (req, res) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  const { id } = req.params;
  try {
    await deleteProduct(id, req.userId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ── DELETE /api/products — Clear all saved products ──
app.delete('/api/products', async (req, res) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  try {
    await clearAllProducts(req.userId);
    res.json({ message: 'All products cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear products' });
  }
});

// ── GET /api/analytics — Product analytics ──
app.get('/api/analytics', async (req, res) => {
  let products = await getProducts(req.userId);
  const { product, platform } = req.query;

  if (product && product.trim() !== '') {
    const searchLower = product.trim().toLowerCase();
    products = products.filter(p => p.name?.toLowerCase().includes(searchLower));
  }

  if (platform && platform.trim() !== '' && platform.toLowerCase() !== 'all') {
    const platformLower = platform.trim().toLowerCase();
    products = products.filter(p => p.store?.toLowerCase() === platformLower);
  }

  const analytics = computeProductAnalytics(products);
  res.json(analytics);
});

// ── GET /api/export/csv — Export saved products as CSV ──
app.get('/api/export/csv', async (req, res) => {
  const products = await getProducts(req.userId);
  
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
  const products = await getProducts(req.userId);
  
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
app.get('/api/health/scrapers', async (req, res) => {
  try {
    const health = await getAllScraperHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scraper health' });
  }
});

// Check if a resolved IP is a private, loopback, or link-local address
function isPrivateIp(ip) {
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (ip === '0.0.0.0') return true;
    return false;
  }
  if (isIP(ip) === 6) {
    const canonical = ip.toLowerCase();
    if (canonical === '::1' || canonical === '0:0:0:0:0:0:0:1') return true;
    if (canonical === '::' || canonical === '0:0:0:0:0:0:0:0') return true;
    if (canonical.startsWith('fc') || canonical.startsWith('fd')) return true;
    if (canonical.startsWith('fe8') || canonical.startsWith('fe9') || canonical.startsWith('fea') || canonical.startsWith('feb')) return true;
    return false;
  }
  return true;
}

// Strictly validate URL hostname and resolve DNS to prevent SSRF
async function validateUrlForProxy(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Invalid protocol' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { valid: false, reason: 'Localhost not allowed' };
    }

    const whitelist = [
      'unsplash.com',
      'flixcart.com',
      'sdlcdn.com'
    ];

    const isWhitelisted = whitelist.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isWhitelisted) {
      return { valid: false, reason: 'Domain not whitelisted' };
    }

    let ips = [];
    try {
      const lookupResult = await dns.lookup(hostname, { all: true });
      ips = lookupResult.map(r => r.address);
    } catch (dnsErr) {
      return { valid: false, reason: 'DNS resolution failed' };
    }

    if (ips.length === 0) {
      return { valid: false, reason: 'No IP addresses found' };
    }

    const hasPrivateIp = ips.some(isPrivateIp);
    if (hasPrivateIp) {
      return { valid: false, reason: 'Private IP address detected' };
    }

    return { valid: true, url: parsed.toString() };
  } catch (e) {
    return { valid: false, reason: 'Malformed URL' };
  }
}

// Helper to safely fetch an image, enforce redirects re-validation, max size limit and content-type validation
async function safeDownloadImage(urlStr) {
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  let currentUrl = urlStr;
  let redirectCount = 0;
  const maxRedirects = 3;

  while (redirectCount <= maxRedirects) {
    const check = await validateUrlForProxy(currentUrl);
    if (!check.valid) {
      throw new Error(`SSRF Blocked: ${check.reason}`);
    }

    const response = await axios.get(check.url, {
      responseType: 'stream',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 6000,
      maxRedirects: 0,
      validateStatus: (status) => (status >= 200 && status < 400)
    });

    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.location;
      if (!redirectUrl) {
        throw new Error('Redirect header missing Location');
      }
      currentUrl = new URL(redirectUrl, currentUrl).toString();
      redirectCount++;
      continue;
    }

    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
      throw new Error('Invalid content-type: not an image');
    }

    return new Promise((resolve, reject) => {
      let totalBytes = 0;
      const chunks = [];

      response.data.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxSizeBytes) {
          response.data.destroy();
          reject(new Error('Response size limit exceeded'));
        } else {
          chunks.push(chunk);
        }
      });

      response.data.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: contentType
        });
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  }

  throw new Error('Too many redirects');
}

// ── GET /api/proxy-image — Proxy product images to bypass WAF/Hotlinking blocks ──
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
      return res.redirect(decodedUrl);
    }

    const result = await safeDownloadImage(decodedUrl);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);
  } catch (error) {
    console.error(`Image proxy failed for ${url}:`, error.message);
    res.status(400).json({ error: 'Invalid or unreachable image resource' });
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
app.post('/api/chat', async (req, res) => {
  const { message, sessionId, currentPage } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId are required' });
  }

  try {
    // Save user message
    await saveChatMessage({ sessionId, role: 'user', content: message, userId: req.userId });

    // Generate AI response
    const result = generateResponse(message, sessionId, currentPage);

    // Save assistant response
    await saveChatMessage({ sessionId, role: 'assistant', content: result.reply, userId: req.userId });

    // If feedback was collected, save it
    if (result.feedbackSaved) {
      await saveFeedback({ ...result.feedbackSaved, userId: req.userId });
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
app.post('/api/feedback', async (req, res) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'Authentication token or valid X-Anonymous-Session header required' });
  }

  const { category, message, rating, page } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Feedback message is required' });
  }

  try {
    await saveFeedback({ category, message, rating, page, userId: req.userId });
    res.json({ success: true, message: 'Feedback saved successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// ── GET /api/feedback — Retrieve all feedback ──
app.get('/api/feedback', async (req, res) => {
  try {
    const feedback = await getFeedback(req.userId);
    res.json(feedback);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ── GET /api/chat/history/:sessionId — Retrieve chat history ──
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const history = await getChatHistory(req.params.sessionId, req.userId);
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
app.post('/api/order/credentials', requireAuth, async (req, res) => {
  const { platform, username, password } = req.body;
  if (!platform || !username || !password) {
    return res.status(400).json({ error: 'platform, username, and password are required' });
  }
  try {
    await saveCredentials(req.userId, platform, username, password);
    res.json({ success: true, message: `Credentials saved for ${platform}` });
  } catch (e) {
    console.error('[OrderRelay API] Failed to save credentials:', e.message);
    res.status(500).json({ error: 'Unable to save credentials' });
  }
});

// GET /api/order/credentials -- List saved platforms (no passwords returned)
app.get('/api/order/credentials', requireAuth, async (req, res) => {
  try {
    const creds = await listCredentials(req.userId);
    res.json(creds);
  } catch (e) {
    console.error('[OrderRelay API] Failed to list credentials:', e.message);
    res.status(500).json({ error: 'Unable to retrieve credentials' });
  }
});

// DELETE /api/order/credentials/:platform -- Remove credentials
app.delete('/api/order/credentials/:platform', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteCredentials(req.userId, req.params.platform);
    res.json({ success: deleted });
  } catch (e) {
    console.error('[OrderRelay API] Failed to delete credentials:', e.message);
    res.status(500).json({ error: 'Unable to delete credentials' });
  }
});

// POST /api/order/initiate -- Start order automation session
app.post('/api/order/initiate', requireAuth, async (req, res) => {
  const { store, productUrl, productName, deliveryAddress } = req.body;
  if (!store || !productUrl) {
    return res.status(400).json({ error: 'store and productUrl are required' });
  }
  try {
    const creds = await getCredentials(req.userId, store);
    if (!creds) {
      return res.status(400).json({ error: `No saved credentials for ${store}. Please add credentials first via POST /api/order/credentials` });
    }
    const result = await launchOrderSession({
      store,
      credentials: creds,
      productUrl,
      productName,
      deliveryAddress,
      userId: req.userId
    });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (e) {
    if (e.statusCode === 429 || e.code === 'QUEUE_FULL' || e.message === 'Order automation queue is currently full') {
      return res.status(429).json({ error: 'Order automation queue is currently full' });
    }
    console.error('[OrderRelay API] Failed to launch order session:', e.message);
    res.status(500).json({ error: 'Failed to launch session' });
  }
});

// GET /api/order/screenshot/:sessionId -- Get latest browser screenshot
app.get('/api/order/screenshot/:sessionId', requireAuth, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  const b64 = await takeScreenshot(req.params.sessionId);
  if (!b64) return res.status(500).json({ error: 'Screenshot not available' });
  res.json({ screenshotBase64: b64, status: session.status, history: session.history });
});

// POST /api/order/confirm/:sessionId -- User confirms -> system places order
app.post('/api/order/confirm/:sessionId', requireAuth, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  if (session.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  if (session.status !== 'awaiting_payment') return res.status(400).json({ error: `Session is in state '${session.status}', not 'awaiting_payment'` });
  try {
    const result = await confirmOrder(req.params.sessionId, session);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to confirm order: ' + e.message });
  }
});

// GET /api/order/sessions -- List all active sessions for user
app.get('/api/order/sessions', requireAuth, (req, res) => {
  res.json(listSessions(req.userId));
});

export default app;
