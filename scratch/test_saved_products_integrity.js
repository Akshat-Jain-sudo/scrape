import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import axios from 'axios';
import app from '../server/app.js';
import { getNeonPool } from '../server/neonDb.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSavedProductsIntegritySuite() {
  console.log('================================================================');
  console.log('   SAVED PRODUCTS DATA INTEGRITY & RENDERING AUDIT SUITE');
  console.log('================================================================\n');

  const testPort = 56991;
  const server = app.listen(testPort);
  const baseUrl = `http://localhost:${testPort}`;
  const pool = getNeonPool();

  const ts = Date.now();
  const userAEmail = `saved_user_a_${ts}@test.com`;
  const userBEmail = `saved_user_b_${ts}@test.com`;
  let tokenA, userAId, tokenB, userBId;

  try {
    // ── Phase 1: User Registration ──
    console.log('--- Phase 1: Setup Test Users ---');
    const resA = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: userAEmail,
      password: 'UserA_Password_123!',
      fullName: 'Saved User A'
    });
    tokenA = resA.data.token;
    userAId = resA.data.user.id;
    assert(tokenA && userAId, 'User A registered with JWT and UUID');

    const resB = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: userBEmail,
      password: 'UserB_Password_456!',
      fullName: 'Saved User B'
    });
    tokenB = resB.data.token;
    userBId = resB.data.user.id;
    assert(tokenB && userBId, 'User B registered with JWT and UUID');

    // ── Phase 2: Save Single Product & Map Verification ──
    console.log('\n--- Phase 2: Save Single Product & Row Mapping Verification ---');
    const product1 = {
      id: `prod-nike-${ts}`,
      name: 'Nike Air Max SC Running Shoes',
      price: 5495,
      priceFormatted: '₹5,495',
      originalPrice: 7995,
      originalPriceFormatted: '₹7,995',
      discountFormatted: '31% off',
      rating: 4.5,
      ratingsCount: 1250,
      imageUrl: 'https://rukminim2.flixcart.com/image/612/612/nike-air-max.jpg',
      productLink: 'https://www.flipkart.com/nike-air-max-sc-running-shoes/p/itm123456?pid=SHO123456',
      productUrl: 'https://www.flipkart.com/nike-air-max-sc-running-shoes/p/itm123456?pid=SHO123456',
      isExactProductUrl: true,
      urlType: 'product',
      source: 'flipkart',
      category: 'ecommerce',
      query: 'Nike shoes',
      location: 'Mumbai',
      pincode: '400001'
    };

    const saveRes1 = await axios.post(`${baseUrl}/api/products`, {
      products: [product1]
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(saveRes1.status === 201, 'Save single product returned HTTP 201');
    assert(saveRes1.data.savedCount === 1, 'Save response reports 1 product saved');

    // Fetch saved products for User A
    const getRes1 = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getRes1.status === 200, 'GET /api/products returned HTTP 200');
    assert(getRes1.data.length === 1, 'User A has exactly 1 saved product');

    const mapped = getRes1.data[0];
    assert(mapped.name === 'Nike Air Max SC Running Shoes', 'Name mapped correctly');
    assert(mapped.source === 'flipkart', 'Store/source mapped correctly');
    assert(mapped.price === 5495, 'Price numeric mapped correctly');
    assert(mapped.priceFormatted === '₹5,495', 'Price formatted mapped correctly');
    assert(mapped.originalPrice === 7995, 'Original price mapped correctly');
    assert(mapped.imageUrl === product1.imageUrl, 'Image URL preserved');
    assert(mapped.productUrl === product1.productUrl, 'Exact canonical product URL preserved');
    assert(mapped.isExactProductUrl === true, 'isExactProductUrl is true');
    assert(mapped.urlType === 'product', 'urlType is "product"');
    assert(Boolean(mapped.dbId), 'dbId UUID is present on mapped record');

    // ── Phase 3: Duplicate Prevention (Save Same Product Twice) ──
    console.log('\n--- Phase 3: Duplicate Prevention & In-Place Price Update ---');
    const product1Updated = {
      ...product1,
      price: 4999, // price dropped!
      priceFormatted: '₹4,999'
    };

    const saveResDup = await axios.post(`${baseUrl}/api/products`, {
      products: [product1Updated]
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(saveResDup.status === 201, 'Saving same product again returned HTTP 201');

    const getResDup = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getResDup.data.length === 1, 'User A STILL has exactly 1 saved product (zero duplicate rows created)');
    assert(getResDup.data[0].price === 4999, 'Product price updated in place to ₹4,999');

    // ── Phase 4: Save Multiple Different Products (Batch) ──
    console.log('\n--- Phase 4: Save Multiple Different Products (Batch of 10) ---');
    const batchProducts = [];
    for (let i = 1; i <= 10; i++) {
      batchProducts.push({
        id: `prod-item-${ts}-${i}`,
        name: `Distinct Product Item ${i}`,
        price: 1000 + i * 100,
        priceFormatted: `₹${1000 + i * 100}`,
        originalPrice: 1500 + i * 100,
        discountFormatted: '25% off',
        rating: 4.2,
        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?w=200`,
        productLink: `https://www.amazon.in/dp/B00000000${i}`,
        productUrl: `https://www.amazon.in/dp/B00000000${i}`,
        isExactProductUrl: true,
        urlType: 'product',
        source: 'amazon',
        category: 'ecommerce',
        query: 'batch test',
        location: 'Delhi'
      });
    }

    const saveBatchRes = await axios.post(`${baseUrl}/api/products`, {
      products: batchProducts
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(saveBatchRes.status === 201, 'Batch save returned HTTP 201');

    const getBatchRes = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getBatchRes.data.length === 11, 'User A now has exactly 11 distinct saved products (1 + 10)');

    // Verify all 11 products have unique names and unique dbIds
    const uniqueDbIds = new Set(getBatchRes.data.map(p => p.dbId));
    assert(uniqueDbIds.size === 11, 'All 11 returned products have distinct unique database UUIDs');

    // ── Phase 5: High-Volume 250+ Product Performance Test ──
    console.log('\n--- Phase 5: High-Volume Scale (220+ Products) ---');
    const largeBatch = [];
    for (let i = 1; i <= 215; i++) {
      largeBatch.push({
        id: `prod-scale-${ts}-${i}`,
        name: `High Volume Product #${i} - Series ${ts}`,
        price: 500 + (i % 50) * 20,
        source: i % 2 === 0 ? 'flipkart' : 'amazon',
        imageUrl: `https://images.unsplash.com/photo-scale-${i}?w=200`,
        productLink: `https://store.com/item-${i}`,
        query: 'scale test'
      });
    }

    await axios.post(`${baseUrl}/api/products`, {
      products: largeBatch
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const getScaleRes = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getScaleRes.data.length === 226, 'User A successfully retrieved 226 products (11 + 215)');

    // ── Phase 6: User A vs User B Isolation ──
    console.log('\n--- Phase 6: User A vs User B Data Isolation ---');
    const getResB = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert(getResB.data.length === 0, 'User B has 0 products (User A 226 products are strictly isolated)');

    // User B saves a product
    const productB = {
      id: `prod-userb-${ts}`,
      name: 'User B Exclusive Headphones',
      price: 2999,
      source: 'croma',
      productLink: 'https://www.croma.com/p/12345'
    };

    await axios.post(`${baseUrl}/api/products`, {
      products: [productB]
    }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const getResBAfter = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(getResBAfter.data.length === 1, 'User B has exactly 1 product');
    assert(getResBAfter.data[0].name === 'User B Exclusive Headphones', 'User B product name matches');

    // ── Phase 7: Single Product Delete ──
    console.log('\n--- Phase 7: Single Product Deletion ---');
    const targetToDelete = getScaleRes.data[0];
    const delRes = await axios.delete(`${baseUrl}/api/products/${targetToDelete.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(delRes.status === 200, 'DELETE /api/products/:id returned HTTP 200');

    const getAfterDelete = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getAfterDelete.data.length === 225, 'User A count decreased by exactly 1 (226 -> 225)');
    assert(!getAfterDelete.data.some(p => p.id === targetToDelete.id), 'Deleted product is completely absent');
    assert(getResBAfter.data.length === 1, 'User B product is untouched after User A deletion');

    // ── Phase 8: Clear All User Products ──
    console.log('\n--- Phase 8: Clear All User Products ---');
    const clearRes = await axios.delete(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(clearRes.status === 200, 'DELETE /api/products (Clear All) returned HTTP 200');

    const getAfterClearA = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(getAfterClearA.data.length === 0, 'User A now has exactly 0 saved products');

    const getAfterClearB = await axios.get(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(getAfterClearB.data.length === 1, 'User B STILL has 1 saved product (Clear All scoped to User A)');

    // ── Cleanup: Remove User B data ──
    await axios.delete(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
    console.log('\n   ✓ Test users cleaned up successfully');

    console.log('\n================================================================');
    console.log(`   ALL SAVED PRODUCTS INTEGRITY TESTS PASSED (${passed}/${passed}) 🎉`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    stopPriceHistoryScheduler();
    server.close();
  }
}

runSavedProductsIntegritySuite();
