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
  if (q.includes('iphone 16') || q.includes('apple watch') || q.includes('macbook')) return 67900;
  if (q.includes('airpods pro') || q.includes('headphone') || q.includes('earphone')) return 18900;
  if (q.includes('macbook air m3')) return 114900;
  if (q.includes('nike air max') || q.includes('nike shoes') || q.includes('nike shoe')) return 7999;
  if (q.includes('adidas hoodie') || q.includes('adidas originals') || q.includes('adidas')) return 3499;
  if (q.includes('levis 511') || q.includes('levis jeans') || q.includes('levis jean')) return 1699;
  if (q.includes('samsung s24') || q.includes('samsung ultra')) return 79999;
  if (q.includes('hp laptop') || q.includes('hp pavilion')) return 58999;
  if (q.includes('lenovo thinkpad') || q.includes('lenovo yoga')) return 62999;
  if (q.includes('lg tv') || q.includes('lg oled')) return 45999;
  if (q.includes('puma sneaker') || q.includes('puma running')) return 4499;
  if (q.includes('lenskart sunglasses') || q.includes('lenskart glasses')) return 1999;
  if (q.includes('zara jacket') || q.includes('zara dress')) return 3999;
  if (q.includes('tanishq gold') || q.includes('tanishq ring')) return 25000;
  
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
  
  const isFashionQuery = ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie', 'tshirt', 'apparel', 'perfume'].some(kw => q.includes(kw));
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
  ebay: 'eBay India',
  etsy: 'Etsy',
  alibaba: 'Alibaba',
  aliexpress: 'AliExpress',
  walmart: 'Walmart',
  croma: 'Croma',
  reliance: 'Reliance Digital',
  samsung: 'Samsung Store',
  vijaysales: 'Vijay Sales',
  hp: 'HP World',
  oneplus: 'OnePlus Store',
  lenovo: 'Lenovo Store',
  lg: 'LG Brand Store',
  dailyobjects: 'Daily Objects',
  headphones: 'Headphone Zone',
  apple: 'Apple Store',
  puma: 'Puma',
  lenskart: 'Lenskart',
  zara: 'Zara',
  tanishq: 'Tanishq',
  pantaloons: 'Pantaloons',
  adidas: 'Adidas Store',
  maxfashion: 'Max Fashion',
  bewakoof: 'Bewakoof',
  chumbak: 'Chumbak',
  joyalukkas: 'Joyalukkas',
  snitch: 'Snitch',
  cultstore: 'Cultsport',
  vishalmegamart: 'Vishal Mega Mart',

  // General E-Commerce
  shopsy: 'Shopsy',
  paytmmall: 'Paytm Mall',
  dealshare: 'DealShare',
  citymall: 'CityMall',
  udaan: 'Udaan',
  ondc: 'ONDC',

  // Fashion & Lifestyle Marketplaces
  tatacliq_luxury: 'Tata CLiQ Luxury',
  nnnow: 'Nnnow',
  lifestylestores: 'Lifestyle Stores',
  shoppersstop: 'Shoppers Stop',
  westside: 'Westside',
  zudio: 'Zudio',
  azorte: 'Azorte',
  reliancetrends: 'Reliance Trends',
  yousta: 'Yousta',
  centro: 'Centro',

  // D2C Fashion & Apparel
  souledstore: 'The Souled Store',
  rarerabbit: 'Rare Rabbit',
  bombayshirt: 'Bombay Shirt Company',
  powerlook: 'Powerlook',
  beyoung: 'Beyoung',
  redwolf: 'Redwolf',
  campussutra: 'Campus Sutra',
  hubberholme: 'Hubberholme',
  mufti: 'Mufti',
  spykar: 'Spykar',
  killerjeans: 'Killer Jeans',
  flyingmachine: 'Flying Machine',
  roadster: 'Roadster',
  highlander: 'Highlander',
  tokyotalkies: 'Tokyo Talkies',
  mastandharbour: 'Mast & Harbour',
  urbanic: 'Urbanic',
  redtape: 'Red Tape',

  // International Fashion Brands
  hm: 'H&M India',
  uniqlo: 'Uniqlo India',
  marksandspencer: 'Marks & Spencer India',
  levis: 'Levi\'s India',
  benetton: 'United Colors of Benetton',
  tommyhilfiger: 'Tommy Hilfiger India',
  calvinklein: 'Calvin Klein India',
  uspoloassn: 'US Polo Assn India',
  forever21: 'Forever 21 India',
  jackjones: 'Jack & Jones India',
  only: 'Only India',
  veromoda: 'Vero Moda India',
  superdry: 'Superdry India',
  gasjeans: 'Gas Jeans India',

  // Ethnic Wear
  fabindia: 'Fabindia',
  manyavar: 'Manyavar',
  mohey: 'Mohey',
  wforwoman: 'W for Woman',
  aurelia: 'Aurelia',
  biba: 'Biba',
  globaldesi: 'Global Desi',
  houseofindya: 'House of Indya',
  libas: 'Libas',
  soch: 'Soch',
  meenabazaar: 'Meena Bazaar',
  nallisilks: 'Nalli Silks',
  karagiri: 'Karagiri',
  suta: 'Suta',
  kalkifashion: 'Kalki Fashion',

  // Footwear
  bata: 'Bata India',
  metroshoes: 'Metro Shoes',
  mochishoes: 'Mochi Shoes',
  libertyshoes: 'Liberty Shoes',
  khadims: 'Khadim\'s',
  paragon: 'Paragon',
  campusshoes: 'Campus Shoes',
  relaxo: 'Sparx / Relaxo',
  woodland: 'Woodland India',
  crocs: 'Crocs India',
  skechers: 'Skechers India',
  nike: 'Nike India',
  reebok: 'Reebok India',

  // Electronics & Appliances
  sony: 'Sony India',
  xiaomi: 'Xiaomi India',
  realme: 'Realme India',
  vivo: 'Vivo India',
  oppo: 'Oppo India',
  motorola: 'Motorola India',
  dell: 'Dell India',
  asus: 'Asus India',
  acer: 'Acer India',
  whirlpool: 'Whirlpool India',
  godrej: 'Godrej Appliances',
  haier: 'Haier India',
  voltas: 'Voltas',
  bluestar: 'Blue Star',

  // Retailers & Audio
  boat: 'boAt Lifestyle',
  noise: 'Noise',
  boult: 'Boult Audio',
  mivi: 'Mivi',
  fireboltt: 'Fire-Boltt',
  zebronics: 'Zebronics',
  portronics: 'Portronics',
  jbl: 'JBL India',
  anker: 'Anker India',
  sennheiser: 'Sennheiser India',
  ambrane: 'Ambrane',
  leafstudios: 'Leaf Studios',

  // Jewelry
  caratlane: 'CaratLane',
  bluestone: 'BlueStone',
  giva: 'GIVA',
  melorra: 'Melorra',
  miabytanishq: 'Mia by Tanishq',
  kalyanjewellers: 'Kalyan Jewellers',
  malabargold: 'Malabar Gold & Diamonds',
  sencogold: 'Senco Gold & Diamonds',
  pcjeweller: 'PC Jeweller',
  voylla: 'Voylla',
  orrajewellery: 'Orra Jewellery',
  candere: 'Candere by Kalyan Jewellers',
  kushals: 'Kushal\'s Fashion Jewellery',

  // Watches & Accessories
  titan: 'Titan',
  fastrack: 'Fastrack',
  sonata: 'Sonata',
  casio: 'Casio India',
  fossil: 'Fossil India',
  danielwellington: 'Daniel Wellington India',
  ethoswatches: 'Ethos Watches',
  helioswatches: 'Helios Watches',
  baggit: 'Baggit',
  caprese: 'Caprese',
  lavie: 'Lavie',
  hidesign: 'Hidesign',
  damilano: 'Da Milano',
  wildhorn: 'Wildhorn',

  // Eyewear
  titaneyeplus: 'Titan Eyeplus',
  johnjacobs: 'John Jacobs',
  coolwinks: 'Coolwinks',
  rayban: 'Ray-Ban India',
  sunglasshut: 'Sunglass Hut India',
  specsmakers: 'Specsmakers',
  lenspick: 'Lenspick',
  cleardekho: 'ClearDekho',
  vincentchase: 'Vincent Chase',

  // Beauty & Personal Care
  purplle: 'Purplle',
  myglamm: 'MyGlamm',
  sugarcosmetics: 'Sugar Cosmetics',
  mamaearth: 'Mamaearth',
  wowskin: 'Wow Skin Science',
  dermaco: 'The Derma Co',
  plumgoodness: 'Plum Goodness',
  mcaffeine: 'mCaffeine',
  forestessentials: 'Forest Essentials',
  kamaayurveda: 'Kama Ayurveda',
  biotique: 'Biotique',
  lotusherbals: 'Lotus Herbals',
  himalaya: 'Himalaya Wellness',
  minimalist: 'Minimalist',
  foxtale: 'Foxtale',
  pilgrim: 'Pilgrim',
  dotandkey: 'Dot & Key',
  facescanada: 'Faces Canada',

  // Home & Kitchen
  urbanladder: 'Urban Ladder',
  woodenstreet: 'Wooden Street',
  homecentre: 'Home Centre',
  ikea: 'IKEA India',
  sleepwell: 'Sleepwell',
  wakefit: 'Wakefit',
  flomattress: 'Flo Mattress',
  thesleepcompany: 'The Sleep Company',
  borosil: 'Borosil',
  wonderchef: 'Wonderchef',
  pigeon: 'Pigeon',
  prestige: 'Prestige',
  hawkins: 'Hawkins Cookers',

  // Kids & Sports
  hopscotch: 'Hopscotch',
  hamleys: 'Hamleys India',
  decathlon: 'Decathlon India',
  vectorx: 'Vector X',
  cosco: 'Cosco India',
  nivia: 'Nivia Sports',
  yonex: 'Yonex India',
  starsports: 'Star India Sports',

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
    case 'reliance': return `https://www.reliancedigital.in/search?q=${q}`;
    case 'samsung': return `https://www.samsung.com/in/search/?searchvalue=${q}`;
    case 'vijaysales': return `https://www.vijaysales.com/search/${q}`;
    case 'hp': return `https://www.hp.com/in-en/shop/catalogsearch/result/?q=${q}`;
    case 'oneplus': return `https://www.oneplus.in/search?q=${q}`;
    case 'lenovo': return `https://www.lenovo.com/in/en/search?fq=&q=${q}`;
    case 'lg': return `https://www.lg.com/in/search?search=${q}`;
    case 'dailyobjects': return `https://www.dailyobjects.com/search?q=${q}`;
    case 'headphones': return `https://www.headphonezone.in/search?q=${q}`;
    case 'apple': return `https://www.apple.com/in/search/${q}`;
    case 'puma': return `https://in.puma.com/in/en/search?q=${q}`;
    case 'lenskart': return `https://www.lenskart.com/search?q=${q}`;
    case 'zara': return `https://www.zara.com/in/en/search?searchTerm=${q}`;
    case 'tanishq': return `https://www.tanishq.co.in/search?q=${q}`;
    case 'pantaloons': return `https://www.pantaloons.com/search?q=${q}`;
    case 'adidas': return `https://www.adidas.co.in/search?q=${q}`;
    case 'maxfashion': return `https://www.maxfashion.in/in/en/search?q=${q}`;
    case 'bewakoof': return `https://www.bewakoof.com/search/${q}`;
    case 'chumbak': return `https://www.chumbak.com/search?q=${q}`;
    case 'joyalukkas': return `https://www.joyalukkas.in/catalogsearch/result/?q=${q}`;
    case 'snitch': return `https://www.snitch.co.in/search?q=${q}`;
    case 'cultstore': return `https://cult.sport/search?q=${q}`;
    case 'vishalmegamart': return `https://www.vishalmegamart.com/search?q=${q}`;

    // New General E-Commerce
    case 'shopsy': return `https://www.shopsy.in/search?q=${q}`;
    case 'paytmmall': return `https://paytmmall.com/shop/search?q=${q}`;
    case 'dealshare': return `https://www.dealshare.in`;
    case 'citymall': return `https://www.citymall.live`;
    case 'udaan': return `https://udaan.com/search?q=${q}`;
    case 'ondc': return `https://ondc.org`;

    // New Fashion & Lifestyle Marketplaces
    case 'tatacliq_luxury': return `https://luxury.tatacliq.com/search/?text=${q}`;
    case 'nnnow': return `https://nnnow.com/search?q=${q}`;
    case 'lifestylestores': return `https://www.lifestylestores.com/in/en/search?q=${q}`;
    case 'shoppersstop': return `https://www.shoppersstop.com/search/?text=${q}`;
    case 'westside': return `https://www.westside.com/search?q=${q}`;
    case 'zudio': return `https://www.zudio.com`;
    case 'azorte': return `https://azorte.ajio.com/search?text=${q}`;
    case 'reliancetrends': return `https://trends.ajio.com/search?text=${q}`;
    case 'yousta': return `https://yousta.in`;
    case 'centro': return `https://centro.co.in`;

    // New D2C Apparel & Casual
    case 'souledstore': return `https://www.thesouledstore.com/search?q=${q}`;
    case 'rarerabbit': return `https://the-rare-rabbit.com/search?q=${q}`;
    case 'bombayshirt': return `https://bombayshirts.com/search?q=${q}`;
    case 'powerlook': return `https://www.powerlook.in/search?q=${q}`;
    case 'beyoung': return `https://www.beyoung.in/search?q=${q}`;
    case 'redwolf': return `https://www.redwolf.in/search?q=${q}`;
    case 'campussutra': return `https://campussutra.com/search?q=${q}`;
    case 'hubberholme': return `https://hubberholme.com/search?q=${q}`;
    case 'mufti': return `https://www.muftijeans.in/search?q=${q}`;
    case 'spykar': return `https://www.spykar.com/search?q=${q}`;
    case 'killerjeans': return `https://killerjeans.com/search?q=${q}`;
    case 'flyingmachine': return `https://flyingmachine.co.in/search?q=${q}`;
    case 'roadster': return `https://www.myntra.com/roadster?rawQuery=roadster%20${q}`;
    case 'highlander': return `https://www.myntra.com/highlander?rawQuery=highlander%20${q}`;
    case 'tokyotalkies': return `https://www.myntra.com/tokyotalkies?rawQuery=tokyo%20talkies%20${q}`;
    case 'mastandharbour': return `https://www.myntra.com/mast-and-harbour?rawQuery=mast%20and%20harbour%20${q}`;
    case 'urbanic': return `https://in.urbanic.com/search?q=${q}`;
    case 'redtape': return `https://redtape.com/search?q=${q}`;

    // New International Fashion
    case 'hm': return `https://www2.hm.com/en_in/search-results.html?q=${q}`;
    case 'uniqlo': return `https://www.uniqlo.com/in/en/search?q=${q}`;
    case 'marksandspencer': return `https://www.marksandspencer.in/search?q=${q}`;
    case 'levis': return `https://www.levi.in/search?q=${q}`;
    case 'benetton': return `https://in.benetton.com/search?q=${q}`;
    case 'tommyhilfiger': return `https://tommy.com/search?q=${q}`;
    case 'calvinklein': return `https://calvinklein.in/search?q=${q}`;
    case 'uspoloassn': return `https://uspoloassn.in/search?q=${q}`;
    case 'forever21': return `https://www.forever21.in/search?q=${q}`;
    case 'jackjones': return `https://www.jackjones.in/search?q=${q}`;
    case 'only': return `https://www.only.in/search?q=${q}`;
    case 'veromoda': return `https://www.veromoda.in/search?q=${q}`;
    case 'superdry': return `https://www.superdry.in/search?q=${q}`;
    case 'gasjeans': return `https://gasjeans.in`;

    // New Ethnic Wear
    case 'fabindia': return `https://www.fabindia.com/search?q=${q}`;
    case 'manyavar': return `https://www.manyavar.com/search?q=${q}`;
    case 'mohey': return `https://www.manyavar.com/en-in/mohey/search?q=${q}`;
    case 'wforwoman': return `https://wforwoman.com/search?q=${q}`;
    case 'aurelia': return `https://shopforaurelia.com/search?q=${q}`;
    case 'biba': return `https://www.biba.in/search?q=${q}`;
    case 'globaldesi': return `https://www.houseofanitadongre.com/global-desi/search?q=${q}`;
    case 'houseofindya': return `https://www.houseofindya.com/search?q=${q}`;
    case 'libas': return `https://www.libas.in/search?q=${q}`;
    case 'soch': return `https://www.soch.com/search?q=${q}`;
    case 'meenabazaar': return `https://meenabazaar.com/search?q=${q}`;
    case 'nallisilks': return `https://www.nalli.com/search?q=${q}`;
    case 'karagiri': return `https://karagiri.com/search?q=${q}`;
    case 'suta': return `https://suta.in/search?q=${q}`;
    case 'kalkifashion': return `https://www.kalkifashion.com/search?q=${q}`;

    // New Footwear
    case 'bata': return `https://www.bata.com/in/search?q=${q}`;
    case 'metroshoes': return `https://www.metroshoes.com/search?q=${q}`;
    case 'mochishoes': return `https://www.mochishoes.com/search?q=${q}`;
    case 'libertyshoes': return `https://libertyshoesonline.com/search?q=${q}`;
    case 'khadims': return `https://www.khadims.com/search?q=${q}`;
    case 'paragon': return `https://www.paragonfootwear.com/search?q=${q}`;
    case 'campusshoes': return `https://www.campusshoes.com/search?q=${q}`;
    case 'relaxo': return `https://www.relaxofootwear.com/search?q=${q}`;
    case 'woodland': return `https://www.woodlandstores.com/search?q=${q}`;
    case 'crocs': return `https://www.crocs.in/search?q=${q}`;
    case 'skechers': return `https://www.skechers.in/search?q=${q}`;
    case 'nike': return `https://www.nike.com/in/w?q=${q}`;
    case 'reebok': return `https://reebok.abfrl.in/search?q=${q}`;

    // New Electronics & Appliances
    case 'sony': return `https://www.sony.co.in/search?query=${q}`;
    case 'xiaomi': return `https://www.mi.com/in/search?query=${q}`;
    case 'realme': return `https://www.realme.com/in/search?q=${q}`;
    case 'vivo': return `https://shop.vivo.com/in/search?q=${q}`;
    case 'oppo': return `https://shop.oppo.com/in/search?q=${q}`;
    case 'motorola': return `https://www.motorola.in/search?q=${q}`;
    case 'dell': return `https://www.dell.com/en-in/search/${q}`;
    case 'asus': return `https://www.asus.com/in/search/${q}`;
    case 'acer': return `https://store.acer.com/en-in/catalogsearch/result/?q=${q}`;
    case 'whirlpool': return `https://www.whirlpool.india.com/catalogsearch/result/?q=${q}`;
    case 'godrej': return `https://www.godrej.com/appliances/search?q=${q}`;
    case 'haier': return `https://www.haier.com/in/search?q=${q}`;
    case 'voltas': return `https://www.voltas.com/search?q=${q}`;
    case 'bluestar': return `https://www.bluestarindia.com/search?q=${q}`;

    // New Retailers & Audio
    case 'boat': return `https://www.boat-lifestyle.com/search?q=${q}`;
    case 'noise': return `https://www.gonoise.com/search?q=${q}`;
    case 'boult': return `https://www.boultaudio.com/search?q=${q}`;
    case 'mivi': return `https://www.mivi.in/search?q=${q}`;
    case 'fireboltt': return `https://www.fireboltt.com/search?q=${q}`;
    case 'zebronics': return `https://zebronics.com/search?q=${q}`;
    case 'portronics': return `https://www.portronics.com/search?q=${q}`;
    case 'jbl': return `https://in.jbl.com/search?q=${q}`;
    case 'anker': return `https://www.ankerindia.com/search?q=${q}`;
    case 'sennheiser': return `https://www.sennheiser-hearing.com/en-IN/search?query=${q}`;
    case 'ambrane': return `https://ambraneindia.com/search?q=${q}`;
    case 'leafstudios': return `https://www.leafstudios.in/search?q=${q}`;

    // New Jewelry
    case 'caratlane': return `https://www.caratlane.com/search?q=${q}`;
    case 'bluestone': return `https://www.bluestone.com/search?q=${q}`;
    case 'giva': return `https://www.giva.co/search?q=${q}`;
    case 'melorra': return `https://www.melorra.com/search?q=${q}`;
    case 'miabytanishq': return `https://www.miabytanishq.com/search?q=${q}`;
    case 'kalyanjewellers': return `https://www.kalyanjewellers.net/search?q=${q}`;
    case 'malabargold': return `https://www.malabargoldanddiamonds.com/search?q=${q}`;
    case 'sencogold': return `https://sencogoldtonline.com/search?q=${q}`;
    case 'pcjeweller': return `https://www.pcjeweller.com/search?q=${q}`;
    case 'voylla': return `https://www.voylla.com/search?q=${q}`;
    case 'orrajewellery': return `https://www.orra.co.in/search?q=${q}`;
    case 'candere': return `https://www.candere.com/search?q=${q}`;
    case 'kushals': return `https://www.kushals.com/search?q=${q}`;

    // New Watches & Accessories
    case 'titan': return `https://www.titan.co.in/search?q=${q}`;
    case 'fastrack': return `https://www.fastrack.in/search?q=${q}`;
    case 'sonata': return `https://www.sonata.co.in/search?q=${q}`;
    case 'casio': return `https://www.casioindiashop.com/search?q=${q}`;
    case 'fossil': return `https://www.fossil.com/en-in/search?q=${q}`;
    case 'danielwellington': return `https://www.danielwellington.com/in/search?q=${q}`;
    case 'ethoswatches': return `https://www.ethoswatches.com/search?q=${q}`;
    case 'helioswatches': return `https://www.helioswatchstore.com/search?q=${q}`;
    case 'baggit': return `https://www.baggit.com/search?q=${q}`;
    case 'caprese': return `https://www.capresebags.com/search?q=${q}`;
    case 'lavie': return `https://www.lavieworld.com/search?q=${q}`;
    case 'hidesign': return `https://hidesign.com/search?q=${q}`;
    case 'damilano': return `https://www.damilano.com/search?q=${q}`;
    case 'wildhorn': return `https://wildhorn.in/search?q=${q}`;

    // New Eyewear
    case 'titaneyeplus': return `https://www.titaneyeplus.com/search?q=${q}`;
    case 'johnjacobs': return `https://www.johnjacobseyewear.com/search?q=${q}`;
    case 'coolwinks': return `https://www.coolwinks.com/search?q=${q}`;
    case 'rayban': return `https://india.ray-ban.com/search?q=${q}`;
    case 'sunglasshut': return `https://www.sunglasshut.com/in/search?q=${q}`;
    case 'specsmakers': return `https://www.specsmakers.in/search?q=${q}`;
    case 'lenspick': return `https://www.lenspick.com/search?q=${q}`;
    case 'cleardekho': return `https://www.cleardekho.com/search?q=${q}`;
    case 'vincentchase': return `https://www.lenskart.com/search?q=vincent%20chase%20${q}`;

    // New Beauty & Personal Care
    case 'purplle': return `https://www.purplle.com/search?q=${q}`;
    case 'myglamm': return `https://www.myglamm.com/search?q=${q}`;
    case 'sugarcosmetics': return `https://sugarcosmetics.com/search?q=${q}`;
    case 'mamaearth': return `https://mamaearth.in/search?q=${q}`;
    case 'wowskin': return `https://buywow.in/search?q=${q}`;
    case 'dermaco': return `https://thedermaco.com/search?q=${q}`;
    case 'plumgoodness': return `https://plumgoodness.com/search?q=${q}`;
    case 'mcaffeine': return `https://www.mcaffeine.com/search?q=${q}`;
    case 'forestessentials': return `https://www.forestessentialsindia.com/catalogsearch/result/?q=${q}`;
    case 'kamaayurveda': return `https://www.kamaayurveda.com/catalogsearch/result/?q=${q}`;
    case 'biotique': return `https://www.biotique.com/catalogsearch/result/?q=${q}`;
    case 'lotusherbals': return `https://www.lotusherbals.com/search?q=${q}`;
    case 'himalaya': return `https://himalayawellness.in/search?q=${q}`;
    case 'minimalist': return `https://www.beminimalist.co/search?q=${q}`;
    case 'foxtale': return `https://foxtale.in/search?q=${q}`;
    case 'pilgrim': return `https://discoverpilgrim.com/search?q=${q}`;
    case 'dotandkey': return `https://www.dotandkey.com/search?q=${q}`;
    case 'facescanada': return `https://www.facescanada.com/search?q=${q}`;

    // New Home & Kitchen
    case 'urbanladder': return `https://www.urbanladder.com/search?q=${q}`;
    case 'woodenstreet': return `https://www.woodenstreet.com/search?q=${q}`;
    case 'homecentre': return `https://www.homecentre.in/in/en/search?q=${q}`;
    case 'ikea': return `https://www.ikea.com/in/en/search/?q=${q}`;
    case 'sleepwell': return `https://mysleepwell.com/search?q=${q}`;
    case 'wakefit': return `https://www.wakefit.co/search?q=${q}`;
    case 'flomattress': return `https://www.flomattress.com/search?q=${q}`;
    case 'thesleepcompany': return `https://thesleepcompany.in/search?q=${q}`;
    case 'borosil': return `https://myborosil.com/search?q=${q}`;
    case 'wonderchef': return `https://wonderchef.com/search?q=${q}`;
    case 'pigeon': return `https://pigeonappliances.com/search?q=${q}`;
    case 'prestige': return `https://shop.ttkprestige.com/catalogsearch/result/?q=${q}`;
    case 'hawkins': return `https://www.hawkinscookers.com/search?q=${q}`;

    // New Kids & Sports
    case 'hopscotch': return `https://www.hopscotch.in/search?q=${q}`;
    case 'hamleys': return `https://www.hamleys.in/search?q=${q}`;
    case 'decathlon': return `https://www.decathlon.in/search?q=${q}`;
    case 'vectorx': return `https://vectorx.co.in/search?q=${q}`;
    case 'cosco': return `https://cosco.in/search?q=${q}`;
    case 'nivia': return `https://www.niviasports.com/search?q=${q}`;
    case 'yonex': return `https://www.google.com/search?q=yonex+india+${q}`;
    case 'starsports': return `https://sportsmith.in/search?q=${q}`;
    
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

