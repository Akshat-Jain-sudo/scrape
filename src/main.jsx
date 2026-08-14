import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Global fetch interceptor to handle Bearer JWT tokens and Anonymous Session IDs
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  options.headers = options.headers || {};

  const token = localStorage.getItem('symbiote_auth_token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  } else {
    let anonId = localStorage.getItem('symbiote_anonymous_session_id');
    if (!anonId) {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      array[6] = (array[6] & 0x0f) | 0x40;
      array[8] = (array[8] & 0x3f) | 0x80;
      const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      anonId = `anon-${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
      localStorage.setItem('symbiote_anonymous_session_id', anonId);
    }
    options.headers['X-Anonymous-Session'] = anonId;
  }

  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
