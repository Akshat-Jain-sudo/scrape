import app from '../server/app.js';
import { getNeonPool } from '../server/neonDb.js';

const server = app.listen(5099, async () => {
  try {
    const signup = await fetch('http://localhost:5099/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'diag_' + Date.now() + '@sym.com', password: 'Password123!', fullName: 'Diag' })
    }).then(r => r.json());
    
    console.log('User ID:', signup.user.id);
    const save = await fetch('http://localhost:5099/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + signup.token },
      body: JSON.stringify({ products: [{ id: 'TEST-PROD-001', name: 'Phone A', price: 19999, category: 'mobiles', source: 'flipkart', productLink: 'https://www.flipkart.com/smoke-phone-a' }] })
    }).then(r => r.json());
    console.log('Save result:', save);
    
    const get = await fetch('http://localhost:5099/api/products', {
      headers: { Authorization: 'Bearer ' + signup.token }
    }).then(r => r.json());
    console.log('Get result:', JSON.stringify(get, null, 2));
    
    const pool = getNeonPool();
    await pool.query('DELETE FROM products WHERE user_id = $1', [signup.user.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [signup.user.id]);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    server.close();
    process.exit(0);
  }
});
