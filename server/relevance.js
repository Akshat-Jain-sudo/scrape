/**
 * Relevance & Quality Scoring Engine for Symbiote Product Search
 * 
 * Provides deterministic, high-speed relevance calculation, brand/category intent
 * detection, cross-category mismatch rejection, query normalization, and ranking.
 */

// ── Stop Words ──
const STOP_WORDS = new Set([
  'for', 'in', 'the', 'with', 'and', 'of', 'a', 'an', 'on', 'at', 'by', 'to', 'is',
  'all', 'best', 'top', 'deals', 'buy', 'online', 'india', 'price', 'new', 'latest',
  'original', 'genuine', 'pack', 'set', 'combo', 'free', 'off', 'delivery'
]);

// ── Compound Word Normalization ──
const COMPOUND_REPLACEMENTS = [
  [/\bt[\s-]?shirt(s)?\b/gi, 'tshirt'],
  [/\bt[\s-]?shirts\b/gi, 'tshirt'],
  [/\bair[\s-]?max\b/gi, 'air max'],
  [/\bair[\s-]?pods\b/gi, 'airpods'],
  [/\bair[\s-]?pod\b/gi, 'airpods'],
  [/\bwi[\s-]?fi\b/gi, 'wifi'],
  [/\bpower[\s-]?bank(s)?\b/gi, 'powerbank'],
  [/\bear[\s-]?bud(s)?\b/gi, 'earbuds'],
  [/\bear[\s-]?phone(s)?\b/gi, 'earphones'],
  [/\bhead[\s-]?phone(s)?\b/gi, 'headphones'],
  [/\bsmart[\s-]?watch(es)?\b/gi, 'smartwatch'],
  [/\bsmart[\s-]?phone(s)?\b/gi, 'smartphone'],
  [/\bflip[\s-]?flop(s)?\b/gi, 'flipflops'],
  [/\bmac[\s-]?book\b/gi, 'macbook'],
  [/\bray[\s-]?ban\b/gi, 'rayban'],
  [/\bfire[\s-]?boltt?\b/gi, 'fireboltt'],
  [/\btitan[\s-]?eye\b/gi, 'titaneyeplus']
];

// ── Stemming Map for Common Plurals & Variations ──
const STEM_DICTIONARY = {
  'shoes': 'shoe',
  'sneakers': 'sneaker',
  'boots': 'boot',
  'sandals': 'sandal',
  'slippers': 'slipper',
  'heels': 'heel',
  'loafers': 'loafer',
  'crocs': 'croc',
  'chappals': 'chappal',
  'slides': 'slide',
  'shirts': 'shirt',
  'tshirts': 'tshirt',
  'tshirt': 'tshirt',
  'jeans': 'jean',
  'hoodies': 'hoodie',
  'sweatshirts': 'sweatshirt',
  'jackets': 'jacket',
  'dresses': 'dress',
  'sarees': 'saree',
  'kurtas': 'kurta',
  'kurtis': 'kurta',
  'trousers': 'trouser',
  'pants': 'pant',
  'suits': 'suit',
  'blazers': 'blazer',
  'skirts': 'skirt',
  'sweaters': 'sweater',
  'watches': 'watch',
  'smartwatches': 'smartwatch',
  'clocks': 'clock',
  'headphones': 'headphone',
  'earphones': 'earphone',
  'earbuds': 'earbud',
  'buds': 'earbud',
  'speakers': 'speaker',
  'soundbars': 'soundbar',
  'laptops': 'laptop',
  'mobiles': 'phone',
  'phones': 'phone',
  'smartphones': 'phone',
  'tablets': 'tablet',
  'ipads': 'ipad',
  'televisions': 'tv',
  'tvs': 'tv',
  'refrigerators': 'fridge',
  'fridges': 'fridge',
  'microwaves': 'microwave',
  'ovens': 'oven',
  'coolers': 'cooler',
  'glasses': 'glass',
  'sunglasses': 'sunglass',
  'frames': 'frame',
  'spectacles': 'spectacle',
  'goggles': 'goggle',
  'lipsticks': 'lipstick',
  'creams': 'cream',
  'lotions': 'lotion',
  'shampoos': 'shampoo',
  'serums': 'serum',
  'perfumes': 'perfume',
  'mattresses': 'mattress',
  'pillows': 'pillow',
  'sofas': 'sofa',
  'chairs': 'chair',
  'tables': 'table',
  'cookers': 'cooker',
  'pans': 'pan',
  'pots': 'pot',
  'plates': 'plate',
  'bottles': 'bottle',
  'novels': 'book',
  'books': 'book',
  'comics': 'comic',
  'chocolates': 'chocolate',
  'biscuits': 'biscuit',
  'cookies': 'cookie',
  'noodles': 'noodle'
};