// ── Store Niche Validator ──
export function doesStoreSellQuery(store, query) {
  const s = store.toLowerCase();
  const q = query.toLowerCase();

  // General Marketplaces sell everything
  const generalMarketplaces = [
    'amazon', 'flipkart', 'meesho', 'snapdeal', 'jiomart', 'tatacliq', 'shopsy', 
    'paytmmall', 'shopclues', 'dealshare', 'citymall', 'indiamart', 'udaan', 
    'ebay', 'etsy', 'alibaba', 'aliexpress', 'walmart', 'ondc', 'vishalmegamart'
  ];
  if (generalMarketplaces.includes(s)) {
    return true;
  }

  // Food delivery apps
  if (['zomato', 'swiggy'].includes(s)) {
    return true; // Assume any query in food mode is food-related
  }

  // Define keyword sets
  const isFootwear = /\b(shoe|shoes|sneaker|sneakers|sandal|sandals|slipper|slippers|boot|boots|flats|heels|footwear|socks|loafer|loafers|crocs)\b/.test(q);
  
  const isApparel = /\b(clothing|shirt|shirts|t-shirt|tshirts|tshirt|jeans|jean|jacket|jackets|hoodie|hoodies|dress|dresses|saree|sarees|kurta|kurtas|top|tops|trousers|suit|suits|coat|coats|scarf|innerwear|socks|activewear|wear|blazer|gown|lehenga)\b/.test(q);
  
  const isElectronics = /\b(laptop|laptops|mobile|phone|phones|smartphone|smartphones|tv|television|tvs|earphone|earphones|headphone|headphones|smartwatch|smart watch|smartwatches|speaker|speakers|printer|camera|mouse|keyboard|router|monitor|tablet|ipad|charger|charging|adapter|powerbank|fridge|refrigerator|washing machine|ac|air conditioner|microwave|oven|gimbals|buds|earbuds)\b/.test(q);
  
  const isJewelry = /\b(jewelry|jewellery|ring|rings|necklace|necklaces|earring|earrings|pendant|pendants|bracelet|bracelets|gold|diamond|diamonds|silver|platinum|bangles|ornaments|gemstone)\b/.test(q);
  
  const isWatches = /\b(watch|watches|smartwatch|smart watch|smartwatches|clock|clocks)\b/.test(q);
  
  const isEyewear = /\b(glasses|sunglasses|lens|lenses|frame|frames|spectacles|goggles|eyeplus|contact lens)\b/.test(q);
  
  const isBeauty = /\b(makeup|lipstick|lipsticks|cream|creams|lotion|lotions|shampoo|conditioner|face wash|perfume|perfumes|scent|skincare|cosmetics|eyeliner|eyeshadow|nail polish|serum|serums|moisturizer|sunscreen|haircare|body wash)\b/.test(q);
  
  const isHome = /\b(furniture|bed|sofa|sofas|chair|chairs|table|tables|mattress|mattresses|pillow|pillows|sheet|sheets|curtain|curtains|decor|kitchen|cooker|cookers|pan|pans|pot|pots|plate|plates|borosil|induction|stove|kettle|wardrobe|cushion)\b/.test(q);
  
  const isKids = /\b(toy|toys|diaper|diapers|baby|baby care|stroller|strollers|cradle|kids clothing|romper|maternity)\b/.test(q);
  
  const isSports = /\b(sports|bat|bats|ball|balls|racket|rackets|shuttlecock|shuttles|gym|fitness|dumbbell|dumbbells|cycle|bicycle|jersey|yoga mat|treadmill)\b/.test(q);
  
  const isBooks = /\b(book|books|novel|novels|comic|comics|dictionary|literature|paperback|hardcover)\b/.test(q);
  
  const isGrocery = /\b(milk|bread|cheese|butter|vegetable|vegetables|fruit|fruits|onion|onions|tomato|tomatoes|potato|potatoes|grocery|groceries|snack|snacks|coke|beverage|drink|drinks|juice|tea|coffee|atta|rice|dal|oil|salt|sugar|wheat|paneer|masala|egg|eggs)\b/.test(q);

  // Group 1: Footwear only stores
  const footwearOnlyStores = [
    'bata', 'metroshoes', 'mochishoes', 'libertyshoes', 'khadims', 'paragon', 
    'campusshoes', 'relaxo', 'woodland', 'crocs', 'skechers'
  ];
  if (footwearOnlyStores.includes(s)) {
    return isFootwear;
  }

  // Group 2: Sports & Fitness (who also sell sportswear and sports shoes)
  const sportsStores = ['decathlon', 'cultstore', 'vectorx', 'cosco', 'nivia', 'yonex', 'starsports'];
  if (sportsStores.includes(s)) {
    return isSports || isFootwear || isApparel;
  }

  // Group 3: Fashion & Apparel stores
  const fashionStores = [
    'myntra', 'ajio', 'nykaafashion', 'tatacliq_luxury', 'nnnow', 'lifestylestores', 
    'shoppersstop', 'pantaloons', 'maxfashion', 'westside', 'zudio', 'azorte', 
    'reliancetrends', 'yousta', 'centro', 'snitch', 'souledstore', 'bewakoof', 
    'rarerabbit', 'bombayshirt', 'powerlook', 'beyoung', 'redwolf', 'campussutra', 
    'hubberholme', 'mufti', 'spykar', 'killerjeans', 'flyingmachine', 'roadster', 
    'highlander', 'tokyotalkies', 'mastandharbour', 'urbanic', 'redtape', 'hm', 
    'uniqlo', 'marksandspencer', 'levis', 'benetton', 'tommyhilfiger', 'calvinklein', 
    'uspoloassn', 'forever21', 'jackjones', 'only', 'veromoda', 'superdry', 'gasjeans', 
    'fabindia', 'manyavar', 'mohey', 'wforwoman', 'aurelia', 'biba', 'globaldesi', 
    'houseofindya', 'libas', 'soch', 'meenabazaar', 'nallisilks', 'karagiri', 'suta', 'kalkifashion'
  ];
  if (fashionStores.includes(s)) {
    return isApparel || isFootwear || isEyewear || isWatches || isJewelry || isBeauty;
  }

  // Group 4: Electronics only stores
  const electronicsStores = [
    'sony', 'xiaomi', 'realme', 'vivo', 'oppo', 'motorola', 'dell', 'asus', 
    'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar', 'boat', 
    'noise', 'boult', 'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 
    'anker', 'sennheiser', 'ambrane', 'leafstudios', 'headphones', 'croma', 
    'reliance', 'vijaysales', 'apple', 'samsung', 'oneplus', 'hp', 'lenovo', 'lg', 'dailyobjects'
  ];
  if (electronicsStores.includes(s)) {
    return isElectronics || isWatches;
  }

  // Group 5: Jewelry only stores
  const jewelryStores = [
    'tanishq', 'joyalukkas', 'caratlane', 'bluestone', 'giva', 'melorra', 
    'miabytanishq', 'kalyanjewellers', 'malabargold', 'sencogold', 'pcjeweller', 
    'voylla', 'orrajewellery', 'candere', 'kushals'
  ];
  if (jewelryStores.includes(s)) {
    return isJewelry;
  }

  // Group 6: Watches only stores
  const watchesStores = [
    'titan', 'fastrack', 'sonata', 'casio', 'fossil', 'danielwellington', 
    'ethoswatches', 'helioswatches'
  ];
  if (watchesStores.includes(s)) {
    return isWatches || isEyewear;
  }

  // Group 7: Eyewear only stores
  const eyewearStores = [
    'lenskart', 'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 
    'sunglasshut', 'specsmakers', 'lenspick', 'cleardekho', 'vincentchase'
  ];
  if (eyewearStores.includes(s)) {
    return isEyewear;
  }

  // Group 8: Beauty only stores
  const beautyStores = [
    'nykaa', 'purplle', 'myglamm', 'sugarcosmetics', 'mamaearth', 'wowskin', 
    'dermaco', 'plumgoodness', 'mcaffeine', 'forestessentials', 'kamaayurveda', 
    'biotique', 'lotusherbals', 'himalaya', 'minimalist', 'foxtale', 'pilgrim', 
    'dotandkey', 'facescanada'
  ];
  if (beautyStores.includes(s)) {
    return isBeauty;
  }

  // Group 9: Home decor & kitchenware
  const homeStores = [
    'pepperfry', 'urbanladder', 'woodenstreet', 'homecentre', 'ikea', 'sleepwell', 
    'wakefit', 'flomattress', 'thesleepcompany', 'borosil', 'wonderchef', 'pigeon', 
    'prestige', 'hawkins', 'chumbak'
  ];
  if (homeStores.includes(s)) {
    return isHome;
  }

  // Group 10: Kids only stores
  const kidsStores = ['firstcry', 'hopscotch', 'hamleys'];
  if (kidsStores.includes(s)) {
    return isKids || isApparel || isFootwear;
  }

  // Group 11: Books only stores
  if (s === 'bookswagon') {
    return isBooks;
  }

  // Group 12: Quick commerce / grocery
  const quickCommerceStores = [
    'blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes', 'amazonfresh', 
    'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight'
  ];
  if (quickCommerceStores.includes(s)) {
    return isGrocery || isBeauty || isKids || (isElectronics && /\b(charger|cable|cables|adapter|plug|powerbank|earphone|earphones)\b/.test(q)) || isHome;
  }

  return true;
}

