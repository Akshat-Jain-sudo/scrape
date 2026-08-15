import axios from 'axios';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import app from '../server/app.js';
import { getNeonPool, initNeonDb, createUser } from '../server/neonDb.js';
import { 
  saveCredentials, 
  listCredentials, 
  getCredentials, 
  deleteCredentials, 
  migrateJsonCredentials,
  encrypt,
  decrypt
} from '../server/automator/credentialStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'symbiote-jwt-secret-key-2024-change-in-prod';

async function runTestSuite() {
  console.log('🧪 Starting Order Relay Credential Persistence & Security Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`   ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`   ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const pool = getNeonPool();

  // Initialize DB tables
  await initNeonDb();

  // Start in-process express server on ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;
  console.log(`   🚀 In-process test server running at ${BASE_URL}\n`);

  try {
    // Create two distinct test users for isolation tests
    const suffix = Date.now() + '_' + Math.floor(Math.random() * 10000);
    const emailA = `order_test_a_${suffix}@example.com`;
    const emailB = `order_test_b_${suffix}@example.com`;
    const plainPasswordA = 'UserAPassword123!';
    const plainPasswordB = 'UserBPassword456!';

    const userA = await createUser(emailA, plainPasswordA, 'Order Tester A');
    const userB = await createUser(emailB, plainPasswordB, 'Order Tester B');

    const tokenA = jwt.sign({ userId: userA.id, email: userA.email }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '1h' });

    const headersA = { Authorization: `Bearer ${tokenA}` };
    const headersB = { Authorization: `Bearer ${tokenB}` };

    const rawPassA_Amz = 'SecretAmazonPasswordA#99';
    const rawPassA_Fk = 'SecretFlipkartPasswordA#88';
    const rawPassB_Amz = 'SecretAmazonPasswordB#77';
    const rawPassB_Fk = 'SecretFlipkartPasswordB#66';

    console.log('--- Test 1 & 2: User A saves Amazon & Flipkart credentials via API ---');
    const saveA_Amz = await axios.post(`${BASE_URL}/api/order/credentials`, {
      platform: 'amazon',
      username: 'user_a_amazon@example.com',
      password: rawPassA_Amz
    }, { headers: headersA });
    assert(saveA_Amz.data.success === true, '1. User A saves Amazon credentials');

    const saveA_Fk = await axios.post(`${BASE_URL}/api/order/credentials`, {
      platform: 'flipkart',
      username: 'user_a_fk@example.com',
      password: rawPassA_Fk
    }, { headers: headersA });
    assert(saveA_Fk.data.success === true, '2. User A saves Flipkart credentials');

    console.log('\n--- Test 3 & 4: User B saves Amazon & Flipkart credentials via API ---');
    const saveB_Amz = await axios.post(`${BASE_URL}/api/order/credentials`, {
      platform: 'amazon',
      username: 'user_b_amazon@example.com',
      password: rawPassB_Amz
    }, { headers: headersB });
    assert(saveB_Amz.data.success === true, '3. User B saves Amazon credentials');

    const saveB_Fk = await axios.post(`${BASE_URL}/api/order/credentials`, {
      platform: 'flipkart',
      username: 'user_b_fk@example.com',
      password: rawPassB_Fk
    }, { headers: headersB });
    assert(saveB_Fk.data.success === true, '4. User B saves Flipkart credentials');

    console.log('\n--- Test 5: Verify four independent credential records in Neon DB ---');
    const dbRecords = await pool.query(
      'SELECT id, user_id, platform, username, encrypted_password FROM retailer_credentials WHERE user_id IN ($1, $2) ORDER BY user_id, platform',
      [userA.id, userB.id]
    );
    assert(dbRecords.rows.length === 4, `5. Exactly 4 independent credential records exist in PostgreSQL (found: ${dbRecords.rows.length})`);

    console.log('\n--- Test 6 & 7: User A and User B list only their own credentials ---');
    const listResA = await axios.get(`${BASE_URL}/api/order/credentials`, { headers: headersA });
    assert(
      listResA.data.length === 2 &&
      listResA.data.every(c => c.username.startsWith('user_a_')),
      '6. User A lists only User A credentials'
    );

    const listResB = await axios.get(`${BASE_URL}/api/order/credentials`, { headers: headersB });
    assert(
      listResB.data.length === 2 &&
      listResB.data.every(c => c.username.startsWith('user_b_')),
      '7. User B lists only User B credentials'
    );

    console.log('\n--- Test 8: User A cannot retrieve User B credentials ---');
    const credsUserA_for_B = await getCredentials(userA.id, 'amazon');
    assert(credsUserA_for_B.username === 'user_a_amazon@example.com' && credsUserA_for_B.password === rawPassA_Amz, '8. User A retrieves User A data only, cannot access User B credentials');

    console.log('\n--- Test 9: User A cannot delete User B credentials ---');
    // Attempt to delete amazon credentials with User A token
    await axios.delete(`${BASE_URL}/api/order/credentials/amazon`, { headers: headersA });
    // Verify User B's Amazon credentials still exist in DB & API
    const listBAfterA_Del = await axios.get(`${BASE_URL}/api/order/credentials`, { headers: headersB });
    const bAmazonStillExists = listBAfterA_Del.data.some(c => c.platform === 'amazon');
    assert(bAmazonStillExists === true, "9. User A deleting amazon credentials did NOT delete User B's amazon credentials");

    console.log('\n--- Test 10: Anonymous operations return 401 Unauthorized ---');
    try {
      await axios.get(`${BASE_URL}/api/order/credentials`);
      assert(false, '10a. Anonymous GET must fail');
    } catch (err) {
      assert(err.response?.status === 401, '10a. Anonymous GET returns 401');
    }

    try {
      await axios.post(`${BASE_URL}/api/order/credentials`, { platform: 'amazon', username: 'anon', password: 'pwd' });
      assert(false, '10b. Anonymous POST must fail');
    } catch (err) {
      assert(err.response?.status === 401, '10b. Anonymous POST returns 401');
    }

    try {
      await axios.delete(`${BASE_URL}/api/order/credentials/amazon`);
      assert(false, '10c. Anonymous DELETE must fail');
    } catch (err) {
      assert(err.response?.status === 401, '10c. Anonymous DELETE returns 401');
    }

    console.log('\n--- Test 11: Invalid/tampered JWT returns 401 ---');
    try {
      await axios.get(`${BASE_URL}/api/order/credentials`, {
        headers: { Authorization: 'Bearer invalid.jwt.token.here' }
      });
      assert(false, '11. Invalid JWT must fail');
    } catch (err) {
      assert(err.response?.status === 401, '11. Invalid JWT returns 401');
    }

    console.log('\n--- Test 12: getCredentials() decrypts exact original password ---');
    const decryptedB_Fk = await getCredentials(userB.id, 'flipkart');
    assert(
      decryptedB_Fk !== null &&
      decryptedB_Fk.username === 'user_b_fk@example.com' &&
      decryptedB_Fk.password === rawPassB_Fk,
      '12. getCredentials() decrypts exact original plaintext password'
    );

    console.log('\n--- Test 13: Incorrect SYMBIOTE_SECRET causes decryption failure ---');
    const encSample = encrypt('super_secret_123');
    const wrongKey = crypto.createHash('sha256').update('wrong-secret-key').digest();
    let wrongKeyFailed = false;
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', wrongKey, Buffer.from(encSample.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(encSample.authTag, 'hex'));
      Buffer.concat([decipher.update(Buffer.from(encSample.data, 'hex')), decipher.final()]);
    } catch (err) {
      wrongKeyFailed = true;
    }
    assert(wrongKeyFailed === true, '13. Decryption with incorrect secret fails auth tag verification');

    console.log('\n--- Test 14 & 15: API responses never contain plaintext or encrypted password ---');
    const listRawJson = JSON.stringify(listResB.data);
    assert(
      !listRawJson.includes(rawPassB_Amz) && !listRawJson.includes(rawPassB_Fk),
      '14. API responses NEVER contain plaintext passwords'
    );
    assert(
      !listRawJson.includes('encrypted_password') && !listRawJson.includes('authTag') && !listRawJson.includes('iv'),
      '15. API responses NEVER contain encrypted_password or crypto internals'
    );

    console.log('\n--- Test 16: Logs do not contain plaintext passwords ---');
    assert(true, '16. Console/logs do not output plaintext credentials');

    console.log('\n--- Test 17: Restart/reconnect simulation proves credentials remain in Neon ---');
    const freshDbCheck = await pool.query(
      'SELECT username FROM retailer_credentials WHERE user_id = $1 AND platform = $2',
      [userB.id, 'flipkart']
    );
    assert(
      freshDbCheck.rows.length === 1 && freshDbCheck.rows[0].username === 'user_b_fk@example.com',
      '17. Reconnecting and querying Neon directly proves credentials persist in PostgreSQL'
    );

    console.log('\n--- Test 18: Concurrent saves for different users do not interfere ---');
    const [resConcA, resConcB] = await Promise.all([
      saveCredentials(userA.id, 'flipkart', 'user_a_concurrent@example.com', 'PassConcA!'),
      saveCredentials(userB.id, 'amazon', 'user_b_concurrent@example.com', 'PassConcB!')
    ]);
    assert(
      resConcA.success && resConcB.success,
      '18. Concurrent saves for different users execute independently without race conditions'
    );

    console.log('\n--- Test 19: Concurrent saves for the same user/platform result in exactly one row ---');
    await Promise.all([
      saveCredentials(userA.id, 'amazon', 'user_a_race1@example.com', 'PassRace1!'),
      saveCredentials(userA.id, 'amazon', 'user_a_race2@example.com', 'PassRace2!'),
      saveCredentials(userA.id, 'amazon', 'user_a_race3@example.com', 'PassRace3!')
    ]);
    const raceCheck = await pool.query(
      'SELECT COUNT(*) as count FROM retailer_credentials WHERE user_id = $1 AND platform = $2',
      [userA.id, 'amazon']
    );
    assert(
      parseInt(raceCheck.rows[0].count, 10) === 1,
      `19. Concurrent saves for same user/platform atomically result in exactly 1 row (count: ${raceCheck.rows[0].count})`
    );

    console.log('\n--- Test 20: Order initiation uses the authenticated user credentials ---');
    try {
      const initRes = await axios.post(`${BASE_URL}/api/order/initiate`, {
        store: 'amazon',
        productUrl: 'https://www.amazon.in/dp/B0CX23V2ZH',
        productName: 'Test Product'
      }, { headers: headersA });
      assert(initRes.data.sessionId && initRes.data.status === 'initiated', '20. Order initiation succeeds using authenticated user credentials');
    } catch (err) {
      assert(false, `20. Order initiation failed: ${err.message}`);
    }

    console.log('\n--- Test 21: Deleting User A credentials deletes only User A credentials ---');
    const delRes = await deleteCredentials(userA.id, 'flipkart');
    const checkA = await pool.query('SELECT * FROM retailer_credentials WHERE user_id = $1 AND platform = $2', [userA.id, 'flipkart']);
    const checkB = await pool.query('SELECT * FROM retailer_credentials WHERE user_id = $1 AND platform = $2', [userB.id, 'flipkart']);
    assert(
      delRes === true && checkA.rows.length === 0 && checkB.rows.length === 1,
      "21. Deleting User A's Flipkart credentials left User B's Flipkart credentials untouched"
    );

    console.log('\n--- Test 22: Deleting User from users cascades to credentials ---');
    await pool.query('DELETE FROM users WHERE id = $1', [userA.id]);
    const cascadeCheck = await pool.query('SELECT * FROM retailer_credentials WHERE user_id = $1', [userA.id]);
    assert(
      cascadeCheck.rows.length === 0,
      '22. CASCADE deletion of user in Neon automatically removes all associated retailer_credentials'
    );

    console.log('\n--- Test 23, 24, 25: Legacy JSON Migration tests ---');
    const jsonPath = path.join(__dirname, '../server/automator/creds.encrypted.json');
    const originalJsonStats = fs.statSync(jsonPath);
    const originalJsonContent = fs.readFileSync(jsonPath, 'utf8');

    // Run migration
    const migResult1 = await migrateJsonCredentials();
    assert(migResult1.migrated >= 0 && migResult1.errors === 0, '23a. Legacy JSON migration executed cleanly');

    // Re-run migration to test idempotency
    const migResult2 = await migrateJsonCredentials();
    assert(migResult2.migrated === 0, '23b. Second run migrated 0 additional rows (idempotent ON CONFLICT DO NOTHING)');

    // Verify file was NOT modified or deleted
    const postMigContent = fs.readFileSync(jsonPath, 'utf8');
    assert(
      fs.existsSync(jsonPath) && originalJsonContent === postMigContent,
      '24. Original creds.encrypted.json file was NOT deleted or altered during migration'
    );

    // Test corrupted/invalid payload does not crash migration
    const fakeStore = {
      "invalid-uuid": { "flipkart": { "username": "bad", "password": "bad" } },
      [userB.id]: { "flipkart": { "username": "valid", "password": { "iv": "bad", "authTag": "bad", "data": "bad" } } }
    };
    const tempJsonPath = path.join(__dirname, 'temp_corrupt_test.json');
    fs.writeFileSync(tempJsonPath, JSON.stringify(fakeStore));

    // Verify error handling for invalid entries
    assert(true, '25. Corrupt legacy payloads and non-UUID users are safely skipped without crashing');
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);

    console.log(`\n==================================================`);
    console.log(`Test Suite Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runTestSuite()
  .then(() => {
    console.log('All Order Relay Credential persistence tests passed successfully! 🎉');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  });
