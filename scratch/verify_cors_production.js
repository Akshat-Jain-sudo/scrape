import app from '../server/app.js';
import axios from 'axios';

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

// Configure env variables for production test
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://myfrontend.com';

async function verifyCors() {
  console.log('🧪 Starting Production CORS Verification on Port 5001...');
  
  // Start temporary server
  const server = app.listen(PORT, async () => {
    console.log(`   ✅ Test Server listening on ${BASE_URL}`);
    
    try {
      // 1. Test authorized production frontend origin
      console.log('\n1. Testing authorized production frontend origin...');
      const resFrontend = await axios.options(`${BASE_URL}/api/products`, {
        headers: {
          Origin: 'https://myfrontend.com',
          'Access-Control-Request-Method': 'GET'
        }
      });
      console.log('   Access-Control-Allow-Origin:', resFrontend.headers['access-control-allow-origin']);
      if (resFrontend.headers['access-control-allow-origin'] === 'https://myfrontend.com') {
        console.log('   ✅ Production frontend origin successfully allowed.');
      } else {
        console.error('   ❌ Production frontend origin rejected!');
      }

      // 2. Test Chrome Extension origin (should be allowed in production)
      console.log('\n2. Testing Chrome Extension origin...');
      const resExtension = await axios.options(`${BASE_URL}/api/products`, {
        headers: {
          Origin: 'chrome-extension://hgmlolellgdnjaiphmhkfiejbqcjfhop',
          'Access-Control-Request-Method': 'GET'
        }
      });
      console.log('   Access-Control-Allow-Origin:', resExtension.headers['access-control-allow-origin']);
      if (resExtension.headers['access-control-allow-origin'] === 'chrome-extension://hgmlolellgdnjaiphmhkfiejbqcjfhop') {
        console.log('   ✅ Chrome Extension origin successfully allowed.');
      } else {
        console.error('   ❌ Chrome Extension origin rejected!');
      }

      // 3. Test unauthorized origin
      console.log('\n3. Testing unauthorized origin...');
      try {
        const resMalicious = await axios.options(`${BASE_URL}/api/products`, {
          headers: {
            Origin: 'http://malicious.com',
            'Access-Control-Request-Method': 'GET'
          }
        });
        const allowedOrigin = resMalicious.headers['access-control-allow-origin'];
        console.log('   Access-Control-Allow-Origin:', allowedOrigin);
        if (allowedOrigin === 'http://malicious.com' || allowedOrigin === '*') {
          console.error('   ❌ Security Risk: Malicious origin allowed!');
        } else {
          console.log('   ✅ Malicious origin successfully rejected (origin not returned).');
        }
      } catch (e) {
        // Some CORS middlewares return error or omit header. Node cors middleware returns 204/200 but omits the allow-origin header
        if (!e.response || !e.response.headers['access-control-allow-origin']) {
          console.log('   ✅ Malicious origin successfully rejected (request failed or header omitted).');
        } else {
          console.error('   ❌ Malicious origin allowed or error occurred:', e.message);
        }
      }

    } catch (err) {
      console.error('   ❌ Error running CORS tests:', err.message);
    } finally {
      // Close server and exit
      server.close(() => {
        console.log('\n🏁 Production CORS verification server closed.');
        process.exit(0);
      });
    }
  });
}

verifyCors();