// ── Major Brands Dictionary ──
export const KNOWN_BRANDS = {
  // Tech / Electronics / Mobile
  apple: { domain: 'tech', canonical: 'Apple', aliases: ['apple', 'iphone', 'ipad', 'macbook', 'airpods'] },
  samsung: { domain: 'tech', canonical: 'Samsung', aliases: ['samsung', 'galaxy'] },
  sony: { domain: 'tech', canonical: 'Sony', aliases: ['sony', 'bravia', 'playstation'] },
  oneplus: { domain: 'tech', canonical: 'OnePlus', aliases: ['oneplus', 'nord'] },
  xiaomi: { domain: 'tech', canonical: 'Xiaomi', aliases: ['xiaomi', 'redmi', 'mi', 'poco'] },
  realme: { domain: 'tech', canonical: 'Realme', aliases: ['realme', 'narzo'] },
  vivo: { domain: 'tech', canonical: 'Vivo', aliases: ['vivo', 'iqoo'] },
  oppo: { domain: 'tech', canonical: 'Oppo', aliases: ['oppo', 'reno'] },
  motorola: { domain: 'tech', canonical: 'Motorola', aliases: ['motorola', 'moto'] },
  dell: { domain: 'tech', canonical: 'Dell', aliases: ['dell', 'alienware', 'inspiron', 'xps', 'vostro'] },
  hp: { domain: 'tech', canonical: 'HP', aliases: ['hp', 'pavilion', 'omen', 'victus', 'envy'] },
  lenovo: { domain: 'tech', canonical: 'Lenovo', aliases: ['lenovo', 'thinkpad', 'ideapad', 'legion', 'yoga'] },
  asus: { domain: 'tech', canonical: 'Asus', aliases: ['asus', 'rog', 'zenbook', 'vivobook', 'tuf'] },
  acer: { domain: 'tech', canonical: 'Acer', aliases: ['acer', 'predator', 'nitro', 'aspire', 'swift'] },
  lg: { domain: 'tech', canonical: 'LG', aliases: ['lg', 'gram', 'oled'] },
  boat: { domain: 'audio', canonical: 'boAt', aliases: ['boat', 'rockerz', 'airdopes', 'storm'] },
  noise: { domain: 'audio', canonical: 'Noise', aliases: ['noise', 'colorfit', 'airbuds'] },
  boult: { domain: 'audio', canonical: 'Boult', aliases: ['boult', 'drift', 'audio'] },
  mivi: { domain: 'audio', canonical: 'Mivi', aliases: ['mivi', 'duopods'] },
  fireboltt: { domain: 'audio', canonical: 'Fire-Boltt', aliases: ['fireboltt', 'fire boltt'] },
  jbl: { domain: 'audio', canonical: 'JBL', aliases: ['jbl', 'flip', 'charge', 'tune'] },
  sennheiser: { domain: 'audio', canonical: 'Sennheiser', aliases: ['sennheiser', 'momentum', 'accentum'] },
  zebronics: { domain: 'tech', canonical: 'Zebronics', aliases: ['zebronics', 'zeb'] },

  // Footwear & Sportswear
  nike: { domain: 'footwear_sports', canonical: 'Nike', aliases: ['nike', 'jordan', 'air max', 'dunk', 'blazer'] },
  adidas: { domain: 'footwear_sports', canonical: 'Adidas', aliases: ['adidas', 'ultraboost', 'yeezy', 'originals', 'stan smith', 'samba'] },
  puma: { domain: 'footwear_sports', canonical: 'Puma', aliases: ['puma', 'suede', 'smash', 'nitro'] },
  reebok: { domain: 'footwear_sports', canonical: 'Reebok', aliases: ['reebok', 'classic', 'nano', 'club c'] },
  bata: { domain: 'footwear', canonical: 'Bata', aliases: ['bata', 'hush puppies', 'power', 'comfit', 'north star'] },
  woodland: { domain: 'footwear', canonical: 'Woodland', aliases: ['woodland', 'woods'] },
  crocs: { domain: 'footwear', canonical: 'Crocs', aliases: ['crocs', 'clog', 'clogs'] },
  skechers: { domain: 'footwear', canonical: 'Skechers', aliases: ['skechers', 'go walk', 'd lites'] },
  asics: { domain: 'footwear_sports', canonical: 'ASICS', aliases: ['asics', 'gel', 'kayano', 'nimbus'] },
  campus: { domain: 'footwear', canonical: 'Campus', aliases: ['campus'] },
  relaxo: { domain: 'footwear', canonical: 'Relaxo', aliases: ['relaxo', 'sparx', 'flite', 'bahamas'] },
  paragon: { domain: 'footwear', canonical: 'Paragon', aliases: ['paragon'] },
  liberty: { domain: 'footwear', canonical: 'Liberty', aliases: ['liberty', 'senorita', 'gliders'] },
  mochi: { domain: 'footwear', canonical: 'Mochi', aliases: ['mochi'] },
  metro: { domain: 'footwear', canonical: 'Metro', aliases: ['metro'] },
  redtape: { domain: 'fashion', canonical: 'Red Tape', aliases: ['redtape', 'red tape'] },

  // Fashion & Apparel
  levis: { domain: 'apparel', canonical: "Levi's", aliases: ['levis', "levi's", '511', '501', '512', '513', '514'] },
  zara: { domain: 'apparel', canonical: 'Zara', aliases: ['zara'] },
  hm: { domain: 'apparel', canonical: 'H&M', aliases: ['hm', 'h&m'] },
  uniqlo: { domain: 'apparel', canonical: 'Uniqlo', aliases: ['uniqlo', 'airism', 'heattech'] },
  uspolo: { domain: 'apparel', canonical: 'U.S. Polo Assn.', aliases: ['us polo', 'uspa', 'uspoloassn'] },
  tommy: { domain: 'apparel', canonical: 'Tommy Hilfiger', aliases: ['tommy hilfiger', 'tommy'] },
  calvin: { domain: 'apparel', canonical: 'Calvin Klein', aliases: ['calvin klein', 'ck'] },
  marksandspencer: { domain: 'apparel', canonical: 'Marks & Spencer', aliases: ['marks & spencer', 'marks and spencer', 'm&s'] },
  superdry: { domain: 'apparel', canonical: 'Superdry', aliases: ['superdry'] },
  spykar: { domain: 'apparel', canonical: 'Spykar', aliases: ['spykar'] },
  manyavar: { domain: 'apparel', canonical: 'Manyavar', aliases: ['manyavar', 'mohey'] },
  fabindia: { domain: 'apparel', canonical: 'FabIndia', aliases: ['fabindia'] },
  biba: { domain: 'apparel', canonical: 'Biba', aliases: ['biba'] },
  soch: { domain: 'apparel', canonical: 'Soch', aliases: ['soch'] },
  libas: { domain: 'apparel', canonical: 'Libas', aliases: ['libas'] },
  bewakoof: { domain: 'apparel', canonical: 'Bewakoof', aliases: ['bewakoof'] },
  snitch: { domain: 'apparel', canonical: 'Snitch', aliases: ['snitch'] },
  souledstore: { domain: 'apparel', canonical: 'The Souled Store', aliases: ['souledstore', 'souled store'] },

  // Eyewear & Watches
  rayban: { domain: 'eyewear', canonical: 'Ray-Ban', aliases: ['rayban', 'ray ban', 'aviator', 'wayfarer'] },
  lenskart: { domain: 'eyewear', canonical: 'Lenskart', aliases: ['lenskart', 'vincent chase', 'john jacobs'] },
  titan: { domain: 'watches', canonical: 'Titan', aliases: ['titan', 'raga', 'octane', 'edge'] },
  fastrack: { domain: 'watches', canonical: 'Fastrack', aliases: ['fastrack'] },
  casio: { domain: 'watches', canonical: 'Casio', aliases: ['casio', 'g shock', 'g-shock', 'edifice', 'vintage'] },
  fossil: { domain: 'watches', canonical: 'Fossil', aliases: ['fossil', 'gen 6'] },
  sonata: { domain: 'watches', canonical: 'Sonata', aliases: ['sonata'] },

  // Beauty
  nykaa: { domain: 'beauty', canonical: 'Nykaa', aliases: ['nykaa'] },
  maybelline: { domain: 'beauty', canonical: 'Maybelline', aliases: ['maybelline', 'fit me', 'colossal'] },
  lakme: { domain: 'beauty', canonical: 'Lakme', aliases: ['lakme', '9to5'] },
  mamaearth: { domain: 'beauty', canonical: 'Mamaearth', aliases: ['mamaearth'] },
  minimalist: { domain: 'beauty', canonical: 'Minimalist', aliases: ['minimalist', 'be minimalist'] }
};

