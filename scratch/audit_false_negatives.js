import { calculateRelevanceScore } from '../server/relevance.js';

const testCases = [
  // Footwear
  { query: 'nike shoes', title: 'Nike Air Max SC Sneakers For Men', expectedAccept: true },
  { query: 'nike shoes', title: 'Nike Revolution 6 Running Shoes For Men', expectedAccept: true },
  { query: 'nike shoes', title: 'Nike Court Vision Low Sneakers For Men', expectedAccept: true },
  { query: 'nike shoes', title: 'Nike Downshifter 12 Running Shoes', expectedAccept: true },
  { query: 'nike shoes', title: 'Nike Air Monarch IV Training Shoes', expectedAccept: true },
  { query: 'adidas shoes', title: 'ADIDAS GALAXY 6 Running Shoes For Men', expectedAccept: true },
  { query: 'adidas shoes', title: 'ADIDAS Stan Smith Sneakers', expectedAccept: true },
  { query: "men's running shoes", title: 'ASIAN TARZAN-11 Grey Sports Running Shoes for Men', expectedAccept: true },
  { query: "women's sneakers", title: 'Puma Carina Street Sneaker For Women', expectedAccept: true },

  // Electronics
  { query: 'iphone 15', title: 'Apple iPhone 15 (Black, 128 GB)', expectedAccept: true },
  { query: 'iphone 15', title: 'Apple iPhone 15 Plus (Blue, 256 GB)', expectedAccept: true },
  { query: 'iphone 15', title: 'Apple iPhone 15 Pro Max (Natural Titanium, 256 GB)', expectedAccept: true },
  { query: 'samsung galaxy phone', title: 'SAMSUNG Galaxy S24 5G (Onyx Black, 256 GB)', expectedAccept: true },
  { query: 'samsung galaxy phone', title: 'SAMSUNG Galaxy M34 5G (Prism Silver, 128 GB)', expectedAccept: true },
  { query: 'laptop', title: 'HP Pavilion 15-eg3018TU Intel Core i5 13th Gen', expectedAccept: true },
  { query: 'laptop', title: 'ASUS Vivobook 15 Intel Core i3 12th Gen Thin and Light Laptop', expectedAccept: true },
  { query: 'laptop', title: 'Lenovo IdeaPad Slim 3 Intel Core i7 12th Gen', expectedAccept: true },
  { query: 'bluetooth headphones', title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', expectedAccept: true },
  { query: 'bluetooth headphones', title: 'boAt Rockerz 450 Bluetooth On-Ear Headphone with Mic', expectedAccept: true },
  { query: 'bluetooth headphones', title: 'JBL Tune 770NC Wireless Over-Ear NC Headphones', expectedAccept: true },
  { query: '55 inch smart tv', title: 'LG 139 cm (55 inch) Ultra HD (4K) LED Smart WebOS TV 2024 Edition', expectedAccept: true },
  { query: '55 inch smart tv', title: 'SAMSUNG Crystal 4K Vivid Pro 138 cm (55 inch) Ultra HD (4K) Smart Tizen TV', expectedAccept: true },
  { query: '55 inch smart tv', title: 'SONY Bravia 138.8 cm (55 inch) Ultra HD (4K) Smart Google TV', expectedAccept: true },

  // Apparel
  { query: "men's jeans", title: "Levi's Men 511 Slim Mid Rise Jeans", expectedAccept: true },
  { query: "men's jeans", title: "SPYKAR Men Slim Fit Mid Rise Blue Jeans", expectedAccept: true },
  { query: "women's kurti", title: "BIBA Women Printed Straight Kurta", expectedAccept: true },
  { query: 'nike t shirt', title: "Nike Dri-FIT Men's Training T-Shirt", expectedAccept: true },

  // Other & Edge Cases
  { query: 'wrist watch', title: 'Titan Neo Analog Watch for Men', expectedAccept: true },
  { query: 'wrist watch', title: 'Casio Vintage Digital Grey Dial Watch A168WA-1WDF', expectedAccept: true },
  { query: 'face wash', title: 'Himalaya Purifying Neem Face Wash 200ml', expectedAccept: true },
  { query: 'face wash', title: 'Minimalist 2% Salicylic Acid Face Wash for Oily Skin', expectedAccept: true },
  { query: 'backpack', title: 'Wildcraft 35 Ltrs Casual Backpack', expectedAccept: true },
  { query: 'air fryer', title: 'PHILIPS Digital Air Fryer HD9252/90 with Rapid Air Technology', expectedAccept: true },
  { query: 'apple watch', title: 'Apple Watch Series 9 GPS 45mm Midnight Aluminium Case', expectedAccept: true },
  { query: 'apple laptop', title: 'Apple MacBook Air Apple M2 - (16 GB/256 GB SSD/macOS)', expectedAccept: true },
  { query: 'macbook', title: 'Apple MacBook Pro M3 (16 GB/512 GB SSD/macOS)', expectedAccept: true },
  { query: 'gaming laptop', title: 'Acer Predator Helios 16 Intel Core i7 13th Gen Gaming Laptop', expectedAccept: true },
  { query: 'gaming laptop', title: 'ASUS TUF Gaming F15 Intel Core i5 11th Gen Gaming Laptop', expectedAccept: true }
];

console.log('=== FALSE NEGATIVE AUDIT (RECALL ON REAL PRODUCTS) ===\n');
let falseNegatives = [];

for (const { query, title, expectedAccept } of testCases) {
  const result = calculateRelevanceScore(query, title, { threshold: 0.30 });
  const isAccepted = result.accepted;
  const status = (isAccepted === expectedAccept) ? '✅ PASS' : '❌ FALSE NEGATIVE (Accidentally Rejected)';
  console.log(`${status}: [Query: "${query}"] -> "${title}" | Score: ${result.score} | Decision: ${result.decision} | Reason: ${result.reason}`);
  if (isAccepted !== expectedAccept) {
    falseNegatives.push({ query, title, score: result.score, reason: result.reason });
  }
}

console.log(`\nTotal cases: ${testCases.length}, False Negatives: ${falseNegatives.length}`);