// ── Store Search Simulator for Scrape Console ──
export function simulateStoreSearch(query, store, pages = 1, location = 'Mumbai') {
  if (!doesStoreSellQuery(store, query)) {
    return []; // Return empty result set if store does not sell this query category
  }
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
    const isFashion = ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie', 'tshirt', 'apparel', 'jeans', 't-shirt', 'wear', 'pantaloons', 'max', 'bewakoof', 'zara', 'puma', 'adidas', 'snitch', 'cult', 'ethnic', 'saree', 'traditional', 'footwear', 'sandal', 'kurta', 'suit', 'jeans', 'shirt', 'top', 'trousers', 'designer', 'brands'].some(kw => q.includes(kw));
    const isBooks = ['book', 'novel', 'biography', 'comic', 'fiction', 'read', 'literature'].some(kw => q.includes(kw));
    const isBeauty = ['nykaa', 'lipstick', 'makeup', 'cream', 'shampoo', 'perfume', 'beauty', 'cosmetics', 'serum', 'lotion', 'personal care', 'eyeliner', 'wellness', 'fragrance', 'skincare', 'haircare'].some(kw => q.includes(kw));
    const isBaby = ['firstcry', 'baby', 'toy', 'diaper', 'infant', 'kid', 'maternity', 'toys', 'kinder'].some(kw => q.includes(kw));
    const isFurniture = ['pepperfry', 'furniture', 'sofa', 'chair', 'table', 'bed', 'decor', 'etsy', 'handicraft', 'mattress', 'kitchen', 'cooker', 'homeware', 'appliance', 'kitchenware', 'utensil', 'pan', 'cookware'].some(kw => q.includes(kw));
    const isWholesale = ['indiamart', 'alibaba', 'aliexpress', 'wholesale', 'bulk', 'b2b'].some(kw => q.includes(kw));
    const isJewelry = ['gold', 'diamond', 'jewel', 'ring', 'necklace', 'tanishq', 'joyalukkas', 'ornament', 'silver', 'jewelry', 'earrings', 'pendant', 'bracelet'].some(kw => q.includes(kw));

    if (isFashion) {
      targetStores = [
        'myntra', 'ajio', 'flipkart', 'nykaafashion', 'meesho', 'amazon', 'zara', 'puma', 'adidas', 'pantaloons', 'maxfashion', 'bewakoof', 'snitch', 'cultstore',
        'shopsy', 'paytmmall', 'tatacliq_luxury', 'nnnow', 'lifestylestores', 'shoppersstop', 'westside', 'zudio', 'azorte', 'reliancetrends', 'yousta', 'centro',
        'souledstore', 'rarerabbit', 'bombayshirt', 'powerlook', 'beyoung', 'redwolf', 'campussutra', 'hubberholme', 'mufti', 'spykar', 'killerjeans', 'flyingmachine',
        'roadster', 'highlander', 'tokyotalkies', 'mastandharbour', 'urbanic', 'redtape', 'hm', 'uniqlo', 'marksandspencer', 'levis', 'benetton', 'tommyhilfiger',
        'calvinklein', 'uspoloassn', 'forever21', 'jackjones', 'only', 'veromoda', 'superdry', 'gasjeans', 'fabindia', 'manyavar', 'mohey', 'wforwoman', 'aurelia',
        'biba', 'globaldesi', 'houseofindya', 'libas', 'soch', 'meenabazaar', 'nallisilks', 'karagiri', 'suta', 'kalkifashion', 'bata', 'metroshoes', 'mochishoes',
        'libertyshoes', 'khadims', 'paragon', 'campusshoes', 'relaxo', 'woodland', 'crocs', 'skechers', 'nike', 'reebok'
      ];
    } else if (isBooks) {
      targetStores = ['bookswagon', 'amazon', 'ebay', 'flipkart'];
    } else if (isBeauty) {
      targetStores = [
        'nykaa', 'nykaafashion', 'amazon', 'myntra',
        'purplle', 'myglamm', 'sugarcosmetics', 'mamaearth', 'wowskin', 'dermaco', 'plumgoodness', 'mcaffeine', 'forestessentials', 'kamaayurveda', 'biotique', 'lotusherbals', 'himalaya', 'minimalist', 'foxtale', 'pilgrim', 'dotandkey', 'facescanada'
      ];
    } else if (isBaby) {
      targetStores = ['firstcry', 'amazon', 'flipkart', 'meesho', 'hopscotch', 'hamleys'];
    } else if (isFurniture) {
      targetStores = [
        'pepperfry', 'etsy', 'amazon', 'ebay', 'chumbak',
        'urbanladder', 'woodenstreet', 'homecentre', 'ikea', 'sleepwell', 'wakefit', 'flomattress', 'thesleepcompany', 'borosil', 'wonderchef', 'pigeon', 'prestige', 'hawkins'
      ];
    } else if (isWholesale) {
      targetStores = ['indiamart', 'alibaba', 'aliexpress', 'udaan'];
    } else if (isJewelry) {
      targetStores = [
        'tanishq', 'joyalukkas', 'etsy', 'amazon', 'flipkart',
        'caratlane', 'bluestone', 'giva', 'melorra', 'miabytanishq', 'kalyanjewellers', 'malabargold', 'sencogold', 'pcjeweller', 'voylla', 'orrajewellery', 'candere', 'kushals'
      ];
    } else {
      // General Electronics / Retail / Brand Store defaults
      const isTech = ['phone', 'mobile', 'samsung', 'apple', 'oneplus', 'hp', 'lenovo', 'lg', 'laptop', 'television', 'tv', 'croma', 'reliance', 'vijay', 'headphone', 'earphone', 'sony', 'xiaomi', 'realme', 'vivo', 'oppo', 'motorola', 'dell', 'asus', 'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar', 'boat', 'noise', 'boult', 'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 'anker', 'sennheiser', 'ambrane', 'leafstudios', 'titan', 'fastrack', 'sonata', 'casio', 'fossil', 'danielwellington', 'ethoswatches', 'helioswatches', 'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 'sunglasshut', 'specsmakers', 'lenspick', 'cleardekho', 'vincentchase'].some(kw => q.includes(kw));
      if (isTech) {
        targetStores = [
          'amazon', 'flipkart', 'croma', 'reliance', 'vijaysales', 'apple', 'samsung', 'oneplus', 'hp', 'lenovo', 'lg', 'headphones', 'dailyobjects', 'lenskart',
          'sony', 'xiaomi', 'realme', 'vivo', 'oppo', 'motorola', 'dell', 'asus', 'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar', 'boat', 'noise', 'boult',
          'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 'anker', 'sennheiser', 'ambrane', 'leafstudios', 'titan', 'fastrack', 'sonata', 'casio', 'fossil',
          'danielwellington', 'ethoswatches', 'helioswatches', 'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 'sunglasshut', 'specsmakers', 'lenspick',
          'cleardekho', 'vincentchase'
        ];
      } else {
        targetStores = [
          'amazon', 'flipkart', 'snapdeal', 'jiomart', 'tatacliq', 'walmart', 'vishalmegamart', 'shopclues', 'etsy',
          'shopsy', 'paytmmall', 'dealshare', 'citymall', 'udaan', 'ondc'
        ];
      }
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


// ══════════════════════════════════════════════════════════════
// ── CAB FARE COMPARISON MODULE ──
// ══════════════════════════════════════════════════════════════

export const CAB_PLATFORMS = {
  uber: {
    name: 'Uber',
    color: '#000000',
    rideTypes: [
      { id: 'ubergo', name: 'UberGo', baseFare: 40, perKm: 11, perMin: 1.5, minFare: 60, category: 'sedan' },
      { id: 'uberpremier', name: 'Uber Premier', baseFare: 70, perKm: 16, perMin: 2.0, minFare: 100, category: 'sedan' },
      { id: 'uberxl', name: 'UberXL', baseFare: 90, perKm: 19, perMin: 2.5, minFare: 130, category: 'suv' },
      { id: 'uberauto', name: 'Uber Auto', baseFare: 25, perKm: 8, perMin: 1.0, minFare: 30, category: 'auto' },
      { id: 'ubermoto', name: 'Uber Moto', baseFare: 15, perKm: 5, perMin: 0.75, minFare: 25, category: 'bike' }
    ],
    deepLinkBase: 'https://m.uber.com/ul/'
  },
  ola: {
    name: 'Ola',
    color: '#1C8C3B',
    rideTypes: [
      { id: 'olamini', name: 'Ola Mini', baseFare: 50, perKm: 10, perMin: 1.25, minFare: 60, category: 'sedan' },
      { id: 'olaprime', name: 'Ola Prime Sedan', baseFare: 80, perKm: 14, perMin: 1.75, minFare: 100, category: 'sedan' },
      { id: 'olaprimesuv', name: 'Ola Prime SUV', baseFare: 100, perKm: 18, perMin: 2.5, minFare: 150, category: 'suv' },
      { id: 'olaauto', name: 'Ola Auto', baseFare: 30, perKm: 9, perMin: 1.0, minFare: 30, category: 'auto' },
      { id: 'olabike', name: 'Ola Bike', baseFare: 15, perKm: 5, perMin: 0.5, minFare: 20, category: 'bike' }
    ],
    deepLinkBase: 'https://book.olacabs.com/'
  },
  rapido: {
    name: 'Rapido',
    color: '#FECB2F',
    rideTypes: [
      { id: 'rapidobike', name: 'Rapido Bike', baseFare: 10, perKm: 4, perMin: 0.5, minFare: 15, category: 'bike' },
      { id: 'rapidoauto', name: 'Rapido Auto', baseFare: 25, perKm: 7, perMin: 0.75, minFare: 25, category: 'auto' },
      { id: 'rapidocab', name: 'Rapido Cab', baseFare: 45, perKm: 11, perMin: 1.25, minFare: 55, category: 'sedan' }
    ],
    deepLinkBase: 'https://www.rapido.bike/'
  },
  indrive: {
    name: 'inDrive',
    color: '#A8E847',
    rideTypes: [
      { id: 'indriveride', name: 'inDrive Ride', baseFare: 35, perKm: 9, perMin: 1.0, minFare: 50, category: 'sedan' },
      { id: 'indrivecomfort', name: 'inDrive Comfort', baseFare: 60, perKm: 13, perMin: 1.5, minFare: 80, category: 'sedan' }
    ],
    deepLinkBase: 'https://indrive.com/'
  },
  blusmart: {
    name: 'BluSmart',
    color: '#0066FF',
    rideTypes: [
      { id: 'blusmarteco', name: 'BluSmart Eco', baseFare: 50, perKm: 12, perMin: 1.5, minFare: 70, category: 'sedan' },
      { id: 'blusmartprime', name: 'BluSmart Prime', baseFare: 80, perKm: 16, perMin: 2.0, minFare: 110, category: 'sedan' }
    ],
    deepLinkBase: 'https://www.blu-smart.com/'
  },
  nammayatri: {
    name: 'Namma Yatri',
    color: '#00B562',
    rideTypes: [
      { id: 'nyauto', name: 'Namma Auto', baseFare: 30, perKm: 7, perMin: 0.5, minFare: 30, category: 'auto' },
      { id: 'nycab', name: 'Namma Cab', baseFare: 40, perKm: 10, perMin: 1.0, minFare: 50, category: 'sedan' }
    ],
    deepLinkBase: 'https://nammayatri.in/'
  },
  meru: {
    name: 'Meru Cabs',
    color: '#FFFFFF',
    rideTypes: [
      { id: 'meruhatch', name: 'Meru Hatchback', baseFare: 45, perKm: 11, perMin: 1.25, minFare: 60, category: 'sedan' },
      { id: 'merusedan', name: 'Meru Sedan', baseFare: 70, perKm: 15, perMin: 1.75, minFare: 90, category: 'sedan' }
    ],
    deepLinkBase: 'https://www.mfrucabs.com/'
  }
};

// City-specific fare multipliers (relative to base pricing)
const CITY_FARE_MULTIPLIERS = {
  mumbai: 1.15,
  delhi: 1.0,
  bangalore: 1.1,
  hyderabad: 0.95,
  chennai: 0.95,
  pune: 0.9,
  kolkata: 0.85,
  ahmedabad: 0.85,
  jaipur: 0.8,
  lucknow: 0.75,
  chandigarh: 0.8,
  goa: 1.05,
  kochi: 0.85,
  indore: 0.75,
  nagpur: 0.75
};

// Predefined routes with realistic distances (in km) for known pickup-drop combos
const KNOWN_ROUTES = {
  mumbai: [
    { keywords: ['airport', 'andheri'], distance: 6, duration: 20 },
    { keywords: ['airport', 'bandra'], distance: 12, duration: 35 },
    { keywords: ['airport', 'colaba'], distance: 30, duration: 65 },
    { keywords: ['airport', 'worli'], distance: 18, duration: 45 },
    { keywords: ['bandra', 'colaba'], distance: 22, duration: 50 },
    { keywords: ['andheri', 'dadar'], distance: 15, duration: 35 },
    { keywords: ['borivali', 'churchgate'], distance: 35, duration: 75 },
    { keywords: ['thane', 'bkc'], distance: 20, duration: 50 }
  ],
  delhi: [
    { keywords: ['airport', 'connaught'], distance: 16, duration: 40 },
    { keywords: ['airport', 'gurgaon'], distance: 12, duration: 30 },
    { keywords: ['airport', 'noida'], distance: 35, duration: 60 },
    { keywords: ['noida', 'gurgaon'], distance: 40, duration: 70 },
    { keywords: ['dwarka', 'karol bagh'], distance: 18, duration: 40 },
    { keywords: ['saket', 'connaught'], distance: 14, duration: 35 },
    { keywords: ['rohini', 'lajpat nagar'], distance: 22, duration: 50 }
  ],
  bangalore: [
    { keywords: ['airport', 'koramangala'], distance: 38, duration: 70 },
    { keywords: ['airport', 'whitefield'], distance: 40, duration: 65 },
    { keywords: ['airport', 'indiranagar'], distance: 35, duration: 60 },
    { keywords: ['koramangala', 'whitefield'], distance: 18, duration: 40 },
    { keywords: ['electronic city', 'mg road'], distance: 20, duration: 45 },
    { keywords: ['hsr layout', 'hebbal'], distance: 22, duration: 50 }
  ],
  hyderabad: [
    { keywords: ['airport', 'hitech city'], distance: 30, duration: 50 },
    { keywords: ['airport', 'secunderabad'], distance: 25, duration: 45 },
    { keywords: ['banjara hills', 'gachibowli'], distance: 12, duration: 30 },
    { keywords: ['hitech city', 'secunderabad'], distance: 18, duration: 40 }
  ],
  chennai: [
    { keywords: ['airport', 'tidel park'], distance: 14, duration: 30 },
    { keywords: ['airport', 'marina'], distance: 12, duration: 28 },
    { keywords: ['anna nagar', 't nagar'], distance: 8, duration: 22 }
  ],
  pune: [
    { keywords: ['airport', 'hinjewadi'], distance: 25, duration: 45 },
    { keywords: ['airport', 'koregaon park'], distance: 12, duration: 25 },
    { keywords: ['shivajinagar', 'hinjewadi'], distance: 20, duration: 40 }
  ]
};

/**
 * Estimate the distance and duration between two text locations in a city.
 * Tries to match known routes first, then falls back to a heuristic estimate.
 */
function estimateRouteMetrics(pickup, drop, city) {
  const p = pickup.toLowerCase();
  const d = drop.toLowerCase();
  const c = city.toLowerCase().replace(/\s+/g, '');

  // Check known routes
  const cityRoutes = KNOWN_ROUTES[c] || [];
  for (const route of cityRoutes) {
    const matchesForward = route.keywords.some(k => p.includes(k)) && route.keywords.some(k => d.includes(k));
    const matchesReverse = route.keywords.some(k => d.includes(k)) && route.keywords.some(k => p.includes(k));
    if (matchesForward || matchesReverse) {
      // Add some randomness
      const distJitter = (Math.random() - 0.5) * 4; // ±2km
      const durJitter = (Math.random() - 0.5) * 10; // ±5min
      return {
        distance: Math.max(2, Math.round((route.distance + distJitter) * 10) / 10),
        duration: Math.max(5, Math.round(route.duration + durJitter))
      };
    }
  }

  // Fallback: estimate based on string length heuristic + random
  const combinedLen = pickup.length + drop.length;
  const baseDistance = 5 + Math.floor(Math.random() * 25); // 5-30 km
  const baseDuration = Math.round(baseDistance * 2.5 + Math.random() * 15); // ~2.5 min/km + jitter

  return {
    distance: Math.max(2, baseDistance),
    duration: Math.max(5, baseDuration)
  };
}

/**
 * Check if a specific ride type is available at the given location.
 * Simulates real-world constraints (e.g., no bikes on highways, no autos at airports in some cities).
 */
function isRideAvailableAtLocation(rideCategory, pickup, drop, city) {
  const p = pickup.toLowerCase();
  const d = drop.toLowerCase();
  const c = city.toLowerCase();
  
  // Highway / expressway — no bikes or autos
  const isHighway = /\b(highway|expressway|freeway|toll|nh-|nh \d|elevated)\b/.test(p) || /\b(highway|expressway|freeway|toll|nh-|nh \d|elevated)\b/.test(d);
  if (isHighway && (rideCategory === 'bike' || rideCategory === 'auto')) {
    return { available: false, reason: 'Not available on highways' };
  }
  
  // Airport pickups — no autos in some cities (Mumbai, Delhi, Bangalore)
  const isAirport = /\b(airport|terminal|t1|t2|t3|arrivals|departures)\b/.test(p);
  if (isAirport && rideCategory === 'auto' && ['mumbai', 'delhi', 'bangalore'].includes(c)) {
    return { available: false, reason: 'Auto not allowed at airport' };
  }
  
  // Late night — fewer bikes available (simulate with probability)
  const hour = new Date().getHours();
  if (rideCategory === 'bike' && (hour >= 23 || hour <= 5)) {
    if (Math.random() < 0.5) {
      return { available: false, reason: 'Limited availability at night' };
    }
  }
  
  // SUVs not available in narrow/old city areas
  const isNarrowArea = /\b(old city|walled city|chandni chowk|dharavi|lanes|bylanes|gali|chawl)\b/.test(p) || /\b(old city|walled city|chandni chowk|dharavi|lanes|bylanes|gali|chawl)\b/.test(d);
  if (isNarrowArea && rideCategory === 'suv') {
    return { available: false, reason: 'SUV not recommended for this area' };
  }
  
  return { available: true, reason: null };
}

/**
 * Generate location-aware deep links for each cab platform.
 * Passes the pickup/drop location into the platform's booking URL.
 */
function getCabDeepLink(platformId, pickup, drop, city) {
  const p = encodeURIComponent(pickup + ', ' + city);
  const d = encodeURIComponent(drop + ', ' + city);
  
  switch (platformId) {
    case 'uber':
      // Uber deep link with pickup & drop
      return `https://m.uber.com/ul/?action=setPickup&pickup[formatted_address]=${p}&dropoff[0][formatted_address]=${d}`;
    case 'ola':
      return `https://book.olacabs.com/?pickup=${p}&drop=${d}`;
    case 'rapido':
      return `https://www.rapido.bike/?pickup=${p}&drop=${d}`;
    case 'indrive':
      return `https://indrive.com/order/?from=${p}&to=${d}`;
    case 'blusmart':
      return `https://www.blu-smart.com/ride?pickup=${p}&drop=${d}`;
    case 'nammayatri':
      return `https://nammayatri.in/book/?from=${p}&to=${d}`;
    case 'meru':
      return `https://www.merucabs.com/booking?pickup=${p}&drop=${d}`;
    default:
      return `https://www.google.com/maps/dir/${p}/${d}`;
  }
}

/**
 * Simulate fare for a specific cab platform and ride type.
 */
function simulateSingleFare(rideType, distance, duration, cityMultiplier, surgeMultiplier) {
  const rawFare = rideType.baseFare + (rideType.perKm * distance) + (rideType.perMin * duration);
  const fare = Math.max(rideType.minFare, Math.round(rawFare * cityMultiplier * surgeMultiplier));
  
  // Add some randomness (±8%)
  const jitter = 1 + (Math.random() - 0.5) * 0.16;
  const finalFare = Math.round(fare * jitter);

  return Math.max(rideType.minFare, finalFare);
}

/**
 * Generate a realistic surge multiplier based on time-of-day patterns.
 */
function getSurgeMultiplier() {
  const hour = new Date().getHours();
  // Peak hours: 8-10 AM, 5-9 PM, late night 11 PM-1 AM
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 21)) {
    return 1.0 + Math.random() * 0.8; // 1.0x - 1.8x during peak
  }
  if (hour >= 23 || hour <= 1) {
    return 1.2 + Math.random() * 0.5; // 1.2x - 1.7x late night
  }
  return 1.0 + Math.random() * 0.2; // 1.0x - 1.2x off-peak
}