// ── Category Intent Keywords ──
export const CATEGORY_INTENT_MAP = {
  footwear: [
    'shoe', 'sneaker', 'boot', 'sandal', 'slipper', 'heel', 'loafer', 'croc',
    'chappal', 'slide', 'flipflop', 'cleats', 'footwear', 'clog', 'trainer',
    'air max', 'stan smith', 'ultraboost', 'superstar', 'suede', 'downshifter', 'revolution'
  ],
  apparel: [
    'shirt', 'tshirt', 'jeans', 'jean', 'jacket', 'hoodie', 'sweatshirt', 'dress',
    'saree', 'kurta', 'top', 'trouser', 'pant', 'suit', 'blazer', 'skirt', 'shorts',
    'trackpant', 'clothing', 'wear', 'innerwear', 'sweater', 'gown', 'lehenga', 'kurti'
  ],
  smartphones: [
    'iphone', 'smartphone', 'mobile', 'android', 'phone', 'galaxy', 'nord',
    'redmi', 'poco', 'iqoo', 'realme', 'oneplus', 'pixel', 'snapdragon', '5g'
  ],
  computing: [
    'laptop', 'macbook', 'desktop', 'pc', 'computer', 'monitor', 'chromebook', 'notebook',
    'pavilion', 'ideapad', 'inspiron', 'thinkpad', 'vivobook', 'zenbook', 'victus', 'omen',
    'nitro', 'predator', 'legion', 'yoga', 'vostro', 'latitude', 'elitebook',
    'core i3', 'core i5', 'core i7', 'core i9', 'ryzen'
  ],
  audio: [
    'headphone', 'earphone', 'earbud', 'airpods', 'speaker', 'soundbar', 'buds', 'tws'
  ],
  wearables: [
    'smartwatch', 'band', 'fitness tracker', 'smart watch'
  ],
  watches: [
    'watch', 'timepiece', 'chronograph', 'clock'
  ],
  bags: [
    'bag', 'backpack', 'wallet', 'handbag', 'purse', 'luggage', 'suitcase', 'trolley', 'duffel', 'tote', 'rucksack'
  ],
  eyewear: [
    'sunglass', 'glasses', 'spectacle', 'lens', 'shades', 'goggles', 'frames'
  ],
  appliances: [
    'tv', 'television', 'fridge', 'refrigerator', 'washing machine', 'air conditioner', 'ac', 'microwave', 'oven', 'cooler', 'air fryer', 'fryer'
  ],
  beauty: [
    'lipstick', 'makeup', 'face cream', 'skin cream', 'body cream', 'night cream', 'day cream',
    'cold cream', 'bb cream', 'cc cream', 'lotion', 'shampoo', 'serum', 'perfume', 'fragrance',
    'cosmetics', 'sunscreen', 'moisturizer', 'face wash', 'cleanser', 'soap', 'scrub', 'toner',
    'kajal', 'eyeliner', 'mascara'
  ],
  home_kitchen: [
    'furniture', 'sofa', 'bed', 'mattress', 'table', 'chair', 'cooker', 'pan', 'pot', 'plate', 'induction', 'kettle', 'bottle', 'air fryer'
  ],
  food_grocery: [
    'pizza', 'burger', 'biryani', 'milk', 'butter', 'bread', 'rice', 'dal', 'oil', 'sugar', 'tea', 'coffee', 'chicken', 'noodles'
  ]
};

