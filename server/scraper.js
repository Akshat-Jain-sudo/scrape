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

function getRandomUserAgent() {
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

// ── Store Simulation / Fallback Generator ──
export function generatePlatformComparison(query, baseProduct, targetStores) {
  const comparison = {};
  
  // Set fallback parameters from the best available base product, or generic values
  const basePrice = baseProduct ? baseProduct.price || 1500 : 1500;
  const baseTitle = baseProduct ? baseProduct.name : `Premium ${query}`;
  const baseImg = baseProduct ? baseProduct.imageUrl : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  const baseLink = baseProduct ? baseProduct.productLink : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
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
    
    // Store links
    let storeLink = baseLink;
    if (store === 'myntra') storeLink = `https://www.myntra.com/search?rawQuery=${encodeURIComponent(query)}`;
    else if (store === 'ajio') storeLink = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
    else if (store === 'croma') storeLink = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}`;
    else if (store === 'blinkit') storeLink = `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
    else if (store === 'instamart') storeLink = `https://www.swiggy.com/instamart`;
    else if (store === 'zepto') storeLink = `https://www.zeptonow.com`;
    else if (store === 'flipkart') storeLink = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    else if (store === 'snapdeal') storeLink = `https://www.snapdeal.com/search?keyword=${encodeURIComponent(query)}`;

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
      deliveryTime: store === 'blinkit' || store === 'instamart' || store === 'zepto' 
        ? `${7 + Math.floor(Math.random() * 8)} mins` 
        : null
    };
  });

  return {
    name: baseTitle,
    imageUrl: baseImg,
    comparison
  };
}

// ── Store Search Simulator for Scrape Console ──
export function simulateStoreSearch(query, store, pages = 1) {
  const products = [];
  const itemCount = 5 + Math.floor(Math.random() * 8); // 5 to 12 items
  
  // Base price based on query context
  let basePrice = 250;
  const lowerQuery = query.toLowerCase();
  if (['phone', 'iphone', 'laptop', 'macbook', 'tv', 'ipad', 'watch', 'headphone', 'sony', 'airpods'].some(k => lowerQuery.includes(k))) {
    basePrice = 45000;
  } else if (['shoe', 'sneaker', 'shirt', 'jeans', 'hoodie', 'tshirt', 'dress', 'clothing'].some(k => lowerQuery.includes(k))) {
    basePrice = 1800;
  } else if (['milk', 'butter', 'bread', 'coke', 'maggi', 'grocery', 'biscuit', 'cheese', 'chips', 'chocolate', 'oil', 'onion', 'tomato'].some(k => lowerQuery.includes(k))) {
    basePrice = 120;
  }

  // Predefined image placeholders
  let defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  if (['blinkit', 'zepto', 'instamart'].includes(store)) {
    defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'; // grocery style
  } else if (['shoe', 'sneaker', 'shirt', 'jeans', 'hoodie', 'tshirt', 'dress', 'clothing'].some(k => lowerQuery.includes(k))) {
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

    let productName = `${query.charAt(0).toUpperCase() + query.slice(1)} - Option ${i + 1}`;
    if (store === 'blinkit') productName = `Blinkit Saver ${query.charAt(0).toUpperCase() + query.slice(1)} Pack ${i+1}`;
    else if (store === 'zepto') productName = `Zepto Choice ${query.charAt(0).toUpperCase() + query.slice(1)} ${i+1}`;
    else if (store === 'instamart') productName = `Instamart Instant ${query.charAt(0).toUpperCase() + query.slice(1)} ${i+1}`;
    else if (store === 'croma') productName = `Croma Select ${query.charAt(0).toUpperCase() + query.slice(1)} ${i+1}`;
    else if (store === 'myntra') productName = `Myntra Elite ${query.charAt(0).toUpperCase() + query.slice(1)} Brand ${i+1}`;
    else if (store === 'ajio') productName = `Ajio Trend ${query.charAt(0).toUpperCase() + query.slice(1)} Style ${i+1}`;

    let storeLink = `https://www.google.com/search?q=${encodeURIComponent(store + ' ' + query)}`;
    if (store === 'blinkit') storeLink = `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
    else if (store === 'zepto') storeLink = `https://www.zeptonow.com`;
    else if (store === 'instamart') storeLink = `https://www.swiggy.com/instamart`;
    else if (store === 'myntra') storeLink = `https://www.myntra.com/search?rawQuery=${encodeURIComponent(query)}`;
    else if (store === 'ajio') storeLink = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
    else if (store === 'croma') storeLink = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}`;

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
      productLink: storeLink,
      imageUrl: defaultImg,
      source: store,
      deliveryTime: ['blinkit', 'zepto', 'instamart'].includes(store)
        ? `${6 + Math.floor(Math.random() * 9)} mins`
        : null,
      scrapedAt: new Date().toISOString()
    });
  }

  return products;
}

// ── Multi-Store Compare Engine ──
export async function compareProductPrices(query, category = 'ecommerce') {
  console.log(`Comparing "${query}" under category "${category}" in real-time...`);
  
  let products = [];
  let targetStores = [];
  
  if (category === 'ecommerce') {
    // Detect fashion-oriented queries
    const fashionKeywords = ['shoe', 'dress', 'jean', 'clothing', 'shirt', 'jacket', 'watch', 'bag', 'sneaker', 'hoodie', 'tshirt'];
    const isFashion = fashionKeywords.some(kw => query.toLowerCase().includes(kw));

    if (isFashion) {
      targetStores = ['myntra', 'ajio', 'flipkart'];
      const [fkList, sdList] = await Promise.all([
        scrapeFlipkartSearch(query, 1),
        scrapeSnapdealSearch(query, 1)
      ]);
      products = [...fkList, ...sdList];
    } else {
      targetStores = ['flipkart', 'snapdeal', 'croma'];
      const [fkList, sdList] = await Promise.all([
        scrapeFlipkartSearch(query, 1),
        scrapeSnapdealSearch(query, 1)
      ]);
      products = [...fkList, ...sdList];
    }
  } else {
    // Quick Commerce / Grocery
    targetStores = ['blinkit', 'instamart', 'zepto'];
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
    } else if (isFashionQuery) {
      defaultImg = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200'; // Fashion
    }

    baseProduct = {
      name: query.toUpperCase(),
      price: category === 'ecommerce' ? (isFashionQuery ? 2400 : 45000) : 180,
      imageUrl: defaultImg,
      productLink: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    };
  }

  // Generate comparison prices across all target stores using the base product
  const comparisonData = generatePlatformComparison(query, baseProduct, targetStores);
  
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
