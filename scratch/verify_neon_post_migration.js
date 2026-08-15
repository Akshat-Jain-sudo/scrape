import axios from 'axios';
import { getNeonPool } from '../server/neonDb.js';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Neon PostgreSQL Post-Migration Validation Test Suite...\n');

  let tokenA, tokenB;
  let userA, userB;
  const emailA = `neon_verify_user_a_${Date.now()}@example.com`;
  const emailB = `neon_verify_user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  const anonSessionIdA = 'anon-a9999999-5555-4444-3333-222222222222';
  const anonSessionIdB = 'anon-b8888888-1111-2222-3333-444444444444';

  const pg = getNeonPool();

  // 1. AUTHENTICATION & USER REGISTRATION
  console.log('1. Testing User Registration and Login...');
  try {
    const resA = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailA,
      password,
      fullName: 'Neon User A'
    });
    tokenA = resA.data.token;
    userA = resA.data.user;
    console.log(`   ✅ User A registered: ${userA.email}`);

    const resB = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailB,
      password,
      fullName: 'Neon User B'
    });
    tokenB = resB.data.token;
    userB = resB.data.user;
    console.log(`   ✅ User B registered: ${userB.email}`);
  } catch (err) {
    console.error('   ❌ Auth test failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 2. SAVED PRODUCTS & DUPLICATE PRODUCTS ISOLATION
  console.log('\n2. Testing Saved Products and Duplicate Collision Isolation...');
  const prodId = 'prod-dup-test-123';
  try {
    // User A saves product
    await axios.post(`${BASE_URL}/api/products`, {
      products: [{
        id: prodId,
        name: 'Collision Product Name',
        price: 499,
        source: 'flipkart',
        productLink: 'http://collision.com'
      }]
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    console.log('   ✅ User A saved product ABC123');

    // User B saves same product
    await axios.post(`${BASE_URL}/api/products`, {
      products: [{
        id: prodId,
        name: 'Collision Product Name',
        price: 499,
        source: 'flipkart',
        productLink: 'http://collision.com'
      }]
    }, { headers: { Authorization: `Bearer ${tokenB}` } });
    console.log('   ✅ User B saved same product ABC123');

    // Verify both records exist separately in PG
    const countRes = await pg.query('SELECT COUNT(*) as count FROM products WHERE id = $1', [prodId]);
    const count = parseInt(countRes.rows[0].count);
    if (count === 2) {
      console.log(`   ✅ Both separate product records exist in Neon (Count: ${count})`);
    } else {
      console.error(`   ❌ Collision Error: Expected 2 rows in products, found ${count}!`);
    }

    // User A retrieves product
    const resAProds = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const userAhasIt = resAProds.data.some(p => p.id === prodId);
    
    // User B retrieves product
    const resBProds = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const userBhasIt = resBProds.data.some(p => p.id === prodId);

    if (userAhasIt && userBhasIt) {
      console.log('   ✅ Both users can retrieve their own collision product row');
    } else {
      console.error('   ❌ Collision products are not correctly visible to owners!');
    }

    // User A deletes product
    await axios.delete(`${BASE_URL}/api/products/${prodId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log("   ✅ User A deleted their product row");

    // Verify User A cannot see it, but User B STILL CAN
    const resAProdsPostDel = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const userAhasItPostDel = resAProdsPostDel.data.some(p => p.id === prodId);

    const resBProdsPostDel = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const userBhasItPostDel = resBProdsPostDel.data.some(p => p.id === prodId);

    if (!userAhasItPostDel && userBhasItPostDel) {
      console.log("   ✅ User A's row was deleted, but User B's row remains intact (Data Isolated)");
    } else {
      console.error("   ❌ Delete leak: Deleting User A's row affected User B's row!");
    }
  } catch (err) {
    console.error('   ❌ Products collision test failed:', err.response?.data || err.message);
  }

  // 3. ANONYMOUS SESSION PRODUCTS ISOLATION
  console.log('\n3. Testing Anonymous Session Product Isolation...');
  const anonProdId = 'prod-anon-isolation-456';
  try {
    // Anon Session A saves product
    await axios.post(`${BASE_URL}/api/products`, {
      products: [{
        id: anonProdId,
        name: 'Anon Product',
        price: 999,
        source: 'snapdeal',
        productLink: 'http://anon-iso.com'
      }]
    }, { headers: { 'X-Anonymous-Session': anonSessionIdA } });
    console.log('   ✅ Anon Session A saved product');

    // Anon Session B retrieves products (should be empty for this product ID)
    const resBAnon = await axios.get(`${BASE_URL}/api/products`, {
      headers: { 'X-Anonymous-Session': anonSessionIdB }
    });
    const anonBhasIt = resBAnon.data.some(p => p.id === anonProdId);

    // Anon Session A retrieves products (should have it)
    const resAAnon = await axios.get(`${BASE_URL}/api/products`, {
      headers: { 'X-Anonymous-Session': anonSessionIdA }
    });
    const anonAhasIt = resAAnon.data.some(p => p.id === anonProdId);

    if (anonAhasIt && !anonBhasIt) {
      console.log('   ✅ Anonymous Session A products are completely isolated from Session B');
    } else {
      console.error('   ❌ Data Leak: Anonymous Session B retrieved Anonymous Session A products!');
    }
  } catch (err) {
    console.error('   ❌ Anonymous isolation test failed:', err.response?.data || err.message);
  }

  // 4. PRICE HISTORY BEHAVIOR
  console.log('\n4. Testing Price History initialization & retrieval...');
  try {
    // Verify 7-day simulated history populated on save
    const historyRes = await axios.get(`${BASE_URL}/api/products/${anonProdId}/history`);
    console.log(`   ✅ Price history retrieval returned ${historyRes.data.length} records`);
    if (historyRes.data.length >= 7) {
      console.log('   ✅ Pre-populated 7 days of price history verified');
    } else {
      console.error(`   ❌ History size mismatch: Expected >= 7 records, got ${historyRes.data.length}`);
    }
  } catch (err) {
    console.error('   ❌ Price history test failed:', err.response?.data || err.message);
  }

  // 5. CHAT MESSAGES ISOLATION
  console.log('\n5. Testing Chat History isolation...');
  const chatSessionId = `chat-neon-session-${Date.now()}`;
  try {
    // User A posts message
    await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Hello, User A chat message',
      sessionId: chatSessionId
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    console.log('   ✅ User A saved message to chat');

    // Retrieve chat history as User A
    const historyUserA = await axios.get(`${BASE_URL}/api/chat/history/${chatSessionId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const userAhasChat = historyUserA.data.length > 0;

    // Retrieve chat history as User B (should be empty/blocked)
    const historyUserB = await axios.get(`${BASE_URL}/api/chat/history/${chatSessionId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const userBhasChat = historyUserB.data.length > 0;

    if (userAhasChat && !userBhasChat) {
      console.log('   ✅ Chat history correctly isolated between authenticated users');
    } else {
      console.error('   ❌ Data Leak: User B retrieved User A chat messages!');
    }
  } catch (err) {
    console.error('   ❌ Chat isolation test failed:', err.response?.data || err.message);
  }

  // 6. FEEDBACK ISOLATION
  console.log('\n6. Testing Feedback isolation...');
  try {
    const feedbackMsg = `Feedback msg ${Date.now()}`;
    await axios.post(`${BASE_URL}/api/feedback`, {
      category: 'bug',
      message: feedbackMsg,
      rating: 5,
      page: 'dashboard'
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    console.log('   ✅ User A submitted feedback');

    // Retrieve feedback as User A
    const feedbackResA = await axios.get(`${BASE_URL}/api/feedback`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const userAhasFeedback = feedbackResA.data.some(f => f.message === feedbackMsg);

    // Retrieve feedback as User B
    const feedbackResB = await axios.get(`${BASE_URL}/api/feedback`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const userBhasFeedback = feedbackResB.data.some(f => f.message === feedbackMsg);

    if (userAhasFeedback && !userBhasFeedback) {
      console.log('   ✅ Feedback correctly isolated between authenticated users');
    } else {
      console.error('   ❌ Data Leak: User B retrieved User A feedback records!');
    }
  } catch (err) {
    console.error('   ❌ Feedback isolation test failed:', err.response?.data || err.message);
  }

  // 7. EXPORTS USER SCOPING
  console.log('\n7. Testing Export scoping (CSV & Excel)...');
  try {
    // CSV export for User A (User A has deleted their only product prodId, so should be 404/empty)
    try {
      await axios.get(`${BASE_URL}/api/export/csv`, { headers: { Authorization: `Bearer ${tokenA}` } });
      console.error('   ❌ Export Error: Expected 404 for User A empty products export!');
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('   ✅ CSV Export correctly returned 404 for empty user product list');
      } else {
        console.error('   ❌ CSV Export returned unexpected status:', e.response?.status || e.message);
      }
    }

    // Excel export for User B (User B has 1 saved product, so should succeed)
    const excelRes = await axios.get(`${BASE_URL}/api/export/excel`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      responseType: 'arraybuffer'
    });
    if (excelRes.status === 200 && excelRes.data.length > 0) {
      console.log('   ✅ Excel Export succeeded for User B with isolated product list');
    } else {
      console.error('   ❌ Excel Export failed for User B!');
    }
  } catch (err) {
    console.error('   ❌ Export tests failed:', err.message);
  }

  // 8. PROFILE COORDINATES
  console.log('\n8. Testing profile coordinates saving and retrieval...');
  try {
    const lat = 19.0760;
    const lng = 72.8777;
    const pincode = '400001';

    // Save profile with coordinates
    await axios.post(`${BASE_URL}/api/user/profile`, {
      pincode,
      lat,
      lng,
      memberships: { prime: true },
      bankCards: ['HDFC', 'SBI'],
      wishlistUrls: {},
      dietaryPreference: 'veg'
    }, { headers: { Authorization: `Bearer ${tokenB}` } });
    console.log('   ✅ User B saved profile coordinates');

    // Retrieve profile and verify coordinates
    const profileRes = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const profile = profileRes.data;

    if (profile.pincode === pincode && parseFloat(profile.lat) === lat && parseFloat(profile.lng) === lng) {
      console.log('   ✅ Profile coordinates successfully preserved in Neon DB');
    } else {
      console.error('   ❌ Coordinates mismatch:', { pincode: profile.pincode, lat: profile.lat, lng: profile.lng });
    }
  } catch (err) {
    console.error('   ❌ Profile coordinates test failed:', err.response?.data || err.message);
  }

  console.log('\n🏁 Post-Migration Verification Pass Finished!');
  process.exit(0);
}

runTests();
