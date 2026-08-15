/**
 * Product URL Validation, Canonicalization & Quality Module
 * 
 * Ensures every product URL is accurately classified (exact product vs search vs invalid),
 * removes tracking noise safely, normalizes relative URLs to absolute URLs, and prevents
 * generic retailer homepages or search URLs from masquerading as exact product pages.
 */

// ── Generic & Search URL Patterns to Reject as Exact Product Pages ──
const GENERIC_SEARCH_PATTERNS = [
  /\/search(?:\/|\.|\?|$)/i,
  /\/s\?(?:.*&)?(?:k|q|keyword)=/i,
  /\/catalogsearch\/result\//i,
  /\/shop\/search/i,
  /\/trade\/search/i,
  /\/site_product\/search/i,
  /\/searchbooks/i,
  /\/sch\/i\.html/i,
  /\/w\/wholesale-/i,
  /\/category(?:\/|\.|\?|$)/i,
  /\/categories(?:\/|\.|\?|$)/i,
  /\/products(?:\/|\.|\?|$)/i,
  /\/grocery-supermart-store/i,
  /\/fresh(?:\/|\.|\?|$)/i,
  /\/instamart(?:\/|\.|\?|$)/i,
  /\/cart(?:\/|\.|\?|$)/i,
  /\/checkout(?:\/|\.|\?|$)/i,
  /\/account(?:\/|\.|\?|$)/i
];

// ── Retailer Exact Product Detail Page Signatures ──
const PRODUCT_PAGE_SIGNATURES = {
  flipkart: {
    hostnameRegex: /(?:^|\.)flipkart\.com$/i,
    productPathRegex: /\/p\/[a-zA-Z0-9]+|\/itm[a-zA-Z0-9]+/i,
    pidParamName: 'pid'
  },
  snapdeal: {
    hostnameRegex: /(?:^|\.)snapdeal\.com$/i,
    productPathRegex: /\/product\/[^\/]+\/\d+/i
  },
  amazon: {
    hostnameRegex: /(?:^|\.)amazon\.(?:in|com)$/i,
    productPathRegex: /\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i
  },
  myntra: {
    hostnameRegex: /(?:^|\.)myntra\.com$/i,
    productPathRegex: /\/\d+\/buy$|\/[^\/]+\/[^\/]+\/[^\/]+\/\d+\/buy/i
  },
  ajio: {
    hostnameRegex: /(?:^|\.)ajio\.com$/i,
    productPathRegex: /\/p\/\d+/i
  },
  nykaa: {
    hostnameRegex: /(?:^|\.)nykaa\.com$/i,
    productPathRegex: /\/p\/\d+/i
  },
  croma: {
    hostnameRegex: /(?:^|\.)croma\.com$/i,
    productPathRegex: /\/p\/\d+/i
  },
  tataCliq: {
    hostnameRegex: /(?:^|\.)tatacliq\.com$/i,
    productPathRegex: /\/p-mp\d+/i
  },
  zomato: {
    hostnameRegex: /(?:^|\.)zomato\.com$/i,
    productPathRegex: /\/[^\/]+\/[^\/]+-order$/i
  },
  swiggy: {
    hostnameRegex: /(?:^|\.)swiggy\.com$/i,
    productPathRegex: /\/restaurants\/[^\/]+-\d+$/i
  }
};

/**
 * Normalizes relative URLs to absolute URLs and cleans malformed protocols.
 */
export function toAbsoluteUrl(rawUrl, baseHost = 'https://www.flipkart.com') {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).toString();
    }
    if (trimmed.startsWith('//')) {
      return new URL(`https:${trimmed}`).toString();
    }
    if (trimmed.startsWith('/')) {
      const base = baseHost.startsWith('http') ? baseHost : `https://${baseHost}`;
      return new URL(trimmed, base).toString();
    }
    // Handle bare path without leading slash
    const base = baseHost.startsWith('http') ? baseHost : `https://${baseHost}`;
    return new URL(`/${trimmed}`, base).toString();
  } catch {
    return null;
  }
}

/**
 * Strips non-essential tracking parameters while preserving required product identifiers.
 */
export function cleanProductTrackingParams(urlObj, storeKey = '') {
  if (!urlObj || !(urlObj instanceof URL)) return urlObj;

  const s = (storeKey || '').toLowerCase();
  const searchParams = urlObj.searchParams;

  // Universal tracking parameters to strip
  const universalTrackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', '_ga', '_gl', 'ref', 'affid', 'affExtParam', 'tag',
    'source', 'spm', 'scm', 'pvid', 'algo_pvid', 'algo_expid', 'btsid',
    'ws_ab_test', 'clickid', 'zanpid', 'irclickid'
  ];

  for (const param of universalTrackingParams) {
    searchParams.delete(param);
  }

  // Retailer-specific parameter cleanup
  if (s === 'flipkart') {
    // Keep 'pid' (Product ID) if present, strip Flipkart session tracking
    const pid = searchParams.get('pid');
    const fkTracking = [
      'otracker', 'otracker1', 'marketplace', 'lid', 'spotlightTagId',
      'srno', 'qH', 'store', 'fm', 'iid', 'ppn', 'ppt'
    ];
    for (const p of fkTracking) {
      searchParams.delete(p);
    }
    if (pid) {
      searchParams.set('pid', pid);
    }
  } else if (s === 'snapdeal') {
    const sdTracking = ['supcln', 'snpos', 'viewType', 'sort', 'fv', 'vendorCode'];
    for (const p of sdTracking) {
      searchParams.delete(p);
    }
  } else if (s === 'amazon') {
    const amzTracking = ['keywords', 'qid', 'sr', 'crid', 'sprefix', 'dib', 'dib_tag', 'th', 'psc'];
    for (const p of amzTracking) {
      searchParams.delete(p);
    }
  }

  return urlObj;
}

