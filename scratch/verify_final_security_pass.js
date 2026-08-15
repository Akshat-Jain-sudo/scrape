import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Security Verification Pass: Anonymous Isolation & Order Relay Guard...\n');

  let tokenA, tokenB;
  let userA, userB;
  const emailA = `verify_user_a_${Date.now()}@example.com`;
  const emailB = `verify_user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  const anonSessionIdA = 'anon-a1b2c3d4-5555-4444-3333-222222222222';
  const anonSessionIdB = 'anon-b9876543-1111-2222-3333-444444444444';

  // 1. VERIFY REGISTRATION & LOGIN
  try {
    console.log('1. Registration and login check...');
    const resA = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailA,
      password,
      fullName: 'Auth User A'
    });
    tokenA = resA.data.token;
    userA = resA.data.user;
    console.log(`   ✅ Registered User A: ${userA.email}`);

    const resB = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: emailB,
      password,
      fullName: 'Auth User B'
    });
    tokenB = resB.data.token;
    userB = resB.data.user;
    console.log(`   ✅ Registered User B: ${userB.email}`);
  } catch (err) {
    console.error('   ❌ Auth initialization failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 2. VERIFY ORDER RELAY SECURITY (BLOCK ANONYMOUS)
  console.log('\n2. Verifying Order Relay security guards...');
  const orderEndpoints = [
    { method: 'post', url: `${BASE_URL}/api/order/credentials`, data: { platform: 'amazon', username: 'test', password: 'pwd' } },
    { method: 'get', url: `${BASE_URL}/api/order/credentials` },
    { method: 'delete', url: `${BASE_URL}/api/order/credentials/amazon` },
    { method: 'post', url: `${BASE_URL}/api/order/initiate`, data: { store: 'amazon', productUrl: 'http://test' } },
    { method: 'get', url: `${BASE_URL}/api/order/screenshot/sess-123` },
    { method: 'post', url: `${BASE_URL}/api/order/confirm/sess-123` },
    { method: 'get', url: `${BASE_URL}/api/order/sessions` }
  ];

  for (const ep of orderEndpoints) {
    // Test with no token
    try {
      await axios({ method: ep.method, url: ep.url, data: ep.data });
      console.error(`   ❌ Security Failure: ${ep.method.toUpperCase()} ${ep.url} allowed unauthenticated access!`);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        console.log(`   ✅ Guarded: ${ep.method.toUpperCase()} ${ep.url.replace(BASE_URL, '')} returned 401 for anonymous`);
      } else {
        console.error(`   ❌ Failed with unexpected status: ${e.response?.status || e.message}`);
      }
    }

    // Test with X-Anonymous-Session header
    try {
      await axios({
        method: ep.method,
        url: ep.url,
        data: ep.data,
        headers: { 'X-Anonymous-Session': anonSessionIdA }
      });
      console.error(`   ❌ Security Failure: ${ep.method.toUpperCase()} ${ep.url} allowed X-Anonymous-Session access!`);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        console.log(`   ✅ Guarded: ${ep.method.toUpperCase()} ${ep.url.replace(BASE_URL, '')} returned 401 for anonymous session header`);
      } else {
        console.error(`   ❌ Failed with unexpected status: ${e.response?.status || e.message}`);
      }
    }
  }

  // 3. VERIFY ORDER RELAY CROSS-USER DATA ISOLATION
  console.log('\n3. Verifying Order Relay cross-user data isolation...');
  try {
    // Save credentials as User A
    await axios.post(`${BASE_URL}/api/order/credentials`, {
      platform: 'flipkart',
      username: 'user_a_fk',
      password: 'secretpassworda'
    }, { headers: { Authorization: `Bearer ${tokenA}` } });
    console.log('   ✅ User A successfully saved credentials for flipkart');

    // Attempt to read credentials as User B
    const resCredsB = await axios.get(`${BASE_URL}/api/order/credentials`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const containsAcreds = resCredsB.data.some(c => c.username === 'user_a_fk');
    if (!containsAcreds) {
      console.log("   ✅ User B cannot read User A's credentials (Data Isolated)");
    } else {
      console.error("   ❌ Data Leak: User B can read User A's credentials!");
    }
  } catch (err) {
    console.error('   ❌ Order Relay isolation test failed:', err.response?.data || err.message);
  }

  // 4. VERIFY FEEDBACK ISOLATION
  console.log('\n4. Verifying Feedback data isolation...');
  try {
    const feedbackMsgA = `Feedback User A - ${Date.now()}`;
    const feedbackMsgB = `Feedback User B - ${Date.now()}`;

    // User A submits feedback
    await axios.post(`${BASE_URL}/api/feedback`, { message: feedbackMsgA, rating: 5, page: 'dashboard' }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('   ✅ User A submitted feedback');

    // User B submits feedback
    await axios.post(`${BASE_URL}/api/feedback`, { message: feedbackMsgB, rating: 4, page: 'cart' }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log('   ✅ User B submitted feedback');

    // User A retrieves feedback
    const resFeedbackA = await axios.get(`${BASE_URL}/api/feedback`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const hasMsgA = resFeedbackA.data.some(f => f.message === feedbackMsgA);
    const hasMsgBforA = resFeedbackA.data.some(f => f.message === feedbackMsgB);
    
    if (hasMsgA && !hasMsgBforA) {
      console.log('   ✅ User A successfully retrieves only User A feedback');
    } else if (hasMsgBforA) {
      console.error("   ❌ Data Leak: User A retrieves User B's feedback!");
    } else {
      console.error('   ❌ User A could not find their own feedback.');
    }
  } catch (err) {
    console.error('   ❌ Feedback isolation test failed:', err.response?.data || err.message);
  }

  // 5. VERIFY ANONYMOUS SESSION DATA ISOLATION
  console.log('\n5. Verifying Anonymous Session data isolation...');
  try {
    const prodIdAnonA = `prod-anon-a-${Date.now()}`;
    const prodIdAnonB = `prod-anon-b-${Date.now()}`;

    // Save product under Anonymous Session A
    await axios.post(`${BASE_URL}/api/products`, {
      products: [{
        id: prodIdAnonA,
        name: 'Product Anon A',
        price: 99,
        source: 'flipkart',
        productLink: 'http://anonA.com'
      }]
    }, { headers: { 'X-Anonymous-Session': anonSessionIdA } });
    console.log('   ✅ Anonymous Session A saved product');

    // Save product under Anonymous Session B
    await axios.post(`${BASE_URL}/api/products`, {
      products: [{
        id: prodIdAnonB,
        name: 'Product Anon B',
        price: 199,
        source: 'snapdeal',
        productLink: 'http://anonB.com'
      }]
    }, { headers: { 'X-Anonymous-Session': anonSessionIdB } });
    console.log('   ✅ Anonymous Session B saved product');

    // Retrieve products as Anonymous Session A
    const resProductsAnonA = await axios.get(`${BASE_URL}/api/products`, {
      headers: { 'X-Anonymous-Session': anonSessionIdA }
    });
    const hasA = resProductsAnonA.data.some(p => p.id === prodIdAnonA);
    const hasBforA = resProductsAnonA.data.some(p => p.id === prodIdAnonB);

    if (hasA && !hasBforA) {
      console.log('   ✅ Anonymous Session A retrieves only its own products');
    } else if (hasBforA) {
      console.error('   ❌ Data Leak: Anonymous Session A can retrieve Anonymous Session B products!');
    } else {
      console.error('   ❌ Anonymous Session A could not find its saved product.');
    }

    // Retrieve products as Authenticated User A (should be isolated from anon products)
    const resProductsUserA = await axios.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const hasAnonAforUserA = resProductsUserA.data.some(p => p.id === prodIdAnonA);
    if (!hasAnonAforUserA) {
      console.log('   ✅ Authenticated User A cannot see Anonymous Session A products (Data Isolated)');
    } else {
      console.error('   ❌ Data Leak: Authenticated User A can see Anonymous products!');
    }
  } catch (err) {
    console.error('   ❌ Anonymous Session isolation test failed:', err.response?.data || err.message);
  }

  // 6. CHAT HISTORY ISOLATION FOR ANONYMOUS SESSIONS
  console.log('\n6. Verifying Chat History isolation for anonymous sessions...');
  try {
    const sessionIdAnonA = `chat-session-anon-a-${Date.now()}`;

    // Anonymous Session A chats
    await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Hello, this is anonymous visitor A chat message',
      sessionId: sessionIdAnonA
    }, { headers: { 'X-Anonymous-Session': anonSessionIdA } });
    console.log('   ✅ Anonymous Session A posted message to chat');

    // Retrieve history as Anonymous Session A
    const historyResA = await axios.get(`${BASE_URL}/api/chat/history/${sessionIdAnonA}`, {
      headers: { 'X-Anonymous-Session': anonSessionIdA }
    });
    const hasChatA = historyResA.data.length > 0;

    // Retrieve history as Anonymous Session B
    const historyResB = await axios.get(`${BASE_URL}/api/chat/history/${sessionIdAnonA}`, {
      headers: { 'X-Anonymous-Session': anonSessionIdB }
    });
    const hasChatBforA = historyResB.data.length > 0;

    if (hasChatA && !hasChatBforA) {
      console.log('   ✅ Chat history successfully isolated between Anonymous A and Anonymous B');
    } else {
      console.error("   ❌ Data Leak: Anonymous Session B retrieved Anonymous Session A's chat history!");
    }
  } catch (err) {
    console.error('   ❌ Chat history isolation test failed:', err.response?.data || err.message);
  }

  console.log('\n🏁 Verification Pass Finished!');
}

runTests();
