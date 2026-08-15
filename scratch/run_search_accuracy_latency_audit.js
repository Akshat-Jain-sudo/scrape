/**
 * Comprehensive Real-World Search Accuracy, Quality & Latency Audit Suite (Refined)
 * 
 * Tests 18 representative queries across:
 * - Electronics
 * - Footwear
 * - Apparel
 * - Other Categories (Watches, Beauty, Bags, Appliances)
 */

import http from 'http';
import app from '../server/app.js';
import {
  scrapeFlipkartSearch,
  scrapeSnapdealSearch,
  simulateStoreSearch
} from '../server/scraper.js';
import {
  calculateRelevanceScore,
  filterAndRankProducts,
  detectBrands,
  detectCategoryIntents
} from '../server/relevance.js';
import { validateProductUrl } from '../server/urlValidator.js';

const TEST_QUERIES = [
  // ── Category 1: Electronics ──
  { query: 'iphone 15', domain: 'electronics', expectedCategory: 'smartphones', expectedBrand: 'apple', keySpecs: ['128gb', '256gb', '512gb', 'black', 'blue', 'pink', 'green', 'yellow'] },
  { query: 'samsung galaxy s24', domain: 'electronics', expectedCategory: 'smartphones', expectedBrand: 'samsung', keySpecs: ['5g', '128gb', '256gb', '512gb', '8gb', '12gb'] },
  { query: 'macbook air m2', domain: 'electronics', expectedCategory: 'computing', expectedBrand: 'apple', keySpecs: ['m2', '16gb', '8gb', '256gb', '512gb', 'ssd', 'macos'] },
  { query: 'sony wh-1000xm5', domain: 'electronics', expectedCategory: 'audio', expectedBrand: 'sony', keySpecs: ['wireless', 'noise cancelling', 'bluetooth', 'over ear', 'mic'] },
  { query: '55 inch smart tv', domain: 'electronics', expectedCategory: 'appliances', expectedBrand: null, keySpecs: ['55 inch', '4k', 'ultra hd', 'smart tv', 'led'] },

  // ── Category 2: Footwear ──
  { query: 'nike air max', domain: 'footwear', expectedCategory: 'footwear', expectedBrand: 'nike', keySpecs: ['air max', 'sneakers', 'men', 'running', 'cushioning'] },
  { query: 'adidas ultraboost', domain: 'footwear', expectedCategory: 'footwear', expectedBrand: 'adidas', keySpecs: ['ultraboost', 'running', 'boost', 'shoes'] },
  { query: 'puma running shoes', domain: 'footwear', expectedCategory: 'footwear', expectedBrand: 'puma', keySpecs: ['running', 'sports', 'shoes', 'nitro'] },
  { query: 'men formal leather shoes', domain: 'footwear', expectedCategory: 'footwear', expectedBrand: null, keySpecs: ['formal', 'leather', 'men', 'shoes', 'derby', 'oxford'] },
  { query: 'women sneakers', domain: 'footwear', expectedCategory: 'footwear', expectedBrand: null, keySpecs: ['women', 'sneakers', 'casual', 'shoes'] },

  // ── Category 3: Apparel ──
  { query: "levi's 511 slim fit jeans", domain: 'apparel', expectedCategory: 'apparel', expectedBrand: 'levis', keySpecs: ['511', 'slim', 'jeans', 'denim', 'cotton'] },
  { query: 'women embroidered kurti', domain: 'apparel', expectedCategory: 'apparel', expectedBrand: null, keySpecs: ['embroidered', 'kurti', 'kurta', 'women', 'cotton', 'silk'] },
  { query: 'nike dri fit t-shirt', domain: 'apparel', expectedCategory: 'apparel', expectedBrand: 'nike', keySpecs: ['dri-fit', 't-shirt', 'tshirt', 'training', 'polyester'] },
  { query: 'men winter jacket', domain: 'apparel', expectedCategory: 'apparel', expectedBrand: null, keySpecs: ['winter', 'jacket', 'bomber', 'puffer', 'men', 'windcheater'] },

  // ── Category 4: Other (Watches, Beauty, Bags, Appliances) ──
  { query: 'titan analog watch', domain: 'watches', expectedCategory: 'watches', expectedBrand: 'titan', keySpecs: ['analog', 'watch', 'men', 'women', 'quartz', 'dial', 'leather', 'stainless steel'] },
  { query: 'himalaya neem face wash', domain: 'beauty', expectedCategory: 'beauty', expectedBrand: 'himalaya', keySpecs: ['neem', 'face wash', 'purifying', 'acne', 'cleanser'] },
  { query: 'wildcraft 35l backpack', domain: 'bags', expectedCategory: 'bags', expectedBrand: 'wildcraft', keySpecs: ['35l', 'backpack', 'bag', 'travel', 'laptop'] },
  { query: 'philips air fryer', domain: 'appliances', expectedCategory: 'home_kitchen', expectedBrand: 'philips', keySpecs: ['air fryer', 'rapid air', 'digital', 'fryer'] }
];

