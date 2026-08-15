import { doesStoreSellQuery } from '../server/scraper.js';

const tests = [
  // Nike shoes
  { store: 'nike', query: 'Nike shoes', expected: true },
  { store: 'bata', query: 'Nike shoes', expected: false }, // single-brand mismatch
  { store: 'myntra', query: 'Nike shoes', expected: true }, // multi-brand fashion retailer
  { store: 'apple', query: 'Nike shoes', expected: false },
  { store: 'dell', query: 'Nike shoes', expected: false },
  { store: 'jbl', query: 'Nike shoes', expected: false },

  // iPhone
  { store: 'apple', query: 'iPhone', expected: true },
  { store: 'croma', query: 'iPhone', expected: true },
  { store: 'nike', query: 'iPhone', expected: false },
  { store: 'baggit', query: 'iPhone', expected: false },

  // laptop
  { store: 'dell', query: 'laptop', expected: true },
  { store: 'hp', query: 'laptop', expected: true },
  { store: 'lenovo', query: 'laptop', expected: true },
  { store: 'nike', query: 'laptop', expected: false },
  { store: 'baggit', query: 'laptop', expected: false },

  // laptop backpack
  { store: 'baggit', query: 'laptop backpack', expected: true },
  { store: 'caprese', query: 'laptop backpack', expected: true },
  { store: 'dell', query: 'laptop backpack', expected: false },
  { store: 'apple', query: 'laptop backpack', expected: false },

  // cream shoes
  { store: 'nike', query: 'cream shoes', expected: true },
  { store: 'bata', query: 'cream shoes', expected: true },
  { store: 'nykaa', query: 'cream shoes', expected: false },
  { store: 'mamaearth', query: 'cream shoes', expected: false },

  // bag
  { store: 'baggit', query: 'bag', expected: true },
  { store: 'caprese', query: 'bag', expected: true },
  { store: 'lavie', query: 'bag', expected: true },
  { store: 'hidesign', query: 'bag', expected: true },
  { store: 'apple', query: 'bag', expected: false },
  { store: 'boat', query: 'bag', expected: false }
];

let failed = 0;
for (const t of tests) {
  const res = doesStoreSellQuery(t.store, t.query);
  const pass = res === t.expected;
  if (!pass) failed++;
  console.log(`Store: ${t.store.padEnd(12)} | Query: ${t.query.padEnd(18)} | Expected: ${String(t.expected).padEnd(5)} | Got: ${String(res).padEnd(5)} | ${pass ? '✅ PASS' : '❌ FAIL'}`);
}

console.log(`\nTotal: ${tests.length}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
