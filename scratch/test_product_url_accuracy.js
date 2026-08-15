/**
 * Comprehensive Product URL & Buy Button Accuracy Test Suite
 * 
 * Verifies:
 * 1. Flipkart canonical product URL parsing, pid retention, and tracking parameter stripping
 * 2. Snapdeal canonical product URL parsing and tracking parameter stripping
 * 3. Amazon product URL parsing and tracking parameter stripping
 * 4. Relative URL to absolute HTTPS normalization
 * 5. Rejection of homepages as exact product URLs
 * 6. Rejection of search and category pages as exact product URLs
 * 7. Simulated stores URL classification (isExactProductUrl = false, urlType = 'search')
 * 8. Live vs simulated distinction in compareProductPrices & generatePlatformComparison
 * 9. Database row mapping and URL metadata enrichment
 * 10. End-to-end "Nike shoes" URL accuracy and buy button link integrity
 */

import {
  validateProductUrl,
  canonicalizeProductUrl,
  toAbsoluteUrl,
  buildProductWithUrlMetadata
} from '../server/urlValidator.js';

import {
  scrapeFlipkartSearch,
  scrapeSnapdealSearch,
  simulateStoreSearch,
  compareProductPrices,
  generatePlatformComparison,
  getStoreLink
} from '../server/scraper.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PRODUCT URL & BUY BUTTON ACCURACY SUITE');
  console.log('====================================================\n');

  // ── TEST GROUP 1: Flipkart URL Canonicalization & Parameter Cleaning ──
  console.log('📦 Test Group 1: Flipkart URL Parsing & Cleaning');
  {
    const rawFkUrl = 'https://www.flipkart.com/nike-air-max-sc-sneakers-for-men/p/itme3963cb33a7d4?pid=SHOGFE8VZGYKXZ4G&lid=LSTSHOGFE8VZGYKXZ4G639HGL&marketplace=FLIPKART&spotlightTagId=Bestseller&otracker=search';
    const validation = validateProductUrl(rawFkUrl, 'flipkart');

    assert(validation.isValid === true, 'Flipkart product URL is valid');
    assert(validation.isExactProductUrl === true, 'Flipkart product URL is identified as exact product');
    assert(validation.urlType === 'product', 'Flipkart URL type is "product"');
    assert(validation.canonicalUrl.includes('/p/itme3963cb33a7d4'), 'Canonical URL retains product item ID');
    assert(validation.canonicalUrl.includes('pid=SHOGFE8VZGYKXZ4G'), 'Canonical URL preserves essential pid param');
    assert(!validation.canonicalUrl.includes('lid='), 'Canonical URL strips lid tracking param');
    assert(!validation.canonicalUrl.includes('otracker='), 'Canonical URL strips otracker tracking param');
    assert(!validation.canonicalUrl.includes('spotlightTagId='), 'Canonical URL strips spotlightTagId param');
  }

  // ── TEST GROUP 2: Snapdeal URL Parsing & Cleaning ──
  console.log('\n📦 Test Group 2: Snapdeal URL Parsing & Cleaning');
  {
    const rawSdUrl = 'https://www.snapdeal.com/product/nike-revolution-6-running-shoes/678912345678?supcln=cln123&utm_source=affiliate&snpos=1|1';
    const validation = validateProductUrl(rawSdUrl, 'snapdeal');

    assert(validation.isValid === true, 'Snapdeal product URL is valid');
    assert(validation.isExactProductUrl === true, 'Snapdeal product URL is identified as exact product');
    assert(validation.urlType === 'product', 'Snapdeal URL type is "product"');
    assert(validation.canonicalUrl.includes('/product/nike-revolution-6-running-shoes/678912345678'), 'Canonical URL retains product path');
    assert(!validation.canonicalUrl.includes('supcln='), 'Canonical URL strips supcln param');
    assert(!validation.canonicalUrl.includes('snpos='), 'Canonical URL strips snpos param');
    assert(!validation.canonicalUrl.includes('utm_source='), 'Canonical URL strips utm_source param');
  }

  // ── TEST GROUP 3: Amazon URL Parsing & Cleaning ──
  console.log('\n📦 Test Group 3: Amazon URL Parsing & ASIN Retention');
  {
    const rawAmzUrl = 'https://www.amazon.in/Nike-Revolution-Running-Shoes-Numeric_10/dp/B09V7YZK8X/ref=sr_1_1?keywords=nike+shoes&qid=1680000000&sr=8-1';
    const validation = validateProductUrl(rawAmzUrl, 'amazon');

    assert(validation.isValid === true, 'Amazon product URL is valid');
    assert(validation.isExactProductUrl === true, 'Amazon product URL is identified as exact product');
    assert(validation.canonicalUrl.includes('/dp/B09V7YZK8X'), 'Canonical URL retains ASIN');
    assert(!validation.canonicalUrl.includes('keywords='), 'Canonical URL strips keywords param');
    assert(!validation.canonicalUrl.includes('qid='), 'Canonical URL strips qid param');
    assert(!validation.canonicalUrl.includes('sr='), 'Canonical URL strips sr param');
  }

  // ── TEST GROUP 4: Relative URL Normalization ──
  console.log('\n📦 Test Group 4: Relative URL Normalization');
  {
    const relFkUrl = '/nike-court-vision-low-sneakers/p/itmf123456?pid=SHO123456';
    const absUrl = toAbsoluteUrl(relFkUrl, 'https://www.flipkart.com');
    assert(absUrl.startsWith('https://www.flipkart.com/nike-court-vision'), 'Relative Flipkart URL converted to absolute HTTPS');
    
    const val = validateProductUrl(absUrl, 'flipkart');
    assert(val.isExactProductUrl === true, 'Converted relative URL validates as exact product');
    assert(val.canonicalUrl.includes('pid=SHO123456'), 'Canonical URL retains pid from relative path');

    const relSdUrl = '/product/nike-downshifter-shoes/88776655';
    const absSdUrl = toAbsoluteUrl(relSdUrl, 'https://www.snapdeal.com');
    assert(absSdUrl.startsWith('https://www.snapdeal.com/product/'), 'Relative Snapdeal URL converted to absolute HTTPS');
  }

  // ── TEST GROUP 5: Rejection of Generic Retailer Homepages ──
  console.log('\n📦 Test Group 5: Rejection of Homepages as Exact Product URLs');
  {
    const homepages = [
      { url: 'https://www.flipkart.com', store: 'flipkart' },
      { url: 'https://www.flipkart.com/', store: 'flipkart' },
      { url: 'https://www.snapdeal.com', store: 'snapdeal' },
      { url: 'https://www.snapdeal.com/', store: 'snapdeal' },
      { url: 'https://www.amazon.in', store: 'amazon' },
      { url: 'https://www.dealshare.in', store: 'dealshare' }
    ];

    homepages.forEach(hp => {
      const res = validateProductUrl(hp.url, hp.store);
      assert(res.isExactProductUrl === false, `Homepage ${hp.url} is NOT marked as exact product URL`);
      assert(res.urlType !== 'product', `Homepage ${hp.url} urlType is not 'product'`);
    });
  }

  // ── TEST GROUP 6: Rejection of Generic Search & Category Listing URLs ──
  console.log('\n📦 Test Group 6: Rejection of Search & Category Listings');
  {
    const searchUrls = [
      { url: 'https://www.flipkart.com/search?q=nike+shoes', store: 'flipkart' },
      { url: 'https://www.snapdeal.com/search?keyword=nike+shoes', store: 'snapdeal' },
      { url: 'https://www.amazon.in/s?k=nike+shoes', store: 'amazon' },
      { url: 'https://www.flipkart.com/grocery-supermart-store', store: 'flipkart' },
      { url: 'https://www.myntra.com/search?rawQuery=nike+shoes', store: 'myntra' },
      { url: 'https://blinkit.com/s/?q=milk', store: 'blinkit' }
    ];

    searchUrls.forEach(su => {
      const res = validateProductUrl(su.url, su.store);
      assert(res.isExactProductUrl === false, `Search URL ${su.url} is NOT marked as exact product URL`);
      assert(res.urlType === 'search', `Search URL ${su.url} is classified as urlType: 'search'`);
    });
  }

  // ── TEST GROUP 7: Simulated Store Search Link Accuracy ──
  console.log('\n📦 Test Group 7: Simulated Store Search Link Accuracy');
  {
    const simAmazon = simulateStoreSearch('Nike shoes', 'amazon', 1, 'Mumbai');
    assert(simAmazon.length > 0, 'Generated simulated Amazon products');
    const firstAmz = simAmazon[0];
    assert(firstAmz.isExactProductUrl === false, 'Simulated Amazon product has isExactProductUrl === false');
    assert(firstAmz.urlType === 'search', 'Simulated Amazon product has urlType === "search"');
    assert(firstAmz.productUrl === null, 'Simulated Amazon product has productUrl === null');
    assert(firstAmz.searchUrl.includes('amazon.in/s?k=Nike%20shoes') || firstAmz.searchUrl.includes('amazon.in/s?k='), 'Simulated Amazon product searchUrl points to Amazon search query');

    const simMyntra = simulateStoreSearch('Nike shoes', 'myntra', 1, 'Mumbai');
    const firstMyntra = simMyntra[0];
    assert(firstMyntra.isExactProductUrl === false, 'Simulated Myntra product has isExactProductUrl === false');
    assert(firstMyntra.searchUrl.includes('myntra.com/search?rawQuery='), 'Simulated Myntra product searchUrl points to Myntra search query');
  }

  // ── TEST GROUP 8: Platform Comparison URL Integrity ──
  console.log('\n📦 Test Group 8: Platform Comparison URL Integrity');
  {
    const comp = generatePlatformComparison('Nike shoes', null, ['amazon', 'flipkart', 'myntra', 'puma'], 'Mumbai');
    assert(comp.comparison.amazon.isExactProductUrl === false, 'Comparison simulated Amazon isExactProductUrl is false');
    assert(comp.comparison.amazon.urlType === 'search', 'Comparison simulated Amazon urlType is search');
    assert(comp.comparison.amazon.searchUrl.includes('amazon.in/s?k='), 'Comparison Amazon searchUrl is valid search query');
    assert(comp.comparison.myntra.searchUrl.includes('myntra.com/search?rawQuery='), 'Comparison Myntra searchUrl is valid search query');
    assert(comp.comparison.puma.searchUrl.includes('puma.com'), 'Comparison Puma searchUrl points to Puma');
  }

  // ── TEST GROUP 9: Live Scraper Exact URL Retention in compareProductPrices ──
  console.log('\n📦 Test Group 9: compareProductPrices URL Preservation');
  {
    const liveFkProduct = {
      id: 'fk-test-1',
      name: 'Nike Air Max SC Sneakers For Men',
      price: 4995,
      priceFormatted: '₹4,995',
      originalPrice: 5995,
      originalPriceFormatted: '₹5,995',
      discount: 16,
      discountFormatted: '16% off',
      rating: 4.4,
      ratingsCount: 1250,
      productLink: 'https://www.flipkart.com/nike-air-max-sc-sneakers-for-men/p/itme3963cb33a7d4?pid=SHOGFE8VZGYKXZ4G',
      productUrl: 'https://www.flipkart.com/nike-air-max-sc-sneakers-for-men/p/itme3963cb33a7d4?pid=SHOGFE8VZGYKXZ4G',
      searchUrl: 'https://www.flipkart.com/search?q=Nike+shoes',
      isExactProductUrl: true,
      urlType: 'product',
      imageUrl: 'https://rukminim2.flixcart.com/image/100/100/nike.jpg',
      source: 'flipkart',
      sourceMode: 'live'
    };

    const compRes = await compareProductPrices('Nike shoes', 'ecommerce', 'Mumbai', null);
    assert(compRes.productName !== undefined, 'compareProductPrices returned valid comparison productName');
    assert(compRes.comparison !== undefined, 'compareProductPrices returned comparison map');
    
    // Check Flipkart entry
    const fkEntry = compRes.comparison.flipkart;
    assert(fkEntry !== undefined, 'Comparison includes Flipkart');
    assert(typeof fkEntry.productLink === 'string' && fkEntry.productLink.startsWith('https://'), 'Flipkart productLink is valid HTTPS URL');
    assert(typeof fkEntry.searchUrl === 'string' && fkEntry.searchUrl.includes('flipkart.com/search'), 'Flipkart searchUrl is valid search URL');
  }

  // ── TEST GROUP 10: End-to-End "Nike shoes" Verification ──
  console.log('\n📦 Test Group 10: End-to-End "Nike shoes" Verification');
  {
    const query = 'Nike shoes';
    const stores = ['amazon', 'flipkart', 'snapdeal', 'myntra', 'puma', 'adidas'];

    for (const store of stores) {
      const storeSearchLink = getStoreLink(store, query);
      assert(storeSearchLink.startsWith('https://'), `Store ${store} generates valid HTTPS search link: ${storeSearchLink}`);
      assert(!storeSearchLink.endsWith('.com') && !storeSearchLink.endsWith('.in'), `Store ${store} search link is NOT a bare homepage`);
    }

    // Verify buildProductWithUrlMetadata helper
    const testLive = {
      name: 'Nike Air Max',
      productLink: 'https://www.flipkart.com/nike-air-max/p/itm12345?pid=SHO123&lid=LST123'
    };
    const enrichedLive = buildProductWithUrlMetadata(testLive, query, 'flipkart', 'https://www.flipkart.com/search?q=Nike+shoes');
    assert(enrichedLive.isExactProductUrl === true, 'buildProductWithUrlMetadata correctly marks live product as exact');
    assert(enrichedLive.productUrl.includes('/p/itm12345'), 'buildProductWithUrlMetadata canonicalizes product detail URL');
    assert(enrichedLive.searchUrl === 'https://www.flipkart.com/search?q=Nike+shoes', 'buildProductWithUrlMetadata preserves fallback search URL');

    const testSim = {
      name: 'Amazon Nike shoes - Option 1',
      productLink: 'https://www.amazon.in/s?k=Nike+shoes'
    };
    const enrichedSim = buildProductWithUrlMetadata(testSim, query, 'amazon', 'https://www.amazon.in/s?k=Nike+shoes');
    assert(enrichedSim.isExactProductUrl === false, 'buildProductWithUrlMetadata correctly marks simulated product as search URL');
    assert(enrichedSim.productUrl === null, 'buildProductWithUrlMetadata sets productUrl to null for search URLs');
    assert(enrichedSim.urlType === 'search', 'buildProductWithUrlMetadata sets urlType to "search"');
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
