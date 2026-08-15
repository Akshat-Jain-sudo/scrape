
/**
 * Test Suite: Search Relevance & Quality Pipeline Validation
 * 
 * Verifies:
 * 1. "Nike shoes" does not return iPhones
 * 2. "Nike shoes" accepts legitimate Nike shoe products
 * 3. "iphone" does not return unrelated shoes
 * 4. Brand matching works accurately
 * 5. Category matching works accurately
 * 6. Multi-word queries work
 * 7. Partial legitimate matches are not incorrectly rejected
 * 8. Irrelevant products are filtered
 * 9. Duplicate products are removed
 * 10. Results from different retailers remain correctly associated
 * 11. User A's search/saved results cannot leak into User B
 * 12. Existing authenticated functionality still works
 * 13. Existing anonymous-session behavior still works
 * 14. Zero sensitive data logged
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

import app from '../server/app.js';
import { getNeonPool } from '../server/neonDb.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';
import { 
  calculateRelevanceScore, 
  filterAndRankProducts, 
  validateBaseProduct,
  normalizeText,
  tokenizeText,
  detectBrands,
  detectCategoryIntents
} from '../server/relevance.js';
import { doesStoreSellQuery } from '../server/scraper.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Log capture to verify zero secret leakage
const capturedLogs = [];
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  origLog.apply(console, args);
};
console.error = (...args) => {
  capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  origErr.apply(console, args);
};

async function runRelevanceTestSuite() {
  origLog('\n================================================================');
  origLog('   SEARCH RELEVANCE & QUALITY PIPELINE TEST SUITE');
  origLog('================================================================\n');

  const pool = getNeonPool();
  let server;
  let baseUrl;

  try {
    // Start test server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        origLog(`🚀 Test server running at ${baseUrl}`);
        resolve();
      });
    });

    // ── 1. Unit Tests: Rejection of Irrelevant Products ──
    origLog('\n--- Section 1: Direct Relevance Scoring & Cross-Category Rejection ---');
    
    // Test 1: "Nike shoes" must strictly reject iPhones
    const nikeIphoneCheck = calculateRelevanceScore('Nike shoes', 'Apple iPhone 15 (Black, 128 GB)');
    assert(!nikeIphoneCheck.accepted && nikeIphoneCheck.score === 0.0, '1. "Nike shoes" strictly rejects "Apple iPhone 15" with score 0.0');

    // Test 2: "Nike shoes" must accept legitimate Nike shoe variations
    const nikeAirMax = calculateRelevanceScore('Nike shoes', 'Nike Air Max 270 Running Shoes For Men');
    assert(nikeAirMax.accepted && nikeAirMax.score >= 0.70, '2. "Nike shoes" accepts "Nike Air Max 270 Running Shoes" (score >= 0.70)');

    const nikeRevolution = calculateRelevanceScore('Nike shoes', 'Nike Men Revolution 7 Road Running Shoes');
    assert(nikeRevolution.accepted && nikeRevolution.score >= 0.60, '3. "Nike shoes" accepts "Nike Men Revolution 7" (score >= 0.60)');

    // Test 3: "iphone" must strictly reject shoes & fashion
    const iphoneShoeCheck = calculateRelevanceScore('iphone 15', 'Puma Smash v2 Leather Sneakers');
    assert(!iphoneShoeCheck.accepted && iphoneShoeCheck.score === 0.0, '4. "iphone 15" strictly rejects "Puma Smash v2 Sneakers"');

    const iphoneLegit = calculateRelevanceScore('iphone 15', 'Apple iPhone 15 (Blue, 128 GB)');
    assert(iphoneLegit.accepted && iphoneLegit.score >= 0.75, '5. "iphone 15" accepts "Apple iPhone 15 (Blue, 128 GB)"');

    // ── 2. Brand & Category Intent Matching ──
    origLog('\n--- Section 2: Brand & Category Detection ---');

    // Test 4: Brand detection
    const brandsInQuery = detectBrands('Apple iPhone 16 vs Samsung Galaxy S24');
    assert(brandsInQuery.some(b => b.key === 'apple') && brandsInQuery.some(b => b.key === 'samsung'), '6. Brand detector correctly identifies Apple and Samsung');

    // Test 5: Category intent detection
    const footwearIntents = detectCategoryIntents('casual running shoes sneakers');
    assert(footwearIntents.includes('footwear'), '7. Category detector correctly identifies "footwear"');

    const phoneIntents = detectCategoryIntents('apple iphone 15 pro 128gb');
    assert(phoneIntents.includes('smartphones'), '8. Category detector correctly identifies "smartphones"');

    // Test 6: Single-brand official store filtering
    assert(doesStoreSellQuery('nike', 'nike shoes') === true, '9. Nike official store accepts "nike shoes"');
    assert(doesStoreSellQuery('adidas', 'nike shoes') === false, '10. Adidas official store rejects "nike shoes" query');
    assert(doesStoreSellQuery('apple', 'nike shoes') === false, '11. Apple official store rejects "nike shoes" query');
    assert(doesStoreSellQuery('apple', 'macbook air m3') === true, '12. Apple official store accepts "macbook air m3" query');

    // ── 3. Multi-word Queries, Stemming & Partial Match Tolerance ──
    origLog('\n--- Section 3: Multi-Word, Stemming & Complex Queries ---');

    // Test 7: Multi-word query
    const multiWordCheck = calculateRelevanceScore('apple macbook air m3 16gb', 'Apple MacBook Air M3 - (16 GB/256 GB SSD/macOS Sequoia) MC8K4HN/A');
    assert(multiWordCheck.accepted && multiWordCheck.score >= 0.80, '13. Multi-word query "apple macbook air m3 16gb" matches title with score >= 0.80');

    // Test 8: Stemming / plural-singular tolerance
    const singularQueryPluralTitle = calculateRelevanceScore('nike shoe', 'Nike Air Jordan 1 High Shoes');
    assert(singularQueryPluralTitle.accepted, '14. Singular query "nike shoe" matches plural title "Shoes" via stemmer');

    const pluralQuerySingularTitle = calculateRelevanceScore('headphones', 'Sony Wireless Headphone with Mic');
    assert(pluralQuerySingularTitle.accepted, '15. Plural query "headphones" matches singular title "Headphone"');

    // ── 4. Batch Filtering, Deduplication & Ranking ──
    origLog('\n--- Section 4: Batch Filter & Ranking Engine ---');

    const testProductBatch = [
      { name: 'Apple iPhone 15 (Black, 128 GB)', source: 'flipkart', price: 65999, ratingsCount: 50000 },
      { name: 'Nike Air Max 270 Running Shoes', source: 'flipkart', price: 8995, ratingsCount: 1200 },
      { name: 'Nike Air Max 270 Running Shoes', source: 'flipkart', price: 8995, ratingsCount: 1200 }, // duplicate
      { name: 'Nike Revolution 7 Running Shoes', source: 'amazon', price: 3695, ratingsCount: 3400 },
      { name: 'Samsung Galaxy S24 Ultra', source: 'amazon', price: 129999, ratingsCount: 15000 },
      { name: 'Nike Men Downshifter 13 Running Shoes', source: 'myntra', price: 4295, ratingsCount: 890 }
    ];

    const { products: filteredBatch, stats } = filterAndRankProducts('Nike shoes', testProductBatch, { threshold: 0.30 });
    
    assert(stats.totalInput === 6, '16. Batch filter processed 6 input products');
    assert(stats.rejected === 2, '17. Batch filter rejected 2 irrelevant products (iPhone and Galaxy)');
    assert(filteredBatch.length === 3, '18. Batch filter deduplicated identical Flipkart entry (result: 3 unique)');
    assert(!filteredBatch.some(p => p.name.includes('iPhone') || p.name.includes('Galaxy')), '19. Filtered results contain ZERO phones');
    assert(filteredBatch.every(p => p.name.toLowerCase().includes('nike')), '20. All returned results belong to Nike');
    assert(filteredBatch[0].relevanceScore >= filteredBatch[1].relevanceScore, '21. Results are sorted in descending order of relevance');

    // ── 5. Full End-to-End API Search Endpoint (/api/scrape) ──
    origLog('\n--- Section 5: End-to-End /api/scrape Verification ---');

    const scrapeRes = await axios.post(`${baseUrl}/api/scrape`, {
      query: 'Nike shoes',
      category: 'ecommerce',
      source: ['flipkart', 'snapdeal', 'nike', 'bata', 'myntra']
    });

    assert(scrapeRes.status === 200 && Array.isArray(scrapeRes.data.products), '22. /api/scrape responded with HTTP 200');
    const apiProducts = scrapeRes.data.products;
    assert(apiProducts.length > 0, '23. /api/scrape returned product results');
    assert(!apiProducts.some(p => p.name.toLowerCase().includes('iphone') || p.name.toLowerCase().includes('macbook')), '24. /api/scrape results contain ZERO iPhones or MacBooks');
    assert(scrapeRes.data.bestPriceDeal && scrapeRes.data.bestPriceDeal.price > 0, '25. bestPriceDeal is selected from validated relevant products');

    // ── 6. Multi-Store Compare Endpoint (/api/compare) Base Product Validation ──
    origLog('\n--- Section 6: End-to-End /api/compare Base Product Validation ---');

    const compRes = await axios.post(`${baseUrl}/api/compare`, {
      query: 'Nike shoes',
      category: 'ecommerce',
      location: 'Mumbai'
    });

    assert(compRes.status === 200, '26. /api/compare responded with HTTP 200');
    assert(!compRes.data.productName.toLowerCase().includes('iphone'), '27. Comparison base title does NOT contain iPhone');
    assert(
      compRes.data.productName.toLowerCase().includes('nike') || 
      compRes.data.productName.toLowerCase().includes('shoe') || 
      compRes.data.productName.toLowerCase().includes('sneaker') ||
      calculateRelevanceScore('Nike shoes', compRes.data.productName).accepted, 
      '28. Comparison base title is strictly relevant to Nike shoes'
    );

    // ── 7. Multi-User Data Isolation & Database Scoping ──
    origLog('\n--- Section 7: User Isolation & Anonymous Data Integrity ---');
    const ts = Date.now();

    const userARes = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: `rel_user_a_${ts}@test.com`,
      password: 'UserA_Password_123!',
      fullName: 'Relevance User A'
    });
    const tokenA = userARes.data.token;
    const userAId = userARes.data.user.id;

    const userBRes = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: `rel_user_b_${ts}@test.com`,
      password: 'UserB_Password_456!',
      fullName: 'Relevance User B'
    });
    const tokenB = userBRes.data.token;
    const userBId = userBRes.data.user.id;

    // User A saves a filtered relevant product
    const saveResA = await axios.post(`${baseUrl}/api/products`, {
      products: [{
        id: `nike-air-max-${ts}`,
        name: 'Nike Air Max 270',
        price: 8995,
        source: 'Nike India',
        productLink: `https://www.nike.com/in/t/air-max-${ts}`
      }]
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(saveResA.status === 201 || saveResA.status === 200, '29. User A saved relevant product');

    // Verify User B cannot view User A saved search products
    const fetchB = await axios.get(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${tokenB}` } });
    const userBProducts = Array.isArray(fetchB.data) ? fetchB.data : fetchB.data.products;
    assert(!userBProducts.some(p => p.id === `nike-air-max-${ts}`), '30. User B cannot see User A saved product');

    // Verify Anonymous user cannot access User A product
    const anonId = `anon-${crypto.randomUUID()}`;
    const fetchAnon = await axios.get(`${baseUrl}/api/products`, { headers: { 'X-Anonymous-Session': anonId } });
    const anonProducts = Array.isArray(fetchAnon.data) ? fetchAnon.data : fetchAnon.data.products;
    assert(!anonProducts.some(p => p.id === `nike-air-max-${ts}`), '31. Anonymous guest cannot access User A saved product');

    // ── 8. Sensitive Log Inspection ──
    origLog('\n--- Section 8: Sensitive Data Log Verification ---');
    const secretLeaked = capturedLogs.some(l => 
      l.includes(tokenA) || 
      l.includes(tokenB) || 
      l.includes('UserA_Password_123!') || 
      l.includes('UserB_Password_456!')
    );
    assert(!secretLeaked, '32. Zero passwords, JWTs, or secrets leaked into logs');

    // Cleanup Neon DB
    origLog('\n--- Cleanup: Removing Test Users from Neon ---');
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
    origLog('   ✓ Cleaned up test users');

    await stopPriceHistoryScheduler();
    server.close();
    await pool.end();

    origLog('\n================================================================');
    origLog(`   ALL RELEVANCE & QUALITY TESTS PASSED (${passed}/${passed + failed}) 🎉`);
    origLog('================================================================\n');
    process.exit(0);

  } catch (error) {
    origErr('\n❌ Test execution failed:', error);
    if (server) server.close();
    try { await stopPriceHistoryScheduler(); await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

runRelevanceTestSuite();