async function runAudit() {
  console.log('================================================================');
  console.log('🔬 STARTING COMPREHENSIVE SEARCH ACCURACY & LATENCY AUDIT');
  console.log('================================================================\n');

  // Start test server on random ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🌐 Test server booted on ${baseUrl}\n`);

  const auditTelemetry = [];
  const globalRetailerLatencies = {
    flipkart: [],
    snapdeal: [],
    simulated: []
  };

  for (const qItem of TEST_QUERIES) {
    const { query, domain, expectedCategory, expectedBrand, keySpecs } = qItem;
    console.log(`================================================================`);
    console.log(`🔎 AUDITING QUERY: "${query}" [Domain: ${domain.toUpperCase()} | Cat: ${expectedCategory} | Brand: ${expectedBrand || 'Any'}]`);
    console.log(`================================================================`);

    // 1. Measure Live Retailer Scraping Latencies Separately
    let fkLatency = 0;
    let sdLatency = 0;
    let simLatency = 0;
    let liveFkProducts = [];
    let liveSdProducts = [];
    let simProducts = [];

    // Flipkart Live
    const fkStart = performance.now();
    try {
      liveFkProducts = await scrapeFlipkartSearch(query, 1);
    } catch (e) {
      console.log(`   [Flipkart Scrape Note]: ${e.message}`);
    }
    fkLatency = Math.round(performance.now() - fkStart);
    globalRetailerLatencies.flipkart.push(fkLatency);

    // Snapdeal Live
    const sdStart = performance.now();
    try {
      liveSdProducts = await scrapeSnapdealSearch(query, 1);
    } catch (e) {
      console.log(`   [Snapdeal Scrape Note]: ${e.message}`);
    }
    sdLatency = Math.round(performance.now() - sdStart);
    globalRetailerLatencies.snapdeal.push(sdLatency);

    // Simulated Stores
    const simStart = performance.now();
    const targetSimStores = ['amazon', 'myntra', 'ajio', 'croma', 'tatacliq', 'bata', 'nike', 'adidas', 'apple', 'samsung', 'boat', 'titan'];
    for (const store of targetSimStores) {
      simProducts.push(...simulateStoreSearch(query, store, 1, 'Mumbai'));
    }
    simLatency = Math.round(performance.now() - simStart);
    globalRetailerLatencies.simulated.push(simLatency);

    // 2. Measure End-to-End POST /api/scrape Latency (using category: 'ecommerce' for multi-retailer catalog)
    const scrapeApiStart = performance.now();
    let scrapeApiRes;
    try {
      const res = await fetch(`${baseUrl}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category: 'ecommerce', source: 'all', pages: 1 })
      });
      scrapeApiRes = await res.json();
    } catch (err) {
      console.error(`   ❌ Scrape API failed:`, err);
      scrapeApiRes = { products: [], meta: {} };
    }
    const scrapeApiLatency = Math.round(performance.now() - scrapeApiStart);

    // 3. Measure End-to-End POST /api/compare Latency
    const compareApiStart = performance.now();
    let compareApiRes;
    try {
      const res = await fetch(`${baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category: 'electronics', location: 'Mumbai' })
      });
      compareApiRes = await res.json();
    } catch (err) {
      console.error(`   ❌ Compare API failed:`, err);
      compareApiRes = { comparison: {} };
    }
    const compareApiLatency = Math.round(performance.now() - compareApiStart);

    // 4. Detailed Product Validation across All Returned Products
    const returnedProducts = scrapeApiRes.products || [];
    let falsePositives = [];
    let missingExactProducts = [];
    let duplicates = [];
    let genericUrls = [];
    let validProducts = [];
    let brandMismatches = [];
    let categoryMismatches = [];
    let specMatches = 0;

    const seenTitles = new Set();
    const seenExactUrls = new Set();

    for (const prod of returnedProducts) {
      const title = prod.name || '';
      const source = prod.source || 'unknown';
      const score = prod.relevanceScore || 0;
      const url = prod.productUrl || prod.productLink || '';
      const isExact = Boolean(prod.isExactProductUrl);

      // Check Duplicates
      const titleKey = `${source}-${title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
      if (seenTitles.has(titleKey)) {
        duplicates.push({ title, source, reason: 'Duplicate title from same store' });
      } else {
        seenTitles.add(titleKey);
      }

      if (isExact && url) {
        if (seenExactUrls.has(url)) {
          duplicates.push({ title, source, reason: `Duplicate exact product URL: ${url}` });
        } else {
          seenExactUrls.add(url);
        }
      }

      // Check URL Accuracy & Classification
      const urlValidation = validateProductUrl(url, source);
      if (isExact && !urlValidation.isExactProductUrl) {
        genericUrls.push({
          title,
          source,
          url,
          reason: 'Marked isExactProductUrl: true but URL is generic homepage or search listing'
        });
      } else if (!isExact && urlValidation.isExactProductUrl) {
        genericUrls.push({
          title,
          source,
          url,
          reason: 'Valid exact product detail URL misclassified as isExactProductUrl: false'
        });
      }

      // Check Category Accuracy
      const detectedCats = detectCategoryIntents(title);
      let isCategoryMatch = true;
      if (expectedCategory) {
        if (detectedCats.length > 0 && !detectedCats.includes(expectedCategory)) {
          // Allow compatible / overlap categories (e.g. appliances & home_kitchen, computing & appliances for TVs)
          const isCompatible = (expectedCategory === 'appliances' && (detectedCats.includes('home_kitchen') || detectedCats.includes('appliances'))) ||
                               (expectedCategory === 'home_kitchen' && (detectedCats.includes('appliances') || detectedCats.includes('home_kitchen'))) ||
                               (expectedCategory === 'bags' && (detectedCats.includes('apparel') || detectedCats.includes('bags')));
          if (!isCompatible) {
            isCategoryMatch = false;
            categoryMismatches.push({ title, source, detectedCats, expectedCategory, score });
          }
        }
      }

      // Check Brand Accuracy
      const detectedBrands = detectBrands(title);
      let isBrandMatch = true;
      if (expectedBrand) {
        if (detectedBrands.length > 0 && !detectedBrands.some(b => b.key === expectedBrand)) {
          isBrandMatch = false;
          brandMismatches.push({ title, source, detectedBrands: detectedBrands.map(b => b.key), expectedBrand, score });
        }
      }

      // Check Specifications
      const lowerTitle = title.toLowerCase();
      const hasSpec = keySpecs.some(spec => lowerTitle.includes(spec.toLowerCase()));
      if (hasSpec) specMatches++;

      // Global False Positive Classification
      if (!isBrandMatch || !isCategoryMatch || score < 0.30) {
        falsePositives.push({
          title,
          source,
          score,
          reason: !isBrandMatch ? `Wrong brand (detected: ${detectedBrands.map(b=>b.key).join(',')}, expected: ${expectedBrand})` :
                  !isCategoryMatch ? `Wrong category (detected: ${detectedCats.join(',')}, expected: ${expectedCategory})` :
                  `Low score (${score})`
        });
      } else {
        validProducts.push(prod);
      }
    }

    // 5. Check False Negatives / Missing Exact Products (Recall Audit)
    const allLiveScraped = [...liveFkProducts, ...liveSdProducts];
    for (const rawLive of allLiveScraped) {
      const title = rawLive.name || '';
      const scoreRes = calculateRelevanceScore(query, title, { threshold: 0.30 });
      if (!scoreRes.accepted) {
        missingExactProducts.push({
          title,
          source: rawLive.source,
          score: scoreRes.score,
          reason: scoreRes.reason
        });
      }
    }

    const precision = returnedProducts.length > 0
      ? (((returnedProducts.length - falsePositives.length) / returnedProducts.length) * 100).toFixed(1)
      : '0.0';

    console.log(`   ⏱️ Latency: Total Scrape=${scrapeApiLatency}ms | Compare=${compareApiLatency}ms | FK=${fkLatency}ms | SD=${sdLatency}ms | Sim=${simLatency}ms`);
    console.log(`   📦 Products: Total Retained=${returnedProducts.length} | Valid=${validProducts.length} | FalsePos=${falsePositives.length} | MissingExact=${missingExactProducts.length} | Duplicates=${duplicates.length} | GenericURLs=${genericUrls.length}`);
    console.log(`   🎯 Precision: ${precision}% | Spec Alignment: ${specMatches}/${returnedProducts.length}`);

    if (falsePositives.length > 0) {
      console.log(`   ⚠️ Sample False Positives:`);
      falsePositives.slice(0, 3).forEach(fp => console.log(`      - [${fp.source}] "${fp.title}" -> ${fp.reason}`));
    }
    if (missingExactProducts.length > 0) {
      console.log(`   ⚠️ Sample Missing Legitimate Products (False Negatives):`);
      missingExactProducts.slice(0, 3).forEach(fn => console.log(`      - [${fn.source}] "${fn.title}" -> Score ${fn.score} (${fn.reason})`));
    }
    if (genericUrls.length > 0) {
      console.log(`   ⚠️ Sample URL Misclassifications:`);
      genericUrls.slice(0, 2).forEach(gu => console.log(`      - [${gu.source}] "${gu.title}" -> ${gu.reason}`));
    }

    auditTelemetry.push({
      query,
      domain,
      expectedCategory,
      expectedBrand,
      retainedCount: returnedProducts.length,
      validCount: validProducts.length,
      falsePositivesCount: falsePositives.length,
      missingCount: missingExactProducts.length,
      duplicateCount: duplicates.length,
      genericUrlCount: genericUrls.length,
      precision: parseFloat(precision),
      scrapeLatencyMs: scrapeApiLatency,
      compareLatencyMs: compareApiLatency,
      fkLatencyMs: fkLatency,
      sdLatencyMs: sdLatency,
      simLatencyMs: simLatency,
      sampleTopProduct: returnedProducts[0] ? returnedProducts[0].name : 'N/A',
      sampleTopSource: returnedProducts[0] ? returnedProducts[0].source : 'N/A',
      sampleTopIsExact: returnedProducts[0] ? returnedProducts[0].isExactProductUrl : false,
      sampleTopUrl: returnedProducts[0] ? (returnedProducts[0].productUrl || returnedProducts[0].productLink) : 'N/A',
      falsePositiveSamples: falsePositives,
      missingSamples: missingExactProducts,
      genericUrlSamples: genericUrls
    });
  }

  server.close();

  // ── Overall Performance & Telemetry Aggregation ──
  console.log('\n\n================================================================');
  console.log('📊 OVERALL AUDIT TELEMETRY & LATENCY SUMMARY');
  console.log('================================================================');

  const avgScrapeLatency = Math.round(auditTelemetry.reduce((acc, t) => acc + t.scrapeLatencyMs, 0) / auditTelemetry.length);
  const avgCompareLatency = Math.round(auditTelemetry.reduce((acc, t) => acc + t.compareLatencyMs, 0) / auditTelemetry.length);
  const avgFkLatency = Math.round(globalRetailerLatencies.flipkart.reduce((a, b) => a + b, 0) / globalRetailerLatencies.flipkart.length);
  const avgSdLatency = Math.round(globalRetailerLatencies.snapdeal.reduce((a, b) => a + b, 0) / globalRetailerLatencies.snapdeal.length);
  const avgSimLatency = Math.round(globalRetailerLatencies.simulated.reduce((a, b) => a + b, 0) / globalRetailerLatencies.simulated.length);
  const avgPrecision = (auditTelemetry.reduce((acc, t) => acc + t.precision, 0) / auditTelemetry.length).toFixed(1);

  const totalReturned = auditTelemetry.reduce((acc, t) => acc + t.retainedCount, 0);
  const totalFalsePos = auditTelemetry.reduce((acc, t) => acc + t.falsePositivesCount, 0);
  const totalMissing = auditTelemetry.reduce((acc, t) => acc + t.missingCount, 0);
  const totalDuplicates = auditTelemetry.reduce((acc, t) => acc + t.duplicateCount, 0);
  const totalGenericUrlIssues = auditTelemetry.reduce((acc, t) => acc + t.genericUrlCount, 0);

  console.log(`\n📈 SUMMARY METRICS across ${auditTelemetry.length} queries:`);
  console.log(`   - Average /api/scrape Latency: ${avgScrapeLatency} ms`);
  console.log(`   - Average /api/compare Latency: ${avgCompareLatency} ms`);
  console.log(`   - Average Flipkart Live Latency: ${avgFkLatency} ms`);
  console.log(`   - Average Snapdeal Live Latency: ${avgSdLatency} ms`);
  console.log(`   - Average Simulation Latency: ${avgSimLatency} ms`);
  console.log(`   - Mean Precision: ${avgPrecision}%`);
  console.log(`   - Total Products Audited: ${totalReturned}`);
  console.log(`   - Total False Positives: ${totalFalsePos}`);
  console.log(`   - Total Missing Live Products (False Negatives): ${totalMissing}`);
  console.log(`   - Total Duplicate Products: ${totalDuplicates}`);
  console.log(`   - Total URL Misclassifications: ${totalGenericUrlIssues}`);

  console.log('\n📋 DETAILED QUERY PERFORMANCE TABLE:');
  console.table(auditTelemetry.map(t => ({
    Query: t.query,
    Domain: t.domain,
    Retained: t.retainedCount,
    FalsePos: t.falsePositivesCount,
    Missing: t.missingCount,
    Precision: `${t.precision}%`,
    ScrapeMs: `${t.scrapeLatencyMs}ms`,
    CompareMs: `${t.compareLatencyMs}ms`,
    FkMs: `${t.fkLatencyMs}ms`,
    SdMs: `${t.sdLatencyMs}ms`
  })));

  return {
    telemetry: auditTelemetry,
    latencies: {
      avgScrapeLatency,
      avgCompareLatency,
      avgFkLatency,
      avgSdLatency,
      avgSimLatency
    },
    totals: {
      totalReturned,
      totalFalsePos,
      totalMissing,
      totalDuplicates,
      totalGenericUrlIssues,
      avgPrecision
    }
  };
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
