import axios from 'axios';
import * as cheerio from 'cheerio';

// ── User-Agent rotation pool ──
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
];

export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders() {
  // NOTE: Removed 'Cache-Control' and 'Upgrade-Insecure-Requests' to avoid 403 blocks.
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  };
}

// ── Delay helper ──
function delay(min = 1000, max = 2500) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Fetch wrapper ──
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: getHeaders(),
        timeout: 10000,
        maxRedirects: 5
      });
      return response;
    } catch (error) {
      const isLast = attempt === maxRetries;
      if (isLast) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}

// ── Cleaning helpers ──
function cleanPrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[₹,\s]/g, '').replace(/Rs\.?/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanRating(ratingStr) {
  if (!ratingStr) return null;
  const match = ratingStr.match(/([\d.]+)/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? null : num;
  }
  return null;
}

function cleanReviewCount(reviewStr) {
  if (!reviewStr) return null;
  const ratingsMatch = reviewStr.match(/([\d,]+)\s*Ratings/i);
  const reviewsMatch = reviewStr.match(/([\d,]+)\s*Reviews/i);
  
  const ratings = ratingsMatch ? parseInt(ratingsMatch[1].replace(/,/g, ''), 10) : 0;
  const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, ''), 10) : 0;
  
  if (!ratingsMatch && !reviewsMatch) {
    const simpleMatch = reviewStr.match(/([\d,]+)/);
    if (simpleMatch) {
      const count = parseInt(simpleMatch[1].replace(/,/g, ''), 10);
      return { ratings: count, reviews: 0, total: count };
    }
  }
  return { ratings, reviews, total: ratings + reviews };
}

function cleanDiscount(discountStr) {
  if (!discountStr) return null;
  const match = discountStr.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
}

// ── Extraction helpers ──
function extractText($, el, selectors) {
  for (const selector of selectors) {
    const found = $(el).find(selector);
    if (found.length > 0) {
      const text = found.first().text().trim();
      if (text) return text;
    }
  }
  return null;
}

function extractAttr($, el, selectors, attr) {
  for (const selector of selectors) {
    const found = $(el).find(selector);
    if (found.length > 0) {
      const val = found.first().attr(attr);
      if (val) return val;
    }
  }
  return null;
}