// ── Orthogonal / Mutually Incompatible Categories ──
export const INCOMPATIBLE_CATEGORIES = {
  footwear: new Set(['smartphones', 'computing', 'audio', 'appliances', 'home_kitchen', 'food_grocery', 'beauty']),
  apparel: new Set(['smartphones', 'computing', 'appliances', 'food_grocery']),
  smartphones: new Set(['footwear', 'apparel', 'home_kitchen', 'food_grocery', 'beauty', 'eyewear', 'appliances', 'bags']),
  computing: new Set(['footwear', 'apparel', 'home_kitchen', 'food_grocery', 'beauty', 'eyewear']),
  audio: new Set(['footwear', 'apparel', 'home_kitchen', 'food_grocery', 'beauty', 'eyewear', 'bags']),
  bags: new Set(['smartphones', 'computing', 'audio', 'appliances', 'food_grocery', 'beauty']),
  beauty: new Set(['smartphones', 'computing', 'audio', 'appliances', 'footwear', 'home_kitchen', 'food_grocery', 'bags']),
  home_kitchen: new Set(['smartphones', 'computing', 'audio', 'footwear', 'beauty', 'bags']),
  food_grocery: new Set(['smartphones', 'computing', 'audio', 'footwear', 'eyewear', 'appliances', 'beauty', 'watches', 'bags'])
};

