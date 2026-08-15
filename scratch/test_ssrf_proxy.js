import app from '../server/app.js';
import axios from 'axios';
import http from 'http';

// We run the server on a temporary port
const TEST_PORT = 5099;
let serverInstance;

// Setup custom mock redirect routes on the app before running tests
app.get('/test-redirect-to-localhost', (req, res) => {
  res.writeHead(302, { 'Location': `http://localhost:${TEST_PORT}/api/trending` });
  res.end();
});

app.get('/test-redirect-to-private', (req, res) => {
  res.writeHead(302, { 'Location': 'http://192.168.1.1/image.jpg' });
  res.end();
});

app.get('/test-oversized-response', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'image/png' });
  // Send 6 MB of zeroes
  const buffer = Buffer.alloc(1024 * 1024); // 1 MB chunk
  for (let i = 0; i < 6; i++) {
    res.write(buffer);
  }
  res.end();
});

async function startServer() {
  return new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`📡 Temporary test server running on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });
}

function stopServer() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('🏁 Temporary test server shut down.');
    });
  }
}

async function runTests() {
  await startServer();

  const testCases = [
    {
      name: 'PASS: Legitimate product image from Flipkart',
      url: 'https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/o/l/2/-original-imahgfmzvanpgncf.jpeg?q=70',
      expectedStatus: 200,
      expectedContentType: 'image/'
    },
    {
      name: 'FAIL: localhost',
      url: `http://localhost:${TEST_PORT}/api/trending`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: 127.0.0.1',
      url: `http://127.0.0.1:${TEST_PORT}/api/trending`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: ::1',
      url: `http://[::1]:${TEST_PORT}/api/trending`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: 0.0.0.0',
      url: `http://0.0.0.0:${TEST_PORT}/api/trending`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: private IPv4 (10.x)',
      url: 'http://10.0.0.1/image.jpg',
      expectedStatus: 400
    },
    {
      name: 'FAIL: private IPv4 (192.168.x)',
      url: 'http://192.168.1.1/image.jpg',
      expectedStatus: 400
    },
    {
      name: 'FAIL: link-local / cloud metadata',
      url: 'http://169.254.169.254/latest/meta-data/',
      expectedStatus: 400
    },
    {
      name: 'FAIL: file:// protocol',
      url: 'file:///etc/passwd',
      expectedStatus: 400
    },
    {
      name: 'FAIL: data:// protocol',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANS=',
      expectedStatus: 400
    },
    {
      name: 'FAIL: javascript:// protocol',
      url: 'javascript:alert(1)',
      expectedStatus: 400
    },
    {
      name: 'FAIL: malformed URL',
      url: 'http://not-a-valid-url-at-all',
      expectedStatus: 400
    },
    {
      name: 'FAIL: redirect to localhost',
      url: `http://localhost:${TEST_PORT}/test-redirect-to-localhost`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: redirect to private IP',
      url: `http://localhost:${TEST_PORT}/test-redirect-to-private`,
      expectedStatus: 400
    },
    {
      name: 'FAIL: non-image response',
      url: 'https://snapdeal.com',
      expectedStatus: 400
    },
    {
      name: 'FAIL: oversized response (> 5MB)',
      url: `http://localhost:${TEST_PORT}/test-oversized-response`,
      expectedStatus: 400
    }
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Running SSRF Proxy Protection Test Suite...');

  for (const tc of testCases) {
    try {
      const response = await axios.get(
        `http://localhost:${TEST_PORT}/api/proxy-image?url=${encodeURIComponent(tc.url)}`,
        { validateStatus: () => true }
      );

      const statusMatches = response.status === tc.expectedStatus;
      let contentTypeMatches = true;

      if (tc.expectedContentType) {
        contentTypeMatches = response.headers['content-type']?.toLowerCase().startsWith(tc.expectedContentType);
      }

      if (statusMatches && contentTypeMatches) {
        console.log(`   ✅ ${tc.name} -> Passed (Status: ${response.status})`);
        passed++;
      } else {
        console.log(`   ❌ ${tc.name} -> FAILED (Status: ${response.status}, Expected: ${tc.expectedStatus}, Content-Type: ${response.headers['content-type']})`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ ${tc.name} -> Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  stopServer();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  stopServer();
  process.exit(1);
});