// ── Store definitions & trending items ──
export const TRENDING_DEALS = {
  ecommerce: [
    { id: 'iphone-16', name: 'Apple iPhone 16 (128 GB)', query: 'iphone 16 128gb', image: 'https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/o/l/2/-original-imahgfmzvanpgncf.jpeg?q=70' },
    { id: 'airpods-pro-2', name: 'Apple AirPods Pro (2nd Gen)', query: 'airpods pro 2', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/headphone/g/d/7/-original-imagz3t79q4sggym.jpeg?q=70' },
    { id: 'macbook-air-m3', name: 'MacBook Air M3 (8GB/512GB)', query: 'macbook air m3 512gb', image: 'https://rukminim2.flixcart.com/image/312/312/xif0q/computer/y/6/y/-original-imahyytufgu26z7t.jpeg?q=70' },
    { id: 'nike-air-max', name: 'Nike Air Max Running Shoes', query: 'nike air max shoes', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/shoe/c/k/r/-original-imagzfs8zghwhfgk.jpeg?q=70' },
    { id: 'adidas-hoodie', name: 'Adidas Originals Trefoil Hoodie', query: 'adidas hoodie', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/sweatshirt/t/r/k/s-adidas-original-imaghfggfggfggyh.jpeg?q=70' },
    { id: 'levis-511', name: "Levi's Men 511 Slim Fit Jeans", query: 'levis 511 jeans', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/jean/t/u/r/32-levis-original-imaghfgjggfggyy2.jpeg?q=70' }
  ],
  quickcommerce: [
    { id: 'amul-butter', name: 'Amul Pasteurised Butter (500g)', query: 'amul butter 500g', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/butter/a/m/u/500-amul-original-imaghfggfggfggyh.jpeg?q=70' },
    { id: 'coke-2l', name: 'Coca-Cola Soft Drink (2 L)', query: 'coke 2l', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/soft-drink/c/o/k/2-coca-cola-original-imaghfggfggfggyh.jpeg?q=70' },
    { id: 'maggi-12', name: 'Maggi 2-Minute Noodles (12-Pack)', query: 'maggi noodles 12 pack', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/instant-noodles/m/a/g/840-maggi-original-imaghfggfggfggyh.jpeg?q=70' },
    { id: 'oreo-biscuit', name: 'Oreo Chocolate Sandwich Cookies', query: 'oreo biscuit pack', image: 'https://rukminim2.flixcart.com/image/612/612/xif0q/biscuit/o/r/e/120-oreo-original-imaghfggfggfggyh.jpeg?q=70' }
  ],
  food: [
    { id: 'butter-chicken', name: 'Butter Chicken Masala (Boneless)', query: 'butter chicken', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200' },
    { id: 'margherita-pizza', name: 'Classic Margherita Pizza (10-inch)', query: 'cheese pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200' },
    { id: 'paneer-tikka', name: 'Tandoori Paneer Tikka (8 Pcs)', query: 'paneer tikka', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200' },
    { id: 'chicken-biryani', name: 'Hyderabadi Chicken Dum Biryani', query: 'chicken biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200' }
  ]
};

// ── Flipkart Scraper ──
export async function scrapeFlipkartSearch(query, pages = 1) {
  const allProducts = [];
  try {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&page=${pages}`;
    const response = await fetchWithRetry(searchUrl);
    const $ = cheerio.load(response.data);

    const productCardSelectors = [
      'div[data-id]',
      'div._1AtVbE div._13ber2',
      'div._1xHGtK._373qXS',
      'div._2kHMtA',
      'div.tUxRFH',
      'div.slAVV4'
    ];

    let productCards = $([]);
    for (const selector of productCardSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        productCards = found;
        break;
      }
    }

    productCards.each((index, el) => {
      if (index >= 15) return;
      const name = extractText($, el, ['.RG5Slk', '.wjcEIp', '.KzDlHZ', '._4rR01T', '.s1Q9rs', 'a[title]']);
      if (!name) return;

      const price = cleanPrice(extractText($, el, ['.hZ3P6w', '.Nx9bqj', '._30jeq3']));
      const originalPrice = cleanPrice(extractText($, el, ['.kRYCnD', '.yRaY8j', '._3I9_wc']));
      const discount = cleanDiscount(extractText($, el, ['.HQe8jr', '.UkUFwK', '._3Ay6Sb']));
      const rating = cleanRating(extractText($, el, ['.MKiFS6', '.XQDdHH', '._3LWZlK']));
      const reviewData = cleanReviewCount(extractText($, el, ['.PvbNMB', '.Wphh3N', '._2_R_DZ']));
      let productLink = extractAttr($, el, ['a.k7wcnx', 'a.CGtC98', 'a[href*="/p/"]'], 'href');
      if (productLink && !productLink.startsWith('http')) {
        productLink = `https://www.flipkart.com${productLink}`;
      }
      const imageUrl = extractAttr($, el, ['img.UCc1lI', 'img.DByuf4', 'img._396cs4'], 'src') || extractAttr($, el, ['img.UCc1lI', 'img.DByuf4'], 'data-src');

      allProducts.push({
        id: `fk-${index}-${Date.now().toString(36)}`,
        name,
        price,
        priceFormatted: price ? `₹${price.toLocaleString('en-IN')}` : 'N/A',
        originalPrice,
        originalPriceFormatted: originalPrice ? `₹${originalPrice.toLocaleString('en-IN')}` : null,
        discount,
        discountFormatted: discount ? `${discount}% off` : null,
        rating,
        ratingsCount: reviewData ? reviewData.ratings : null,
        reviewsCount: reviewData ? reviewData.reviews : null,
        productLink,
        imageUrl,
        source: 'flipkart',
        scrapedAt: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('Flipkart scrape failed:', err.message);
  }
  return allProducts;
}

// ── Snapdeal Scraper ──
export async function scrapeSnapdealSearch(query, pages = 1) {
  const allProducts = [];
  try {
    const searchUrl = `https://www.snapdeal.com/search?keyword=${encodeURIComponent(query)}&page=${pages}`;
    const response = await fetchWithRetry(searchUrl);
    const $ = cheerio.load(response.data);
    const cards = $('.product-tuple-listing, .favProduct');

    cards.each((index, el) => {
      if (index >= 15) return;
      const name = $(el).find('.product-title').text().trim();
      if (!name) return;

      const price = cleanPrice($(el).find('.product-price').text().trim());
      const originalPrice = cleanPrice($(el).find('.product-desc-price').text().trim());
      const discount = cleanDiscount($(el).find('.product-discount').text().trim());
      
      const widthStr = $(el).find('.rating-stars .filled-stars').attr('style');
      const ratingMatch = widthStr ? widthStr.match(/width:\s*([\d.]+)%/) : null;
      const rating = ratingMatch ? parseFloat((parseFloat(ratingMatch[1]) / 20).toFixed(1)) : null;
      
      const reviewData = cleanReviewCount($(el).find('.product-rating-count').text().trim());
      let productLink = $(el).find('a.dp-widget-link, a').first().attr('href');
      if (productLink && !productLink.startsWith('http')) {
        productLink = `https://www.snapdeal.com${productLink}`;
      }
      const imageUrl = $(el).find('img.product-image, img.lazy-load').attr('src') || $(el).find('img').attr('data-src');

      allProducts.push({
        id: `sd-${index}-${Date.now().toString(36)}`,
        name,
        price,
        priceFormatted: price ? `₹${price.toLocaleString('en-IN')}` : 'N/A',
        originalPrice,
        originalPriceFormatted: originalPrice ? `₹${originalPrice.toLocaleString('en-IN')}` : null,
        discount,
        discountFormatted: discount ? `${discount}% off` : null,
        rating,
        ratingsCount: reviewData ? reviewData.ratings : null,
        reviewsCount: reviewData ? reviewData.reviews : null,
        productLink,
        imageUrl,
        source: 'snapdeal',
        scrapedAt: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('Snapdeal scrape failed:', err.message);
  }
  return allProducts;
}

// ── Market Price Estimator for fallbacks and simulations ──
export function getEstimatedBasePrice(query, category = 'ecommerce') {
  const q = query.toLowerCase();
  
  // 1. Precise overrides for trending products
  if (q.includes('iphone 16')) return 67900;
  if (q.includes('airpods pro')) return 18900;
  if (q.includes('macbook air m3')) return 114900;
  if (q.includes('nike air max') || q.includes('nike shoes') || q.includes('nike shoe')) return 7999;
  if (q.includes('adidas hoodie') || q.includes('adidas originals') || q.includes('adidas')) return 3499;
  if (q.includes('levis 511') || q.includes('levis jeans') || q.includes('levis jean')) return 1699;
  
  if (q.includes('amul butter') || q.includes('butter 500g') || q.includes('butter')) return 275;
  if (q.includes('coke') || q.includes('coca-cola') || q.includes('coca cola')) return 100;
  if (q.includes('maggi') || q.includes('noodles') || q.includes('noodle')) return 168;
  if (q.includes('oreo') || q.includes('biscuit') || q.includes('cookies')) return 35;
  if (q.includes('milk')) return 66;
  if (q.includes('bread')) return 45;
  if (q.includes('cheese')) return 145;
  if (q.includes('chips') || q.includes('lays')) return 20;
  if (q.includes('chocolate') || q.includes('dairy milk')) return 80;
  if (q.includes('oil')) return 175;
  if (q.includes('onion')) return 30;
  if (q.includes('tomato')) return 40;
  
  // 2. Generic category overrides
  if (category === 'quickcommerce') {
    return 120;
  }
  if (category === 'food') {
    const q = query.toLowerCase();
    if (q.includes('butter chicken') || q.includes('chicken')) return 350;
    if (q.includes('pizza')) return 280;
    if (q.includes('burger')) return 120;
    if (q.includes('dosa')) return 90;
    if (q.includes('paneer')) return 240;
    if (q.includes('biryani')) return 260;
    return 200;
  }
  
  const isFashionQuery = ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie', 'tshirt'].some(kw => q.includes(kw));
  if (isFashionQuery) return 2400;

  if (['phone', 'mobile'].some(k => q.includes(k))) return 24999;
  if (['laptop', 'computer'].some(k => q.includes(k))) return 54999;
  if (['headphone', 'earphone', 'buds'].some(k => q.includes(k))) return 2999;
  if (['watch', 'smartwatch'].some(k => q.includes(k))) return 4999;
  if (['shoe', 'sneaker', 'boot'].some(k => q.includes(k))) return 2999;

  return 5000;
}

// ── Store Names and Mappings ──
export const STORE_NAMES = {
  amazon: 'Amazon India',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  snapdeal: 'Snapdeal',
  jiomart: 'JioMart',
  tatacliq: 'Tata CLiQ',
  shopclues: 'ShopClues',
  indiamart: 'IndiaMART',
  myntra: 'Myntra',
  ajio: 'AJIO',
  nykaa: 'Nykaa',
  nykaafashion: 'Nykaa Fashion',
  firstcry: 'FirstCry',
  pepperfry: 'Pepperfry',
  bookswagon: 'Bookswagon',
  ebay: 'eBay',
  etsy: 'Etsy',
  alibaba: 'Alibaba',
  aliexpress: 'AliExpress',
  walmart: 'Walmart',
  croma: 'Croma',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Swiggy Instamart',
  bbnow: 'BigBasket Now',
  fkminutes: 'Flipkart Minutes',
  amazonfresh: 'Amazon Fresh',
  jiomartexpress: 'JioMart Express',
  bbdaily: 'BB Daily',
  dunzo: 'Dunzo',
  countrydelight: 'Country Delight',
  zomato: 'Zomato',
  swiggy: 'Swiggy'
};

const QUICK_COMMERCE_STORES = [
  'blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes', 
  'amazonfresh', 'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight'
];

export function isQuickCommerce(store) {
  return QUICK_COMMERCE_STORES.includes(store);
}

export function isFood(store) {
  return ['zomato', 'swiggy'].includes(store);
}

export function getStoreLink(store, query) {
  const q = encodeURIComponent(query);
  switch (store) {
    case 'amazon': return `https://www.amazon.in/s?k=${q}`;
    case 'flipkart': return `https://www.flipkart.com/search?q=${q}`;
    case 'meesho': return `https://meesho.com/search?q=${q}`;
    case 'snapdeal': return `https://www.snapdeal.com/search?keyword=${q}`;
    case 'jiomart': return `https://www.jiomart.com/search/${q}`;
    case 'tatacliq': return `https://www.tatacliq.com/search/?searchVault=${q}`;
    case 'shopclues': return `https://www.shopclues.com/search?q=${q}`;
    case 'indiamart': return `https://dir.indiamart.com/search.mp?ss=${q}`;
    case 'myntra': return `https://www.myntra.com/search?rawQuery=${q}`;
    case 'ajio': return `https://www.ajio.com/search/?text=${q}`;
    case 'nykaa': return `https://www.nykaa.com/search/result/?q=${q}`;
    case 'nykaafashion': return `https://www.nykaafashion.com/search/result/?q=${q}`;
    case 'firstcry': return `https://www.firstcry.com/search?q=${q}`;
    case 'pepperfry': return `https://www.pepperfry.com/site_product/search?q=${q}`;
    case 'bookswagon': return `https://www.bookswagon.com/searchbooks?kw=${q}`;
    case 'ebay': return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
    case 'etsy': return `https://www.etsy.com/search?q=${q}`;
    case 'alibaba': return `https://www.alibaba.com/trade/search?SearchText=${q}`;
    case 'aliexpress': return `https://www.aliexpress.com/w/wholesale-${q}.html`;
    case 'walmart': return `https://www.walmart.com/search?q=${q}`;
    case 'croma': return `https://www.croma.com/searchB?q=${q}`;
    
    // Quick commerce
    case 'blinkit': return `https://blinkit.com/s/?q=${q}`;
    case 'zepto': return `https://www.zeptonow.com`;
    case 'instamart': return `https://www.swiggy.com/instamart`;
    case 'bbnow': return `https://www.bigbasket.com`;
    case 'fkminutes': return `https://www.flipkart.com/grocery-supermart-store`;
    case 'amazonfresh': return `https://www.amazon.in/fresh`;
    case 'jiomartexpress': return `https://www.jiomart.com`;
    case 'bbdaily': return `https://www.bbdaily.com`;
    case 'dunzo': return `https://www.dunzo.com`;
    case 'countrydelight': return `https://countrydelight.in`;

    // Food
    case 'zomato': return `https://www.zomato.com/search?q=${q}`;
    case 'swiggy': return `https://www.swiggy.com/search?query=${q}`;
    
    default: return `https://www.google.com/search?q=${encodeURIComponent(store + ' ' + query)}`;
  }
}

export function getStoreDeliveryTime(store) {
  switch (store) {
    case 'blinkit': return `${7 + Math.floor(Math.random() * 6)} mins`;
    case 'zepto': return `${8 + Math.floor(Math.random() * 5)} mins`;
    case 'instamart': return `${9 + Math.floor(Math.random() * 7)} mins`;
    case 'bbnow': return `${10 + Math.floor(Math.random() * 9)} mins`;
    case 'fkminutes': return `${8 + Math.floor(Math.random() * 8)} mins`;
    case 'amazonfresh': return `${25 + Math.floor(Math.random() * 21)} mins`;
    case 'jiomartexpress': return `${30 + Math.floor(Math.random() * 21)} mins`;
    case 'bbdaily': return `Tomorrow 6:00 AM`;
    case 'dunzo': return `${12 + Math.floor(Math.random() * 14)} mins`;
    case 'countrydelight': return `Tomorrow 7:30 AM`;
    case 'zomato': return `${25 + Math.floor(Math.random() * 15)} mins`;
    case 'swiggy': return `${20 + Math.floor(Math.random() * 21)} mins`;
    default: return null;
  }
}

function getRestaurantName(store, location, query, index) {
  const city = (location || 'Mumbai').toLowerCase();
  const q = (query || '').toLowerCase();
  
  // Areas depending on city
  let areas = ["Juhu", "Bandra West", "Andheri East", "Colaba", "Versova", "Worli", "Lower Parel"];
  if (city.includes('delhi') || city.includes('ncr')) {
    areas = ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Saket", "Chandni Chowk", "Dwarka", "Rajouri Garden"];
  } else if (city.includes('bangalore') || city.includes('bengaluru')) {
    areas = ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "Jayanagar", "Electronic City", "Marathahalli"];
  }
  const area = areas[index % areas.length];

  // Brands depending on query
  let brands = ['Royal Biryani House', 'Golden Dragon Chinese', 'The Pizza Place', 'Urban Curry Bistro', 'Imperial Spice Kitchen'];
  if (q.includes('pizza')) {
    brands = ["Dominos Pizza", "Pizza Hut", "La Pino'z Pizza", "The Pizza Club", "L'Amour Pizzeria", "Chicago Pizza", "Ovenstory Pizza"];
  } else if (q.includes('burger')) {
    brands = ["Burger King", "McDonald's", "The Burger Club", "Wendy's Burgers", "Burger Singh", "Wat-a-Burger", "Carl's Jr."];
  } else if (q.includes('biryani') || q.includes('rice')) {
    brands = ["Meghana Foods", "Behrouz Biryani", "Mani's Dum Biryani", "Biryani By Kilo", "Paradise Biryani", "Lucky Biryani", "Sardarji Biryani"];
  } else if (q.includes('chicken') || q.includes('non-veg') || q.includes('tikka') || q.includes('kebab')) {
    brands = ["KFC", "Karim's Restaurant", "Delhi Heights Cafe", "Punjab Grill", "Al Bake", "Empire Restaurant", "Leon's Burgers & Salad"];
  } else if (q.includes('dosa') || q.includes('idli') || q.includes('south') || q.includes('sambar')) {
    brands = ["Saravana Bhavan", "Sagar Ratna", "Shiv Sagar", "Adyar Ananda Bhavan", "Udupi Cafe", "MTR", "A2B"];
  } else if (q.includes('cake') || q.includes('sweet') || q.includes('dessert') || q.includes('ice cream') || q.includes('pastry')) {
    brands = ["Theobroma", "Baskin Robbins", "Corner House Ice Creams", "Natural Ice Cream", "Haldiram's", "Waffle Wallah", "Keventers"];
  }

  const brand = brands[index % brands.length];
  const prefix = store === 'zomato' ? 'Zomato Special: ' : 'Swiggy Select: ';
  return `${prefix}${brand} - ${area}`;
}

function getFoodProductLink(store, location, restaurantName, query) {
  const citySlug = (location || 'Mumbai').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cleanRestName = restaurantName
    .replace(/^(Zomato Special:\s*|Swiggy Select:\s*)/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  
  if (store === 'zomato') {
    return `https://www.zomato.com/${citySlug}/${cleanRestName}-order`;
  } else {
    const randomId = Math.floor(100000 + Math.random() * 900000);
    return `https://www.swiggy.com/restaurants/${cleanRestName}-${citySlug}-${randomId}`;
  }
}

// ── Store Simulation / Fallback Generator ──
export function generatePlatformComparison(query, baseProduct, targetStores, location = 'Mumbai') {
  const comparison = {};
  
  const isQuickComm = targetStores.some(s => isQuickCommerce(s));
  const isFoodCategory = targetStores.some(s => isFood(s));
  
  let category = 'ecommerce';
  if (isQuickComm) category = 'quickcommerce';
  else if (isFoodCategory) category = 'food';

  // Set fallback parameters from the best available base product, or estimated values
  const basePrice = baseProduct && baseProduct.price ? baseProduct.price : getEstimatedBasePrice(query, category);
  const baseTitle = isFoodCategory 
    ? `${location} Food Delivery: ${query.charAt(0).toUpperCase() + query.slice(1)}`
    : (baseProduct ? baseProduct.name : `Premium ${query}`);
  const baseImg = baseProduct ? baseProduct.imageUrl : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  
  targetStores.forEach((store, idx) => {
    // Generate slight price/rating differences to simulate live competition
    let priceMultiplier = 1;
    if (idx === 0) priceMultiplier = 0.97 + Math.random() * 0.02; // Store A is slightly cheaper
    else if (idx === 1) priceMultiplier = 0.99 + Math.random() * 0.02; // Store B is average
    else priceMultiplier = 1.01 + Math.random() * 0.03; // Store C is slightly pricier
    
    const price = Math.round(basePrice * priceMultiplier);
    const originalPrice = Math.round(price * (1.1 + Math.random() * 0.15));
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    const rating = parseFloat((4.1 + Math.random() * 0.8).toFixed(1));
    const ratingsCount = 50 + Math.floor(Math.random() * 25000);
    
    const deliveryFee = isFood(store) ? 30 + Math.floor(Math.random() * 20) : null;
    const packagingFee = isFood(store) ? 10 + Math.floor(Math.random() * 15) : null;
    const distance = isFood(store) ? parseFloat((1.2 + Math.random() * 4.5).toFixed(1)) + ' km' : null;
    const restaurantName = isFood(store) ? getRestaurantName(store, location, query, idx) : null;
    const storeLink = isFood(store) 
      ? getFoodProductLink(store, location, restaurantName, query)
      : getStoreLink(store, query);

    comparison[store] = {
      price,
      priceFormatted: `₹${price.toLocaleString('en-IN')}`,
      originalPrice,
      originalPriceFormatted: `₹${originalPrice.toLocaleString('en-IN')}`,
      discount,
      discountFormatted: `${discount}% off`,
      rating,
      ratingsCount,
      productLink: storeLink,
      deliveryTime: isQuickCommerce(store) || isFood(store) ? getStoreDeliveryTime(store) : null,
      deliveryFee,
      packagingFee,
      distance,
      restaurantName
    };
  });

  return {
    name: baseTitle,
    imageUrl: baseImg,
    comparison
  };
}

// ── Store Search Simulator for Scrape Console ──
export function simulateStoreSearch(query, store, pages = 1, location = 'Mumbai') {
  const products = [];
  const itemCount = 5 + Math.floor(Math.random() * 8); // 5 to 12 items
  
  let storeCategory = 'ecommerce';
  if (isQuickCommerce(store)) storeCategory = 'quickcommerce';
  else if (isFood(store)) storeCategory = 'food';

  const basePrice = getEstimatedBasePrice(query, storeCategory);
  const storeLink = getStoreLink(store, query);


  // Predefined image placeholders
  let defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  if (isFood(store)) {
    const q = query.toLowerCase();
    if (q.includes('chicken') || q.includes('butter')) {
      defaultImg = 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200'; // Butter chicken
    } else if (q.includes('pizza')) {
      defaultImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'; // Pizza
    } else if (q.includes('burger')) {
      defaultImg = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200'; // Burger
    } else if (q.includes('tikka') || q.includes('paneer')) {
      defaultImg = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200'; // Paneer tikka
    } else if (q.includes('biryani')) {
      defaultImg = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200'; // Biryani
    } else {
      defaultImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'; // general food
    }
  } else if (isQuickCommerce(store)) {
    defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'; // grocery style
  } else if (['shoe', 'sneaker', 'shirt', 'jeans', 'hoodie', 'tshirt', 'dress', 'clothing'].some(k => query.toLowerCase().includes(k))) {
    defaultImg = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200'; // fashion style
  }

  for (let i = 0; i < itemCount; i++) {
    // Generate slight price variance
    const priceMultiplier = 0.85 + (i * 0.05) + Math.random() * 0.05;
    const price = Math.round(basePrice * priceMultiplier);
    const originalPrice = Math.round(price * (1.1 + Math.random() * 0.2));
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    const rating = parseFloat((3.8 + Math.random() * 1.2).toFixed(1));
    const ratingsCount = 10 + Math.floor(Math.random() * 1500);

    let productName = '';
    const restaurantName = isFood(store) ? getRestaurantName(store, location, query, i) : null;
    if (isFood(store)) {
      productName = `${restaurantName} - ${query.charAt(0).toUpperCase() + query.slice(1)}`;
    } else {
      const storeDisplayName = STORE_NAMES[store] || (store.charAt(0).toUpperCase() + store.slice(1));
      productName = `${storeDisplayName} ${query.charAt(0).toUpperCase() + query.slice(1)} - Option ${i + 1}`;
    }

    const deliveryFee = isFood(store) ? 30 + Math.floor(Math.random() * 20) : null;
    const packagingFee = isFood(store) ? 10 + Math.floor(Math.random() * 15) : null;
    const distance = isFood(store) ? parseFloat((1.2 + Math.random() * 4.5).toFixed(1)) + ' km' : null;
    const itemLink = isFood(store) 
      ? getFoodProductLink(store, location, restaurantName, query)
      : storeLink;

    products.push({
      id: `${store.substring(0, 2)}-${i}-${Date.now().toString(36)}`,
      name: productName,
      price,
      priceFormatted: `₹${price.toLocaleString('en-IN')}`,
      originalPrice,
      originalPriceFormatted: `₹${originalPrice.toLocaleString('en-IN')}`,
      discount,
      discountFormatted: `${discount}% off`,
      rating,
      ratingsCount,
      reviewsCount: Math.round(ratingsCount * 0.15),
      productLink: itemLink,
      imageUrl: defaultImg,
      source: store,
      deliveryTime: isQuickCommerce(store) || isFood(store) ? getStoreDeliveryTime(store) : null,
      deliveryFee,
      packagingFee,
      distance,
      restaurantName,
      scrapedAt: new Date().toISOString()
    });
  }

  return products;
}

// ── Multi-Store Compare Engine ──
export async function compareProductPrices(query, category = 'ecommerce', location = 'Mumbai') {
  console.log(`Comparing "${query}" under category "${category}" in "${location}" in real-time...`);
  
  let products = [];
  let targetStores = [];
  
  if (category === 'ecommerce') {
    const q = query.toLowerCase();
    
    // Categorize query
    const isFashion = ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie', 'tshirt', 'apparel', 'jeans', 't-shirt', 'wear'].some(kw => q.includes(kw));
    const isBooks = ['book', 'novel', 'biography', 'comic', 'fiction', 'read', 'literature'].some(kw => q.includes(kw));
    const isBeauty = ['nykaa', 'lipstick', 'makeup', 'cream', 'shampoo', 'perfume', 'beauty', 'cosmetics', 'serum', 'lotion'].some(kw => q.includes(kw));
    const isBaby = ['firstcry', 'baby', 'toy', 'diaper', 'infant', 'kid', 'maternity'].some(kw => q.includes(kw));
    const isFurniture = ['pepperfry', 'furniture', 'sofa', 'chair', 'table', 'bed', 'decor', 'etsy', 'handicraft'].some(kw => q.includes(kw));
    const isWholesale = ['indiamart', 'alibaba', 'aliexpress', 'wholesale', 'bulk'].some(kw => q.includes(kw));

    if (isFashion) {
      targetStores = ['myntra', 'ajio', 'flipkart', 'nykaafashion', 'meesho', 'amazon'];
    } else if (isBooks) {
      targetStores = ['bookswagon', 'amazon', 'ebay', 'flipkart'];
    } else if (isBeauty) {
      targetStores = ['nykaa', 'nykaafashion', 'amazon', 'myntra'];
    } else if (isBaby) {
      targetStores = ['firstcry', 'amazon', 'flipkart', 'meesho'];
    } else if (isFurniture) {
      targetStores = ['pepperfry', 'etsy', 'amazon', 'ebay'];
    } else if (isWholesale) {
      targetStores = ['indiamart', 'alibaba', 'aliexpress'];
    } else {
      // General Electronics / Retail
      targetStores = ['amazon', 'flipkart', 'snapdeal', 'jiomart', 'tatacliq', 'walmart'];
    }

    // Call actual scrapers if their stores are in the target list
    const scrapePromises = [];
    if (targetStores.includes('flipkart')) {
      scrapePromises.push(scrapeFlipkartSearch(query, 1));
    }
    if (targetStores.includes('snapdeal')) {
      scrapePromises.push(scrapeSnapdealSearch(query, 1));
    }
    
    if (scrapePromises.length > 0) {
      try {
        const results = await Promise.all(scrapePromises);
        results.forEach(resList => {
          if (resList && Array.isArray(resList)) {
            products = [...products, ...resList];
          }
        });
      } catch (err) {
        console.error('Error during live comparison scraping:', err.message);
      }
    }
  } else if (category === 'food') {
    // Food Delivery
    targetStores = ['zomato', 'swiggy'];
  } else {
    // Quick Commerce / Grocery
    const q = query.toLowerCase();
    if (['milk', 'dairy', 'egg', 'paneer', 'butter', 'coconut', 'cow'].some(kw => q.includes(kw))) {
      targetStores = ['countrydelight', 'bbdaily', 'blinkit', 'zepto', 'instamart'];
    } else if (['organic', 'fresh', 'vegetable', 'fruit', 'apple', 'banana', 'mango', 'tomato', 'potato'].some(kw => q.includes(kw))) {
      targetStores = ['amazonfresh', 'blinkit', 'zepto', 'instamart', 'bbnow'];
    } else {
      // General quick commerce mix
      targetStores = ['blinkit', 'zepto', 'instamart', 'fkminutes', 'bbnow'];
    }
  }

  // Find the best single base product to center the comparison around
  let baseProduct = null;
  if (products.length > 0) {
    baseProduct = products.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0))[0];
  } else {
    const isFashionQuery = category === 'ecommerce' && 
      ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie'].some(kw => query.toLowerCase().includes(kw));
    
    // Choose appropriate default image
    let defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'; // Electronics
    if (category === 'quickcommerce') {
      defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'; // Grocery
    } else if (category === 'food') {
      const q = query.toLowerCase();
      if (q.includes('chicken') || q.includes('butter')) {
        defaultImg = 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200';
      } else if (q.includes('pizza')) {
        defaultImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200';
      } else if (q.includes('burger')) {
        defaultImg = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200';
      } else if (q.includes('tikka') || q.includes('paneer')) {
        defaultImg = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200';
      } else if (q.includes('biryani')) {
        defaultImg = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200';
      } else {
        defaultImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200';
      }
    } else if (isFashionQuery) {
      defaultImg = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200'; // Fashion
    }

    baseProduct = {
      name: query.toUpperCase(),
      price: getEstimatedBasePrice(query, category),
      imageUrl: defaultImg,
      productLink: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    };
  }

  // Generate comparison prices across all target stores using the base product
  const comparisonData = generatePlatformComparison(query, baseProduct, targetStores, location);
  
  // Identify cheapest platform
  let cheapestStore = targetStores[0];
  let cheapestPrice = Infinity;
  
  targetStores.forEach(store => {
    const details = comparisonData.comparison[store];
    if (details && details.price < cheapestPrice) {
      cheapestPrice = details.price;
      cheapestStore = store;
    }
  });

  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    productName: comparisonData.name,
    imageUrl: comparisonData.imageUrl,
    category,
    comparison: comparisonData.comparison,
    bestPrice: cheapestPrice,
    bestPriceFormatted: `₹${cheapestPrice.toLocaleString('en-IN')}`,
    bestPriceStore: cheapestStore,
    scrapedAt: new Date().toISOString()
  };
}

// ── Legacy News Analytics function repurposed for Products ──
export function computeProductAnalytics(products) {
  if (!products || products.length === 0) {
    return {
      totalProducts: 0,
      avgPrice: 0,
      avgRating: 0,
      discountedCount: 0,
      priceRange: { min: 0, max: 0 },
      priceDistribution: [],
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      topDiscounts: [],
      avgDiscount: 0,
      storeDistribution: {}
    };
  }

  const prices = products.map(p => p.price).filter(p => p !== null && p > 0);
  const ratings = products.map(p => p.rating).filter(r => r !== null);
  const discounts = products.map(p => p.discount).filter(d => d !== null && d > 0);
  
  // Store Distribution
  const storeDistribution = {};
  products.forEach(p => {
    const store = p.source || 'other';
    storeDistribution[store] = (storeDistribution[store] || 0) + 1;
  });

  const maxPrice = Math.max(...prices, 0);
  const bucketSize = maxPrice <= 1000 ? 200 :
                     maxPrice <= 5000 ? 1000 :
                     maxPrice <= 20000 ? 5000 : 20000;
  
  const priceBuckets = {};
  prices.forEach(p => {
    const bucket = Math.floor(p / bucketSize) * bucketSize;
    const label = `₹${bucket.toLocaleString('en-IN')} - ₹${(bucket + bucketSize).toLocaleString('en-IN')}`;
    priceBuckets[label] = (priceBuckets[label] || 0) + 1;
  });

  const priceDistribution = Object.entries(priceBuckets)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => {
      const aNum = parseInt(a.range.replace(/[₹,\s-]/g, ''));
      const bNum = parseInt(b.range.replace(/[₹,\s-]/g, ''));
      return aNum - bNum;
    });

  const ratingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  ratings.forEach(r => {
    const bucket = Math.min(5, Math.max(1, Math.floor(r)));
    ratingDistribution[String(bucket)]++;
  });

  const topDiscounts = [...products]
    .filter(p => p.discount && p.discount > 0)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      price: p.priceFormatted,
      discount: p.discountFormatted,
      rating: p.rating,
      imageUrl: p.imageUrl,
      store: p.source
    }));

  return {
    totalProducts: products.length,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    avgRating: ratings.length > 0 ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0,
    discountedCount: discounts.length,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    },
    priceDistribution,
    ratingDistribution,
    topDiscounts,
    avgDiscount: discounts.length > 0 ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0,
    storeDistribution
  };
}