/**
 * Normalizes text: lowercases, applies compound replacements, strips non-alphanumeric punctuation.
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let norm = text.toLowerCase().trim();

  // Apply compound normalizations
  for (const [pattern, replacement] of COMPOUND_REPLACEMENTS) {
    norm = norm.replace(pattern, replacement);
  }

  // Replace special characters / punctuation with space, preserving alphanumeric
  norm = norm.replace(/[^\w\s]/g, ' ');

  // Normalize unit suffixes (e.g., 16 gb -> 16gb, 256 gb -> 256gb, 5 g -> 5g)
  norm = norm.replace(/\b(\d+)\s+(gb|tb|mb|ram|ssd|inch|hz|mp|w|mah)\b/gi, '$1$2');
  
  // Collapse whitespace
  norm = norm.replace(/\s+/g, ' ').trim();
  return norm;
}

/**
 * Converts a word to its canonical singular/stemmed form.
 */
export function stemWord(word) {
  if (!word || word.length <= 2) return word;
  const lower = word.toLowerCase();
  
  if (STEM_DICTIONARY[lower]) {
    return STEM_DICTIONARY[lower];
  }

  // Basic English inflection rules
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('es') && lower.length > 4 && !lower.endsWith('ches') && !lower.endsWith('shes')) {
    return lower.slice(0, -1);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    return lower.slice(0, -1);
  }
  return lower;
}

