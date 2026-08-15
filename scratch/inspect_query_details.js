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

const queriesToInspect = [
  'nike shoes',
  'adidas shoes',
  'iphone 15',
  'laptop',
  'bluetooth headphones',
  'air fryer',
  'face wash',
  'backpack',
  'apple watch',
  'apple laptop',
  'macbook',
  'gaming laptop'
];

async function inspect() {
  for (const q of queriesToInspect) {
    console.log(`\n======================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`======================================================`);

    let raw = [];
    try { raw.push(...await scrapeFlipkartSearch(q, 1)); } catch (e) {}
    try { raw.push(...await scrapeSnapdealSearch(q, 1)); } catch (e) {}
    for (const s of ['amazon', 'myntra', 'bata', 'nike', 'apple', 'croma', 'reliance', 'boat', 'tatacliq']) {
      raw.push(...simulateStoreSearch(q, s, 1, 'Mumbai'));
    }

    const { products: retained, stats } = filterAndRankProducts(q, raw, { threshold: 0.30 });
    console.log(`Stats: Total=${stats.totalInput}, Accepted=${stats.accepted}, Rejected=${stats.rejected}`);
    console.log(`Top 10 Retained:`);
    retained.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i+1}. [${p.source} (${p.sourceMode})] "${p.name}" (Score: ${p.relevanceScore}, isExact: ${p.isExactProductUrl})`);
    });
  }
}

inspect().catch(console.error);
