import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Security and Data-Isolation Integration Tests...\n');

  let tokenA, tokenB;
  let userA, userB;
  const emailA = `test_user_a_${Date.now()}@example.com`;
  const emailB = `test_user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  // 1. TEST REGISTRATION & LOGIN
  try {
    console.log('1. Testing registration and login...');
    const signupARes = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailA,
      password: password,
      fullName: 'User A'
    });
    tokenA = signupARes.data.token;
    userA = signupARes.data.user;
    console.log(`   ✅ Registered User A: ${userA.email} (${userA.id})`);

    const signupBRes = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailB,
      password: password,
      fullName: 'User B'
    });
    tokenB = signupBRes.data.token;
    userB = signupBRes.data.user;
    console.log(`   ✅ Registered User B: ${userB.email} (${userB.id})`);
  } catch (err) {
    console.error('   ❌ Registration/Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 2. TEST AUTHENTICATED API CALLS & 401 BLOCKS
  try {
    console.log('\n2. Testing valid & invalid JWTs...');
    // Valid request
    const authMeRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('   ✅ Valid JWT /api/auth/me succeeded');

    // Invalid request: bad token
    try {
      await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer invalid-token-value' }
      });
      console.error('   ❌ Invalid JWT did not return 401!');
    } catch (e) {
      if (e.response && e.response.status === 401) {
        console.log('   ✅ Invalid JWT correctly returned 401');
      } else {
        console.error('   ❌ Invalid JWT returned incorrect response:', e.message);
      }
    }

    // Invalid request: expired token (simulated by tampering with signature or payload expiration)
    const expiredToken = jwt.sign(
      { userId: userA.id, email: userA.email },
      'symbiote-jwt-secret-key-2024-change-in-prod', // local key
      { expiresIn: '-1s' }
    );
    try {
      await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      console.error('   ❌ Expired JWT did not return 401!');
    } catch (e) {
      if (e.response && e.response.status === 401) {
        console.log('   ✅ Expired JWT correctly returned 401');
      } else {
        console.error('   ❌ Expired JWT returned incorrect response:', e.message);
      }
    }
  } catch (err) {
    console.error('   ❌ JWT verification tests encountered errors:', err.message);
  }

  // 3. TEST DATA ISOLATION (SAVED PRODUCTS)
  try {
    console.log('\n3. Testing data isolation for saved products...');
    const prodIdA = `prod-test-a-${Date.now()}`;
    const productA = {
      id: prodIdA,
      name: 'Product A (Secret)',
      price: 199,
      originalPrice: 299,
      source: 'flipkart',
      productLink: 'http://testA.com'
    };

    // Save product for User A
    await axios.post(`${BASE_URL}/api/products`, { products: [productA] }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('   ✅ User A saved Product A successfully');

    // Retrieve products as User A
    const getProductsARes = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const containsA = getProductsARes.data.some(p => p.id === prodIdA);
    if (containsA) {
      console.log('   ✅ User A can see Product A');
    } else {
      console.error('   ❌ User A cannot see Product A!');
    }

    // Retrieve products as User B - User B should NOT see User A's products
    const getProductsBRes = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const containsAforB = getProductsBRes.data.some(p => p.id === prodIdA);
    if (!containsAforB) {
      console.log("   ✅ User B cannot see User A's Product A (Data Isolated)");
    } else {
      console.error("   ❌ Data Leak: User B can see User A's Product A!");
    }
  } catch (err) {
    console.error('   ❌ Saved products isolation test failed:', err.response?.data || err.message);
  }

  // 4. TEST EXCEL EXPORT DATA ISOLATION
  try {
    console.log('\n4. Testing Excel and CSV export isolation...');
    // Export Excel as User B - User B has no products saved, so it should return 404
    try {
      await axios.get(`${BASE_URL}/api/export/excel`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('   ❌ User B export excel did not return 404 (User B has no products)');
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('   ✅ User B export excel correctly returned 404 (No products for user)');
      } else {
        console.error('   ❌ User B export excel returned incorrect response:', e.message);
      }
    }

    // Export Excel as User A - User A has products, so it should succeed (status 200)
    const exportARes = await axios.get(`${BASE_URL}/api/export/excel`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      responseType: 'arraybuffer'
    });
    if (exportARes.status === 200) {
      console.log('   ✅ User A export excel succeeded (status 200)');
    } else {
      console.error('   ❌ User A export excel failed:', exportARes.status);
    }
  } catch (err) {
    console.error('   ❌ Export isolation test failed:', err.message);
  }

  // 5. TEST CHAT HISTORY ISOLATION
  try {
    console.log('\n5. Testing Chat History isolation...');
    const sessionIdA = `session-test-a-${Date.now()}`;
    const sessionIdB = `session-test-b-${Date.now()}`;

    // User A chats
    await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Hello, this is User A secret chat',
      sessionId: sessionIdA
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('   ✅ User A posted message to chat session A');

    // Retrieve session A as User A
    const historyARes = await axios.get(`${BASE_URL}/api/chat/history/${sessionIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (historyARes.data.length > 0) {
      console.log('   ✅ User A can retrieve User A chat history');
    } else {
      console.error('   ❌ User A chat history is empty!');
    }

    // Retrieve session A as User B - should return empty/no data for User B
    const historyBRes = await axios.get(`${BASE_URL}/api/chat/history/${sessionIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    if (historyBRes.data.length === 0) {
      console.log("   ✅ User B cannot read User A's session A chat history (Data Isolated)");
    } else {
      console.error("   ❌ Data Leak: User B can read User A's session A chat history!");
    }
  } catch (err) {
    console.error('   ❌ Chat history isolation test failed:', err.response?.data || err.message);
  }

  // 6. TEST CORS SIMULATION
  try {
    console.log('\n6. Testing CORS configuration...');
    const localCorsRes = await axios.options(`${BASE_URL}/api/products`, {
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });
    if (localCorsRes.headers['access-control-allow-origin'] === 'http://localhost:5173') {
      console.log('   ✅ CORS allows local development origin');
    } else {
      console.warn('   ⚠️ CORS did not return expected allow-origin for localhost:', localCorsRes.headers['access-control-allow-origin']);
    }
  } catch (err) {
    console.error('   ❌ CORS test failed:', err.message);
  }

  console.log('\n🏁 Tests Finished!');
}

runTests();