/**
 * Tokenizes text into stemmed, non-stopword tokens.
 */
export function tokenizeText(text, includeStopwords = false) {
  const norm = normalizeText(text);
  if (!norm) return [];

  const rawTokens = norm.split(/\s+/).filter(Boolean);
  const tokens = [];

  for (const t of rawTokens) {
    if (!includeStopwords && STOP_WORDS.has(t)) {
      continue;
    }
    tokens.push(stemWord(t));
  }

  return tokens;
}

/**
 * Detects known brands mentioned in text.
 */
export function detectBrands(text) {
  const norm = ` ${normalizeText(text)} `;
  const detected = [];

  for (const [key, brand] of Object.entries(KNOWN_BRANDS)) {
    for (const alias of brand.aliases) {
      const aliasNorm = normalizeText(alias);
      if (norm.includes(` ${aliasNorm} `)) {
        detected.push({ key, brand });
        break;
      }
    }
  }

  return detected;
}

/**
 * Detects primary category intents from text.
 */
export function detectCategoryIntents(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  const tokens = tokenizeText(text, true);
  const paddedNorm = ` ${norm} `;
  const intents = new Set();

  for (const [category, keywords] of Object.entries(CATEGORY_INTENT_MAP)) {
    for (const kw of keywords) {
      const stemmedKw = stemWord(kw);
      if (tokens.includes(stemmedKw) || paddedNorm.includes(` ${normalizeText(kw)} `)) {
        intents.add(category);
        break;
      }
    }
  }

  // Disambiguation: if text refers to a bag (e.g. laptop backpack, laptop bag), suppress computing
  if (intents.has('bags') && intents.has('computing')) {
    if (/\b(backpack|bag|wallet|handbag|purse|luggage|suitcase|duffel|tote)\b/.test(norm)) {
      const hasRealPcKeywords = /\b(desktop|monitor|chromebook|intel core|ryzen|macbook|geforce|rtx)\b/.test(norm);
      if (!hasRealPcKeywords) {
        intents.delete('computing');
      }
    }
  }

  // Disambiguation: Adidas Galaxy / sports footwear with phone model names
  if (intents.has('smartphones') && intents.has('footwear')) {
    if (/\b(shoe|shoes|sneaker|sneakers|running|footwear|sandal|clog|boot)\b/.test(norm)) {
      const hasRealPhoneKeywords = /\b(mobile|smartphone|phone|android|iphone|snapdragon|sim)\b/.test(norm);
      if (!hasRealPhoneKeywords) {
        intents.delete('smartphones');
      }
    }
  }

  return Array.from(intents);
}

/**
 * Calculates a comprehensive relevance score (0.0 to 1.0) and accept/reject decision.
 * 
 * @param {string} query - Raw user search query
 * @param {string|object} product - Raw product title or product object
 * @param {object} options - Options including debug, threshold
 * @returns {object} { score, accepted, reason, details }
 */
