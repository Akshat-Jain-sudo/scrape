import { updateScraperHealth } from './db.js';
import { simulateStoreSearch } from './scraper.js';

// We simulate a real scrape test here since we only have simulated/live logic in scraper.js.
// In reality, this would hit the actual scraper APIs (like axios get flipkart url).
// For the sake of the project, we test if the scraper module returns results.

export async function checkScraperHealth(store) {
  try {
    const testQuery = store === 'blinkit' || store === 'zepto' ? 'milk' : 'laptop';
    const location = 'Mumbai';
    
    // Simulate real scrape logic
    const results = simulateStoreSearch(testQuery, store, 1, location);
    
    if (results && results.length > 0) {
      updateScraperHealth(store, 'healthy', null, 1.0);
    } else {
      updateScraperHealth(store, 'degraded', 'No results returned', 0.5);
    }
  } catch (error) {
    updateScraperHealth(store, 'dead', error.message || 'Timeout or crash', 0.0);
  }
}

export async function runAllHealthChecks() {
  console.log('🩺 Running scraper health checks...');
  const targetStores = ['flipkart', 'snapdeal'];
  
  for (const store of targetStores) {
    await checkScraperHealth(store);
  }
}
