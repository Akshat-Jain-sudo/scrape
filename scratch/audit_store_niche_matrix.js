import { doesStoreSellQuery } from '../server/scraper.js';

const testCases = [
  { store: 'boat', query: 'laptop', expected: false },
  { store: 'boat', query: 'gaming laptop', expected: false },
  { store: 'boat', query: '55 inch smart tv', expected: false },
  { store: 'boat', query: 'refrigerator', expected: false },
  { store: 'dell', query: 'wrist watch', expected: false },
  { store: 'hp', query: 'wrist watch', expected: false },
  { store: 'lenovo', query: 'wrist watch', expected: false },
  { store: 'voltas', query: 'wrist watch', expected: false },
  { store: 'bata', query: 'nike shoes', expected: false },
  { store: 'woodland', query: 'nike shoes', expected: false },
  { store: 'crocs', query: 'nike shoes', expected: false },
  { store: 'skechers', query: 'nike shoes', expected: false },
  { store: 'campusshoes', query: 'nike shoes', expected: false },
  { store: 'spykar', query: 'nike shoes', expected: false },
  { store: 'killerjeans', query: 'nike shoes', expected: false },
  { store: 'mufti', query: 'nike shoes', expected: false },
  { store: 'souledstore', query: 'nike shoes', expected: false },
  { store: 'apple', query: 'samsung galaxy phone', expected: false },
  { store: 'samsung', query: 'iphone 15', expected: false },
  { store: 'tanishq', query: 'laptop', expected: false },
  { store: 'decathlon', query: 'iphone 15', expected: false },
  { store: 'mamaearth', query: 'laptop', expected: false }
];

console.log('=== STORE NICHE VALIDATION AUDIT ===\n');
let mismatches = [];

for (const { store, query, expected } of testCases) {
  const actual = doesStoreSellQuery(store, query);
  const ok = actual === expected;
  const status = ok ? '✅ PASS' : '❌ FAIL (Contamination)';
  console.log(`${status}: Store "${store}" for query "${query}" -> ${actual} (expected ${expected})`);
  if (!ok) {
    mismatches.push({ store, query, actual, expected });
  }
}

console.log(`\nTotal test cases: ${testCases.length}, Mismatches: ${mismatches.length}`);