/**
 * Compare fares across all cab platforms for a given route.
 */
export function compareCabFares(pickup, drop, city = 'Mumbai') {
  const cityKey = city.toLowerCase().replace(/\s+/g, '');
  const cityMultiplier = CITY_FARE_MULTIPLIERS[cityKey] || 1.0;
  const route = estimateRouteMetrics(pickup, drop, city);
  const surgeMultiplier = getSurgeMultiplier();

  const results = [];

  for (const [platformId, platform] of Object.entries(CAB_PLATFORMS)) {
    // Some platforms are city-limited
    if (platformId === 'nammayatri' && !['bangalore', 'delhi', 'hyderabad', 'chennai', 'kochi'].includes(cityKey)) {
      continue;
    }
    if (platformId === 'blusmart' && !['delhi', 'bangalore', 'mumbai', 'pune', 'hyderabad'].includes(cityKey)) {
      continue;
    }

    const platformSurge = platformId === 'blusmart' ? 1.0 : surgeMultiplier; // BluSmart has no surge pricing
    const rides = [];
    let availableCount = 0;

    for (const rideType of platform.rideTypes) {
      // Check location-based availability
      const availability = isRideAvailableAtLocation(rideType.category, pickup, drop, city);
      
      const fare = simulateSingleFare(rideType, route.distance, route.duration, cityMultiplier, platformSurge);
      const etaMinutes = 2 + Math.floor(Math.random() * 10); // 2-12 min ETA

      if (availability.available) availableCount++;

      rides.push({
        id: rideType.id,
        name: rideType.name,
        category: rideType.category,
        fare,
        fareFormatted: `₹${fare}`,
        eta: `${etaMinutes} min`,
        etaMinutes,
        surgeMultiplier: Math.round(platformSurge * 10) / 10,
        isSurging: platformSurge > 1.2,
        available: availability.available,
        unavailableReason: availability.reason
      });
    }

    // Sort rides: available first, then by fare
    rides.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.fare - b.fare;
    });

    const cheapestAvailable = rides.find(r => r.available) || rides[0];

    // Generate location-aware deep link
    const deepLink = getCabDeepLink(platformId, pickup, drop, city);

    results.push({
      platformId,
      platformName: platform.name,
      platformColor: platform.color,
      deepLink,
      cheapestFare: cheapestAvailable?.fare || 0,
      cheapestFareFormatted: cheapestAvailable?.fareFormatted || 'N/A',
      cheapestRideType: cheapestAvailable?.name || '',
      fastestEta: rides.filter(r => r.available).reduce((min, r) => r.etaMinutes < min ? r.etaMinutes : min, 999),
      availableRides: availableCount,
      totalRides: platform.rideTypes.length,
      rides
    });
  }

  // Sort platforms by cheapest fare
  results.sort((a, b) => a.cheapestFare - b.cheapestFare);

  // Compute stats
  const allFares = results.map(r => r.cheapestFare);
  const cheapestPlatform = results[0];
  const costliestPlatform = results[results.length - 1];
  const avgFare = allFares.length > 0 ? Math.round(allFares.reduce((a, b) => a + b, 0) / allFares.length) : 0;
  const potentialSavings = costliestPlatform && cheapestPlatform
    ? costliestPlatform.cheapestFare - cheapestPlatform.cheapestFare
    : 0;

  return {
    pickup,
    drop,
    city,
    route: {
      distanceKm: route.distance,
      durationMin: route.duration,
      distanceFormatted: `${route.distance} km`,
      durationFormatted: `${route.duration} min`
    },
    surgeActive: surgeMultiplier > 1.2,
    surgeMultiplier: Math.round(surgeMultiplier * 10) / 10,
    platforms: results,
    stats: {
      cheapest: cheapestPlatform ? { platform: cheapestPlatform.platformName, fare: cheapestPlatform.cheapestFareFormatted, rideType: cheapestPlatform.cheapestRideType } : null,
      costliest: costliestPlatform ? { platform: costliestPlatform.platformName, fare: costliestPlatform.cheapestFareFormatted } : null,
      avgFare,
      avgFareFormatted: `₹${avgFare}`,
      potentialSavings,
      potentialSavingsFormatted: `₹${potentialSavings}`,
      totalPlatforms: results.length
    }
  };
}
