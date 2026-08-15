import { calculateRelevanceScore } from '../server/relevance.js';

const tests = [
  { query: 'phone', title: 'Apple iPhone 15 (Black, 128 GB)' },
  { query: 'phone', title: 'SAMSUNG Galaxy S24 5G (Onyx Black, 256 GB)' },
  { query: 'smartphone', title: 'OnePlus 12R (Cool Blue, 256 GB)' },
  { query: 'smartphone', title: 'Redmi Note 13 Pro 5G (Midnight Black, 128 GB)' },
  { query: 'laptop', title: 'Dell Inspiron 3520 Laptop' },
  { query: 'laptop', title: 'Dell Inspiron 3520 Intel Core i5 12th Gen' },
  { query: 'laptop', title: 'Apple MacBook Air M2' },
  { query: 'laptop', title: 'HP Victus Gaming Intel Core i5 13th Gen' },
  { query: 'laptop', title: 'Acer Nitro 5 Intel Core i7 12th Gen' },
  { query: 'shoes', title: 'Nike Air Max SC' },
  { query: 'shoes', title: 'ADIDAS Stan Smith' },
  { query: 'shoes', title: 'Puma Suede Classic XXI' }
];

console.log('=== MODEL ALIAS & GENERIC RECALL TEST ===\n');
for (const { query, title } of tests) {
  const res = calculateRelevanceScore(query, title, { threshold: 0.30 });
  const status = res.accepted ? '✅ PASS' : '❌ REJECTED';
  console.log(`${status}: [Query: "${query}"] -> "${title}" | Score: ${res.score} | Reason: ${res.reason}`);
}