export function calculateRelevanceScore(query, product, options = {}) {
  const title = typeof product === 'object' && product !== null ? (product.name || product.title || '') : String(product || '');
  const threshold = typeof options.threshold === 'number' ? options.threshold : 0.35;
  const isDev = process.env.NODE_ENV !== 'production' || options.debug === true;

  if (!query || !query.trim() || !title || !title.trim()) {
    return {
      score: 0.0,
      accepted: false,
      reason: 'Empty query or title',
      details: {}
    };
  }

  const normQuery = normalizeText(query);
  const normTitle = normalizeText(title);

  const queryTokens = tokenizeText(query);
  const titleTokens = tokenizeText(title);

  // If query consists solely of stop words, use all words
  const effectiveQueryTokens = queryTokens.length > 0 ? queryTokens : normalizeText(query).split(/\s+/);
  const effectiveTitleTokens = titleTokens.length > 0 ? titleTokens : normalizeText(title).split(/\s+/);

  // ── 1. Brand Detection & Conflict Check ──
  const queryBrands = detectBrands(query);
  const titleBrands = detectBrands(title);

  let brandConflict = false;
  let brandMatch = false;

  if (queryBrands.length > 0) {
    const queryBrandKeys = new Set(queryBrands.map(b => b.key));
    const titleBrandKeys = new Set(titleBrands.map(b => b.key));

    const matchedBrand = queryBrands.find(b => titleBrandKeys.has(b.key));
    if (matchedBrand) {
      brandMatch = true;
    } else if (titleBrands.length > 0) {
      // Query explicitly wanted brand A, but title has brand B without brand A
      // Check if title brand is from an incompatible domain or competing brand
      const competingBrand = titleBrands[0];
      const queryBrand = queryBrands[0];

      if (queryBrand.brand.domain !== competingBrand.brand.domain || queryBrand.key !== competingBrand.key) {
        brandConflict = true;
      }
    }
  }

  // ── 2. Category Intent & Cross-Category Incompatibility Check ──
  const queryCategories = detectCategoryIntents(query);
  const titleCategories = detectCategoryIntents(title);

  let categoryConflict = false;
  let categoryMatch = false;

  if (queryCategories.length > 0) {
    for (const qCat of queryCategories) {
      if (titleCategories.includes(qCat)) {
        categoryMatch = true;
      }
      
      const incompatibleWithQ = INCOMPATIBLE_CATEGORIES[qCat];
      if (incompatibleWithQ) {
        for (const tCat of titleCategories) {
          if (incompatibleWithQ.has(tCat)) {
            categoryConflict = true;
            break;
          }
        }
      }
    }
  }

  // ── 3. Hard Rejection for Orthogonal Collisions ──
  if (categoryConflict) {
    const reason = `Cross-category conflict (query: [${queryCategories.join(', ')}] vs product: [${titleCategories.join(', ')}])`;
    if (isDev) {
      console.log(`[Relevance Filter] Query: "${query}" | Title: "${title.substring(0, 45)}..." | Score: 0.00 | Decision: REJECT | Reason: ${reason}`);
    }
    return {
      score: 0.0,
      accepted: false,
      reason,
      details: { queryCategories, titleCategories, brandConflict, categoryConflict }
    };
  }

  if (brandConflict && !categoryMatch) {
    const reason = `Brand mismatch conflict (query: [${queryBrands.map(b => b.key).join(', ')}] vs product: [${titleBrands.map(b => b.key).join(', ')}])`;
    if (isDev) {
      console.log(`[Relevance Filter] Query: "${query}" | Title: "${title.substring(0, 45)}..." | Score: 0.00 | Decision: REJECT | Reason: ${reason}`);
    }
    return {
      score: 0.0,
      accepted: false,
      reason,
      details: { queryBrands, titleBrands, brandConflict, categoryConflict }
    };
  }

  // ── 4. Positive Relevance Signals ──
  // A. Token Coverage (0.0 to 0.50)
  let matchedTokensCount = 0;
  for (const qToken of effectiveQueryTokens) {
    if (effectiveTitleTokens.includes(qToken) || normTitle.includes(qToken)) {
      matchedTokensCount++;
    }
  }
  const tokenCoverage = effectiveQueryTokens.length > 0 ? matchedTokensCount / effectiveQueryTokens.length : 0;
  const coverageScore = tokenCoverage * 0.50;

  // B. Exact Phrase & Proximity Match (0.0 to 0.25)
  let phraseScore = 0.0;
  if (normTitle.includes(normQuery)) {
    phraseScore = 0.25;
  } else {
    const nonStopQuery = effectiveQueryTokens.join(' ');
    if (nonStopQuery && normTitle.includes(nonStopQuery)) {
      phraseScore = 0.20;
    } else if (tokenCoverage === 1.0) {
      phraseScore = 0.15;
    }
  }

  // C. Brand Match Bonus (0.15)
  const brandScore = brandMatch ? 0.15 : (queryBrands.length === 0 ? 0.05 : 0.0);

  // D. Category Match Bonus (0.10 base, or 0.45 for pure single/dual token category searches)
  let categoryScore = 0.0;
  if (categoryMatch) {
    if (effectiveQueryTokens.length <= 2 && queryCategories.length > 0 && tokenCoverage < 0.5) {
      // Pure category intent query (e.g. "laptop", "phone", "shoes", "gaming laptop") where model name matched category
      categoryScore = 0.45;
    } else {
      categoryScore = 0.10;
    }
  } else if (queryCategories.length === 0) {
    categoryScore = 0.05;
  }

  // Total raw score
  let totalScore = phraseScore + coverageScore + brandScore + categoryScore;

  // Penalty if less than 50% of query tokens matched on multi-token searches (only when not a category match)
  if (effectiveQueryTokens.length >= 2 && tokenCoverage < 0.5 && !categoryMatch) {
    totalScore = Math.max(0, totalScore - 0.25);
  }

  // Cap score at 1.0
  const finalScore = Math.min(1.0, Math.max(0.0, parseFloat(totalScore.toFixed(2))));
  const accepted = finalScore >= threshold;
  const reason = accepted ? 'Passed relevance threshold' : `Low relevance score (${finalScore.toFixed(2)} < ${threshold})`;

  if (isDev && options.logAll) {
    console.log(`[Relevance Filter] Query: "${query}" | Title: "${title.substring(0, 45)}..." | Score: ${finalScore.toFixed(2)} | Decision: ${accepted ? 'ACCEPT' : 'REJECT'} | Reason: ${reason}`);
  }

  return {
    score: finalScore,
    accepted,
    reason,
    details: {
      phraseScore,
      coverageScore,
      tokenCoverage,
      brandScore,
      categoryScore,
      queryBrands: queryBrands.map(b => b.key),
      titleBrands: titleBrands.map(b => b.key),
      queryCategories,
      titleCategories
    }
  };
}

