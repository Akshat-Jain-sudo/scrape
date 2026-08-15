/**
 * Live Search Accuracy & Quality Audit Runner
 * 
 * Executes full search pipeline across representative queries and edge cases:
 * - Scraper raw extraction
 * - Relevance scoring breakdown
 * - Rejections / Acceptance counts
 * - Retailer breakdown
 * - False positives / False negatives
 * - Fallback simulation contamination
 * - URL classification integrity
 */

import {
  scrapeFlipkartSearch,
  scrapeSnapdealSearch,
  simulateStoreSearch,
  compareProductPrices,
  doesStoreSellQuery,
  getStoreLink
} from '../server/scraper.js';

import {
  calculateRelevanceScore,
  filterAndRankProducts,
  detectBrands,
  detectCategoryIntents
} from '../server/relevance.js';

import { validateProductUrl } from '../server/urlValidator.js';

const AUDIT_QUERIES = [
  // Footwear
  { query: 'nike shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: 'nike' },
  { query: 'adidas shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: 'adidas' },
  { query: "men's running shoes", category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null },
  { query: "women's sneakers", category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null },
  { query: 'black sports shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null },

  // Electronics
  { query: 'iphone 15', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'apple' },
  { query: 'samsung galaxy phone', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'samsung' },
  { query: 'laptop', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: null },
  { query: 'bluetooth headphones', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: null },
  { query: '55 inch smart tv', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: null },

  // Apparel
  { query: "men's jeans", category: 'ecommerce', expectedCategory: 'apparel', expectedBrand: null },
  { query: "women's kurti", category: 'ecommerce', expectedCategory: 'apparel', expectedBrand: null },
  { query: 'nike t shirt', category: 'ecommerce', expectedCategory: 'apparel', expectedBrand: 'nike' },

  // Other
  { query: 'wrist watch', category: 'ecommerce', expectedCategory: 'watches', expectedBrand: null },
  { query: 'face wash', category: 'ecommerce', expectedCategory: 'beauty', expectedBrand: null },
  { query: 'backpack', category: 'ecommerce', expectedCategory: 'bags', expectedBrand: null },
  { query: 'air fryer', category: 'ecommerce', expectedCategory: 'home', expectedBrand: null },

  // Edge cases
  { query: 'apple watch', category: 'ecommerce', expectedCategory: 'watches', expectedBrand: 'apple' },
  { query: 'apple laptop', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'apple' },
  { query: 'nike air max', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: 'nike' },
  { query: 'air max shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: 'nike' },
  { query: 'redmi phone', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'xiaomi' },
  { query: 'oneplus phone', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'oneplus' },
  { query: 'macbook', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: 'apple' },
  { query: 'gaming laptop', category: 'ecommerce', expectedCategory: 'electronics', expectedBrand: null },
  { query: 'running shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null },
  { query: 'men shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null },
  { query: 'women shoes', category: 'ecommerce', expectedCategory: 'footwear', expectedBrand: null }
];

async function runAudit() {
  console.log('================================================================');
  console.log('🔬 REAL-WORLD SEARCH ACCURACY & PIPELINE AUDIT');
  console.log('================================================================\n');

  const auditResults = [];

  for (const qItem of AUDIT_QUERIES) {
    const { query, category, expectedCategory, expectedBrand } = qItem;
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 AUDITING QUERY: "${query}" (Expected Cat: ${expectedCategory}, Brand: ${expectedBrand || 'Any'})`);
    console.log(`------------------------------------------------------------`);

    // 1. Scrape Live + Simulated products (mimicking POST /api/scrape)
    let rawProducts = [];
    let liveFk = [];
    let liveSd = [];

    try {
      liveFk = await scrapeFlipkartSearch(query, 1);
    } catch (e) {
      console.log(`  [Flipkart] Scrape error/blocked: ${e.message}`);
    }

    try {
      liveSd = await scrapeSnapdealSearch(query, 1);
    } catch (e) {
      console.log(`  [Snapdeal] Scrape error/blocked: ${e.message}`);
    }

    rawProducts = [...liveFk, ...liveSd];

    // Add simulated stores like /api/scrape does
    const simulatedStores = [
      'amazon', 'myntra', 'ajio', 'meesho', 'croma', 'reliance', 'tatacliq',
      'bata', 'nike', 'adidas', 'puma', 'apple', 'samsung', 'dell', 'boat',
      'titan', 'fastrack', 'mamaearth', 'decathlon'
    ];

    for (const store of simulatedStores) {
      const simItems = simulateStoreSearch(query, store, 1, 'Mumbai');
      rawProducts = [...rawProducts, ...simItems];
    }

    const totalRaw = rawProducts.length;

    // 2. Score and Rank
    const { products: retainedProducts, stats } = filterAndRankProducts(query, rawProducts, {
      threshold: 0.30,
      logAll: false
    });

    const rejectedCount = stats.rejected;
    const retainedCount = retainedProducts.length;

    // Retailer distribution of retained products
    const retailerCounts = {};
    retainedProducts.forEach(p => {
      retailerCounts[p.source] = (retailerCounts[p.source] || 0) + 1;
    });

    // Score distribution
    const scores = retainedProducts.map(p => p.relevanceScore || 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : 0;

    // 3. Classify returned products:
    // - completely irrelevant (wrong domain/orthogonal category)
    // - wrong category
    // - wrong brand (when specific brand requested)
    // - related-but-not-exact
    // - correct products
    let completelyIrrelevant = [];
    let wrongCategory = [];
    let wrongBrand = [];
    let relatedNotExact = [];
    let correctProducts = [];

    const queryBrands = detectBrands(query);
    const queryCats = detectCategoryIntents(query);

    for (const prod of retainedProducts) {
      const title = prod.name || prod.title || '';
      const titleBrands = detectBrands(title);
      const titleCats = detectCategoryIntents(title);

      // Check category mismatch
      let catMismatch = false;
      if (expectedCategory) {
        if (titleCats.length > 0 && !titleCats.includes(expectedCategory)) {
          catMismatch = true;
        }
      }

      // Check brand mismatch (if query specified brand)
      let brandMismatch = false;
      if (expectedBrand) {
        if (titleBrands.length > 0 && !titleBrands.some(b => b.key === expectedBrand)) {
          brandMismatch = true;
        }
      }

      if (catMismatch) {
        wrongCategory.push({ title, store: prod.source, score: prod.relevanceScore });
      } else if (brandMismatch) {
        wrongBrand.push({ title, store: prod.source, score: prod.relevanceScore });
      } else if (prod.relevanceScore >= 0.60) {
        correctProducts.push({ title, store: prod.source, score: prod.relevanceScore });
      } else {
        relatedNotExact.push({ title, store: prod.source, score: prod.relevanceScore });
      }
    }

    const totalReturned = retainedProducts.length;
    const totalIrrelevant = wrongCategory.length + wrongBrand.length;
    const totalRelevant = correctProducts.length + relatedNotExact.length;
    const precision = totalReturned > 0 ? ((totalRelevant / totalReturned) * 100).toFixed(1) : '0.0';
    const irrelevantRate = totalReturned > 0 ? ((totalIrrelevant / totalReturned) * 100).toFixed(1) : '0.0';

    // 4. Check URL classifications
    const liveItems = retainedProducts.filter(p => p.sourceMode === 'live');
    const simItems = retainedProducts.filter(p => p.sourceMode === 'simulated');
    const exactUrlsOnLive = liveItems.filter(p => p.isExactProductUrl === true).length;
    const exactUrlsOnSim = simItems.filter(p => p.isExactProductUrl === true).length;

    console.log(`  📊 Raw Extracted: ${totalRaw} | Rejected: ${rejectedCount} | Retained: ${retainedCount}`);
    console.log(`  🏢 Retailer breakdown:`, retailerCounts);
    console.log(`  🎯 Score range: [${minScore} - ${maxScore}] (Avg: ${avgScore})`);
    console.log(`  ✅ Correct: ${correctProducts.length} | 🟡 Related: ${relatedNotExact.length} | ❌ Wrong Cat: ${wrongCategory.length} | ❌ Wrong Brand: ${wrongBrand.length}`);
    console.log(`  📈 Precision: ${precision}% | Irrelevant Rate: ${irrelevantRate}%`);
    console.log(`  🔗 Live exact URLs: ${exactUrlsOnLive}/${liveItems.length} | Sim exact URLs: ${exactUrlsOnSim}/${simItems.length}`);

    // Print sample top 3 products
    console.log(`  📝 Sample Top Retained Products:`);
    retainedProducts.slice(0, 3).forEach((p, idx) => {
      console.log(`     ${idx + 1}. [${p.source}] "${p.name}" (Score: ${p.relevanceScore}, Type: ${p.urlType}, Link: ${p.productLink})`);
    });

    if (wrongCategory.length > 0) {
      console.log(`  ⚠️ WRONG CATEGORY EXAMPLES:`);
      wrongCategory.slice(0, 3).forEach(w => console.log(`     - [${w.store}] "${w.title}" (Score: ${w.score})`));
    }
    if (wrongBrand.length > 0) {
      console.log(`  ⚠️ WRONG BRAND EXAMPLES:`);
      wrongBrand.slice(0, 3).forEach(w => console.log(`     - [${w.store}] "${w.title}" (Score: ${w.score})`));
    }

    auditResults.push({
      query,
      expectedCategory,
      expectedBrand,
      totalRaw,
      rejectedCount,
      retainedCount,
      correctCount: correctProducts.length,
      relatedCount: relatedNotExact.length,
      wrongCategoryCount: wrongCategory.length,
      wrongBrandCount: wrongBrand.length,
      precision: parseFloat(precision),
      irrelevantRate: parseFloat(irrelevantRate),
      topSample: retainedProducts[0] ? retainedProducts[0].name : 'None',
      topStore: retainedProducts[0] ? retainedProducts[0].source : 'None',
      wrongSamples: [...wrongCategory, ...wrongBrand]
    });
  }

  // ── Summary Table ──
  console.log('\n\n================================================================');
  console.log('📋 AUDIT SUMMARY TABLE');
  console.log('================================================================');
  console.table(auditResults.map(r => ({
    Query: r.query,
    Retained: r.retainedCount,
    Correct: r.correctCount,
    WrongCat: r.wrongCategoryCount,
    WrongBrand: r.wrongBrandCount,
    Precision: `${r.precision}%`,
    IrrelevantRate: `${r.irrelevantRate}%`
  })));

  return auditResults;
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