/**
 * Canonicalizes and cleans an exact product URL.
 */
export function canonicalizeProductUrl(rawUrl, storeKey = '') {
  const absUrlStr = toAbsoluteUrl(rawUrl);
  if (!absUrlStr) return null;

  try {
    const urlObj = new URL(absUrlStr);
    cleanProductTrackingParams(urlObj, storeKey);
    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Validates whether a given URL is an exact product detail page for a retailer.
 * 
 * @param {string} rawUrl - URL to evaluate
 * @param {string} storeKey - Optional retailer key (e.g. 'flipkart', 'snapdeal', 'amazon')
 * @returns {object} { isValid, isExactProductUrl, urlType, canonicalUrl, error }
 */
export function validateProductUrl(rawUrl, storeKey = '') {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      isExactProductUrl: false,
      urlType: 'invalid',
      canonicalUrl: null,
      error: 'Empty or invalid URL'
    };
  }

  const s = (storeKey || '').toLowerCase();
  const absUrl = toAbsoluteUrl(rawUrl);
  if (!absUrl) {
    return {
      isValid: false,
      isExactProductUrl: false,
      urlType: 'invalid',
      canonicalUrl: null,
      error: 'Malformed URL'
    };
  }

  let urlObj;
  try {
    urlObj = new URL(absUrl);
  } catch {
    return {
      isValid: false,
      isExactProductUrl: false,
      urlType: 'invalid',
      canonicalUrl: null,
      error: 'Cannot parse URL'
    };
  }

  // Must use http or https
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      isValid: false,
      isExactProductUrl: false,
      urlType: 'invalid',
      canonicalUrl: null,
      error: `Unsupported protocol: ${urlObj.protocol}`
    };
  }

  const pathname = urlObj.pathname;
  const fullUrl = urlObj.toString();

  // ── Reject Homepage / Root Paths ──
  if (pathname === '/' || pathname === '') {
    return {
      isValid: true,
      isExactProductUrl: false,
      urlType: 'homepage',
      canonicalUrl: fullUrl,
      error: 'Retailer homepage is not an exact product page'
    };
  }

  // ── Check if URL is a Search / Category / Listing Page ──
  for (const pattern of GENERIC_SEARCH_PATTERNS) {
    if (pattern.test(pathname) || pattern.test(urlObj.search)) {
      return {
        isValid: true,
        isExactProductUrl: false,
        urlType: 'search',
        canonicalUrl: fullUrl,
        error: 'Search/category listing is not an exact product detail page'
      };
    }
  }

  // ── Store-Specific Product Page Signature Check ──
  const sig = PRODUCT_PAGE_SIGNATURES[s];
  if (sig) {
    if (sig.hostnameRegex && !sig.hostnameRegex.test(urlObj.hostname)) {
      return {
        isValid: true,
        isExactProductUrl: false,
        urlType: 'external',
        canonicalUrl: fullUrl,
        error: `Hostname mismatch for store: ${s}`
      };
    }

    if (sig.productPathRegex && sig.productPathRegex.test(pathname)) {
      const canonical = canonicalizeProductUrl(absUrl, s);
      return {
        isValid: true,
        isExactProductUrl: true,
        urlType: 'product',
        canonicalUrl: canonical
      };
    }
  }

  // ── Generic Product Page Heuristics ──
  // If path has at least 2 segments and does not contain generic keywords
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length >= 1) {
    // If it looks like a deep product detail path (e.g. /product-slug-p12345 or /item/...)
    const hasProductIndicator = /\/p\/|\/product\/|\/dp\/|\/buy|\/item\/|\/pd\//i.test(pathname) || 
      /\d{5,}/.test(pathname); // Has unique product ID number

    if (hasProductIndicator) {
      const canonical = canonicalizeProductUrl(absUrl, s);
      return {
        isValid: true,
        isExactProductUrl: true,
        urlType: 'product',
        canonicalUrl: canonical
      };
    }
  }

  // Default: Valid URL, but treated as search / generic page rather than verified exact product
  return {
    isValid: true,
    isExactProductUrl: false,
    urlType: 'search',
    canonicalUrl: fullUrl,
    error: 'Unverified product detail URL pattern'
  };
}

/**
 * Builds an enriched product object with explicit URL classification fields.
 * 
 * @param {object} rawProduct - Scraped or simulated product
 * @param {string} query - Original search query
 * @param {string} store - Retailer identifier
 * @param {string} searchFallbackUrl - Generated search URL for this store
 * @returns {object} Product with productLink, productUrl, searchUrl, isExactProductUrl, urlType
 */
export function buildProductWithUrlMetadata(rawProduct, query, store, searchFallbackUrl = '') {
  if (!rawProduct) return null;

  const rawLink = rawProduct.productLink || rawProduct.productUrl || rawProduct.link || '';
  const searchUrl = searchFallbackUrl || rawProduct.searchUrl || '';
  const validation = validateProductUrl(rawLink, store);

  if (validation.isExactProductUrl && validation.canonicalUrl) {
    return {
      ...rawProduct,
      productLink: validation.canonicalUrl,
      productUrl: validation.canonicalUrl,
      searchUrl: searchUrl || validation.canonicalUrl,
      isExactProductUrl: true,
      urlType: 'product'
    };
  }

  // Simulated / Fallback / Search URL
  const safeSearchUrl = searchUrl || validation.canonicalUrl || '';
  return {
    ...rawProduct,
    productLink: safeSearchUrl,
    productUrl: null, // Exact product detail URL is unknown
    searchUrl: safeSearchUrl,
    isExactProductUrl: false,
    urlType: 'search'
  };
}
