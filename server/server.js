import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 FlipScrape Server running on http://localhost:${PORT}`);
  console.log(`   API endpoints:`);
  console.log(`   POST /api/scrape          — Scrape Flipkart products`);
  console.log(`   GET  /api/products        — List saved products`);
  console.log(`   POST /api/products        — Save products`);
  console.log(`   DEL  /api/products/:id    — Delete a product`);
  console.log(`   DEL  /api/products        — Clear all products`);
  console.log(`   GET  /api/analytics       — Product analytics`);
  console.log(`   GET  /api/export/csv      — Export CSV`);
  console.log(`   GET  /api/export/excel    — Export Excel`);
  console.log(`   GET  /api/history         — Scrape history\n`);
});
