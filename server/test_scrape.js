import { scrapeFlipkartSearch, scrapeSnapdealSearch } from './scraper.js';

async function test() {
  console.log('Testing Flipkart scrape for "iphone 16"...');
  const fk = await scrapeFlipkartSearch('iphone 16', 1);
  console.log(`Flipkart found ${fk.length} items:`);
  fk.slice(0, 3).forEach(p => {
    console.log(`- ${p.name}: price=${p.price} (${p.priceFormatted}), original=${p.originalPrice}, discount=${p.discount}%`);
  });

  console.log('\nTesting Snapdeal scrape for "iphone 16"...');
  const sd = await scrapeSnapdealSearch('iphone 16', 1);
  console.log(`Snapdeal found ${sd.length} items:`);
  sd.slice(0, 3).forEach(p => {
    console.log(`- ${p.name}: price=${p.price} (${p.priceFormatted}), original=${p.originalPrice}, discount=${p.discount}%`);
  });
}

test();