/**
 * Filters a list of products by relevance, deduplicates them, and sorts by score descending.
 */
export function filterAndRankProducts(query, products, options = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      products: [],
      stats: { totalInput: 0, accepted: 0, rejected: 0 }
    };
  }

  const threshold = typeof options.threshold === 'number' ? options.threshold : 0.35;
  const scoredProducts = [];
  let rejectedCount = 0;

  for (const prod of products) {
    if (!prod) continue;
    const title = prod.name || prod.title || '';
    const res = calculateRelevanceScore(query, title, { ...options, threshold });

    if (res.accepted) {
      scoredProducts.push({
        ...prod,
        relevanceScore: res.score,
        relevanceReason: res.reason
      });
    } else {
      rejectedCount++;
    }
  }

  // Deduplicate by source + normalized title
  const seen = new Set();
  const uniqueProducts = [];

  for (const prod of scoredProducts) {
    const norm = normalizeText(prod.name || prod.title || '');
    const key = `${prod.source || 'store'}-${norm}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueProducts.push(prod);
    }
  }

  // Sort by relevance score descending, then by ratingsCount descending
  uniqueProducts.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return (b.ratingsCount || 0) - (a.ratingsCount || 0);
  });

  return {
    products: uniqueProducts,
    stats: {
      totalInput: products.length,
      accepted: uniqueProducts.length,
      rejected: rejectedCount
    }
  };
}

/**
 * Validates whether a product is a legitimate base product for comparative search.
 */
export function validateBaseProduct(query, product) {
  if (!product) return false;
  const title = product.name || product.title || '';
  const evalResult = calculateRelevanceScore(query, title, { threshold: 0.40 });
  return evalResult.accepted;
}
