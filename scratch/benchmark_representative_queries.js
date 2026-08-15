import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import axios from 'axios';
import app from '../server/app.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const REPRESENTATIVE_QUERIES = [
  { query: 'Nike shoes', category: 'ecommerce', expectedCategory: 'footwear' },
  { query: 'iPhone', category: 'electronics', expectedCategory: 'smartphones' },
  { query: 'laptop', category: 'electronics', expectedCategory: 'computing' },
  { query: 'laptop backpack', category: 'bags', expectedCategory: 'bags' },
  { query: 'bag', category: 'bags', expectedCategory: 'bags' },
  { query: 'Samsung Galaxy', category: 'electronics', expectedCategory: 'smartphones' },
  { query: 'headphones', category: 'electronics', expectedCategory: 'audio' },
  { query: 'cream shoes', category: 'footwear', expectedCategory: 'footwear' },
  { query: 'face cream', category: 'beauty', expectedCategory: 'beauty' },
  { query: 'watch', category: 'watches', expectedCategory: 'watches' }
];

async function runBenchmark() {
  console.log('================================================================');
  console.log('   PHASE 5 — LIVE PERFORMANCE & RELEVANCE BENCHMARK AUDIT');
  console.log('================================================================\n');

  const testPort = 55889;
  const server = app.listen(testPort);
  const baseUrl = `http://localhost:${testPort}`;

  const results = [];

  try {
    for (const item of REPRESENTATIVE_QUERIES) {
      console.log(`Auditing query: "${item.query}" [Category: ${item.category}]...`);
      const startMs = Date.now();
      
      const res = await axios.post(`${baseUrl}/api/scrape`, {
        query: item.query,
        category: item.category,
        source: 'all',
        pages: 1,
        location: 'Mumbai'
      });

      const latencyMs = Date.now() - startMs;
      const data = res.data;
      const rawCount = data.metadata?.totalExtracted || data.products?.length || 0;
      const finalProducts = data.products || [];
      const finalCount = finalProducts.length;

      // Extract unique store sources
      const scrapedStores = Array.from(new Set(finalProducts.map(p => p.source)));

      // Contamination check: Any product violating category or brand
      let irrelevantCount = 0;
      const contaminants = [];

      for (const p of finalProducts) {
        const title = (p.name || '').toLowerCase();
        
        if (item.query === 'Nike shoes' && (title.includes('iphone') || title.includes('macbook') || title.includes('television') || title.includes('fridge'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        } else if (item.query === 'iPhone' && (title.includes('shoe') || title.includes('sneaker') || title.includes('saree') || title.includes('curtain'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        } else if (item.query === 'laptop' && (title.includes('shoe') || title.includes('sneaker') || title.includes('saree') || title.includes('lipstick'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        } else if (item.query === 'laptop backpack' && (title.includes('intel core') || title.includes('ryzen 7') || title.includes('macbook pro'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        } else if (item.query === 'cream shoes' && (title.includes('face cream') || title.includes('skin cream') || title.includes('sunscreen') || title.includes('shampoo'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        } else if (item.query === 'face cream' && (title.includes('shoe') || title.includes('sneaker') || title.includes('laptop') || title.includes('phone'))) {
          irrelevantCount++;
          contaminants.push(p.name);
        }
      }

      const irrelevantPct = finalCount > 0 ? ((irrelevantCount / finalCount) * 100).toFixed(1) : '0.0';

      results.push({
        query: item.query,
        category: item.category,
        latencyMs,
        storesCount: scrapedStores.length,
        rawCount,
        finalCount,
        irrelevantCount,
        irrelevantPct: `${irrelevantPct}%`,
        contaminantsCount: contaminants.length
      });

      console.log(`   ⏱️ Latency: ${latencyMs}ms | Stores: ${scrapedStores.length} | Raw: ${rawCount} | Final: ${finalCount} | Irrelevant: ${irrelevantCount} (${irrelevantPct}%)\n`);
    }

    console.log('\n================================================================');
    console.log('   BENCHMARK SUMMARY TABLE');
    console.log('================================================================');
    console.table(results);

    const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length);
    const totalFinal = results.reduce((sum, r) => sum + r.finalCount, 0);
    const totalContaminants = results.reduce((sum, r) => sum + r.contaminantsCount, 0);

    console.log(`\nAverage Latency: ${avgLatency}ms`);
    console.log(`Total Final Products Delivered: ${totalFinal}`);
    console.log(`Total Category/Brand Contaminants: ${totalContaminants}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    stopPriceHistoryScheduler();
    server.close();
  }
}

runBenchmark();
