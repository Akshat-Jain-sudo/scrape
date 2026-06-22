import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Download, 
  Bookmark,
  Package,
  Star,
  ExternalLink,
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  FileJson
} from 'lucide-react';

const STORE_NAMES = {
  amazon: 'Amazon India',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  snapdeal: 'Snapdeal',
  jiomart: 'JioMart',
  tatacliq: 'Tata CLiQ',
  shopclues: 'ShopClues',
  indiamart: 'IndiaMART',
  myntra: 'Myntra',
  ajio: 'AJIO',
  nykaa: 'Nykaa',
  nykaafashion: 'Nykaa Fashion',
  firstcry: 'FirstCry',
  pepperfry: 'Pepperfry',
  bookswagon: 'Bookswagon',
  ebay: 'eBay',
  etsy: 'Etsy',
  alibaba: 'Alibaba',
  aliexpress: 'AliExpress',
  walmart: 'Walmart',
  croma: 'Croma',
  reliance: 'Reliance Digital',
  samsung: 'Samsung Store',
  vijaysales: 'Vijay Sales',
  hp: 'HP World',
  oneplus: 'OnePlus Store',
  lenovo: 'Lenovo Store',
  lg: 'LG Brand Store',
  dailyobjects: 'Daily Objects',
  headphones: 'Headphone Zone',
  apple: 'Apple Store',
  puma: 'Puma',
  lenskart: 'Lenskart',
  zara: 'Zara',
  tanishq: 'Tanishq',
  pantaloons: 'Pantaloons',
  adidas: 'Adidas Store',
  maxfashion: 'Max Fashion',
  bewakoof: 'Bewakoof',
  chumbak: 'Chumbak',
  joyalukkas: 'Joyalukkas',
  snitch: 'Snitch',
  cultstore: 'Cultsport',
  vishalmegamart: 'Vishal Mega Mart',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Swiggy Instamart',
  bbnow: 'BigBasket Now',
  fkminutes: 'Flipkart Minutes',
  amazonfresh: 'Amazon Fresh',
  jiomartexpress: 'JioMart Express',
  bbdaily: 'BB Daily',
  dunzo: 'Dunzo',
  countrydelight: 'Country Delight',
  zomato: 'Zomato',
  swiggy: 'Swiggy'
};

function ScrapeConsole({ savedProducts, onSaveProducts, addToast, userLocation, onAddToCart }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ecommerce');
  const [source, setSource] = useState('all');
  const [pages, setPages] = useState(3);
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const consoleEndRef = useRef(null);

  // Auto-scroll console logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addLog = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setConsoleLogs(prev => [...prev, { text: `[${timestamp}] ${text}`, type }]);
  };

  const simulateScrapeLogs = async () => {
    if (!query.trim()) return;

    setConsoleLogs([]);
    setLoading(true);
    setResults(null);
    setProgress(0);

    addLog(`INIT: FlipScrape scraper cluster starting...`, 'info');
    await new Promise(r => setTimeout(r, 200));
    addLog(`CONFIG: Category=${category.toUpperCase()} | Query="${query}" | Source=${source.toUpperCase()} | Pages=${pages}`, 'accent');
    await new Promise(r => setTimeout(r, 200));

    if (category === 'food') {
      addLog(`LOCATION: Detecting current city boundaries for "${userLocation}"...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      addLog(`AGENT: Fetching menus based on localized GPS coordinates...`, 'info');
      await new Promise(r => setTimeout(r, 150));

      const activeStores = source === 'all' 
        ? ['zomato', 'swiggy'] 
        : [source];

      for (const st of activeStores) {
        const name = STORE_NAMES[st] || st.toUpperCase();
        addLog(`FETCH [${st.toUpperCase()}]: Checking local restaurants on ${name}...`, 'info');
        await new Promise(r => setTimeout(r, 150));
      }
    } else if (category === 'quickcommerce') {
      addLog(`LOCATION: Resolving delivery zone coordinates...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      addLog(`AGENT: Overriding coordinate request headers...`, 'info');
      await new Promise(r => setTimeout(r, 150));

      const activeStores = source === 'all' 
        ? ['blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes'] 
        : [source];

      for (const st of activeStores) {
        const name = STORE_NAMES[st] || st.toUpperCase();
        addLog(`FETCH [${st.toUpperCase()}]: Querying ${name} express catalog...`, 'info');
        await new Promise(r => setTimeout(r, 150));
      }
    } else {
      addLog(`AGENT: Preparing rotated request headers...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      addLog(`RATE: Delay buffer (1.2s - 2.8s) between page indexes`, 'info');
      await new Promise(r => setTimeout(r, 150));
      
      const activeStores = source === 'all'
        ? ['amazon', 'flipkart', 'snapdeal', 'myntra', 'ajio']
        : [source];

      for (const st of activeStores) {
        const name = STORE_NAMES[st] || st.toUpperCase();
        addLog(`FETCH [${st.toUpperCase()}]: Sending request signature to ${name}...`, 'info');
        await new Promise(r => setTimeout(r, 150));
      }
    }

    addLog(`FETCH: Routing search request to backend /api/scrape...`, 'info');
    setProgress(40);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), category, source, pages, location: userLocation })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping process failed');
      }

      const data = await response.json();
      setProgress(75);

      addLog(`STATUS: HTTP 200 OK — Parsing content payloads...`, 'success');
      await new Promise(r => setTimeout(r, 200));
      addLog(`EXTRACT: Parsed ${data.meta.totalExtracted} matching elements`, 'info');
      await new Promise(r => setTimeout(r, 200));
      addLog(`DEDUP: Merged store result sets to ${data.meta.uniqueProducts} unique products`, 'info');
      
      if (data.meta.wasMockFallback) {
        addLog(`WARN: Live store returned block response. Triggered graceful Mock Demo mode.`, 'warn');
      } else {
        addLog(`SUCCESS: Extracted clean production catalog items`, 'success');
      }
      
      addLog(`TIME: Process finished in ${data.meta.elapsedSeconds}s`, 'success');
      setProgress(100);
      setResults(data);
    } catch (error) {
      addLog(`ERROR: Scraping failed — ${error.message}`, 'error');
      addLog(`HINT: Try switching the target source or query name.`, 'warn');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!results || results.products.length === 0) return;
    const res = await onSaveProducts(results.products);
    if (res) {
      addLog(`DB: Saved ${res.savedCount} products to library (${res.skippedCount} skipped)`, 'success');
    }
  };

  const handleExportJSON = () => {
    if (!results) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(results, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `flipscrape_${source}_${query.replace(/\s+/g, '_')}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`EXPORT: JSON file exported`, 'success');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>Scrape Console</h1>
          <p>Scrape individual or combined catalog sets across E-Commerce, Quick Commerce, and Food Delivery platforms</p>
        </div>
      </div>

      <div className="scraper-grid">
        {/* Left Side: Controller panel */}
        <div className="scraper-input-panel">
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-box-wrapper">
              <label className="input-label">Product Search Query</label>
              <input 
                type="text" 
                placeholder="e.g. laptop, milk, sneakers..." 
                className="console-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && simulateScrapeLogs()}
              />
            </div>

            <div className="input-box-wrapper">
              <label className="input-label">Select Category</label>
              <select 
                className="console-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSource('all');
                }}
                disabled={loading}
              >
                <option value="ecommerce">E-Commerce</option>
                <option value="quickcommerce">Quick Commerce</option>
                <option value="food">Food Delivery</option>
              </select>
            </div>

            <div className="input-box-wrapper">
              <label className="input-label">Target Shopping Store</label>
              <select 
                className="console-select"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={loading}
              >
                {category === 'ecommerce' && (
                  <>
                    <option value="all">All E-Commerce (43 Stores)</option>
                    <option value="amazon">Amazon India</option>
                    <option value="flipkart">Flipkart</option>
                    <option value="meesho">Meesho</option>
                    <option value="snapdeal">Snapdeal</option>
                    <option value="jiomart">JioMart</option>
                    <option value="tatacliq">Tata CLiQ</option>
                    <option value="shopclues">ShopClues</option>
                    <option value="indiamart">IndiaMART</option>
                    <option value="myntra">Myntra</option>
                    <option value="ajio">AJIO</option>
                    <option value="nykaa">Nykaa</option>
                    <option value="nykaafashion">Nykaa Fashion</option>
                    <option value="firstcry">FirstCry</option>
                    <option value="pepperfry">Pepperfry</option>
                    <option value="bookswagon">Bookswagon</option>
                    <option value="ebay">eBay</option>
                    <option value="etsy">Etsy</option>
                    <option value="alibaba">Alibaba</option>
                    <option value="aliexpress">AliExpress</option>
                    <option value="walmart">Walmart</option>
                    <option value="croma">Croma</option>
                    <option value="reliance">Reliance Digital</option>
                    <option value="samsung">Samsung Store</option>
                    <option value="vijaysales">Vijay Sales</option>
                    <option value="hp">HP World</option>
                    <option value="oneplus">OnePlus Store</option>
                    <option value="lenovo">Lenovo Store</option>
                    <option value="lg">LG Brand Store</option>
                    <option value="dailyobjects">Daily Objects</option>
                    <option value="headphones">Headphone Zone</option>
                    <option value="apple">Apple Store</option>
                    <option value="puma">Puma</option>
                    <option value="lenskart">Lenskart</option>
                    <option value="zara">Zara</option>
                    <option value="tanishq">Tanishq</option>
                    <option value="pantaloons">Pantaloons</option>
                    <option value="adidas">Adidas Store</option>
                    <option value="maxfashion">Max Fashion</option>
                    <option value="bewakoof">Bewakoof</option>
                    <option value="chumbak">Chumbak</option>
                    <option value="joyalukkas">Joyalukkas</option>
                    <option value="snitch">Snitch</option>
                    <option value="cultstore">Cultsport</option>
                    <option value="vishalmegamart">Vishal Mega Mart</option>
                  </>
                )}
                {category === 'quickcommerce' && (
                  <>
                    <option value="all">All Quick Commerce (10 Stores)</option>
                    <option value="blinkit">Blinkit</option>
                    <option value="zepto">Zepto</option>
                    <option value="instamart">Swiggy Instamart</option>
                    <option value="bbnow">BigBasket Now</option>
                    <option value="fkminutes">Flipkart Minutes</option>
                    <option value="amazonfresh">Amazon Fresh</option>
                    <option value="jiomartexpress">JioMart Express</option>
                    <option value="bbdaily">BB Daily</option>
                    <option value="dunzo">Dunzo</option>
                    <option value="countrydelight">Country Delight</option>
                  </>
                )}
                {category === 'food' && (
                  <>
                    <option value="all">All Food Delivery (2 Stores)</option>
                    <option value="zomato">Zomato</option>
                    <option value="swiggy">Swiggy</option>
                  </>
                )}
              </select>
            </div>

            <div className="input-box-wrapper">
              <label className="input-label">Pages to Scrape</label>
              <select 
                className="console-select"
                value={pages}
                onChange={(e) => setPages(parseInt(e.target.value))}
                disabled={loading}
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'page' : 'pages'}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={simulateScrapeLogs}
              disabled={loading || !query.trim()}
              style={{ width: '100%' }}
            >
              <Terminal size={16} />
              {loading ? 'Executing Scrape...' : 'Initiate Scrape'}
            </button>

            {/* Progress */}
            {loading && (
              <div className="scrape-progress-bar">
                <div className="scrape-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>

          {/* Terminal logs */}
          <div className="console-logs">
            {consoleLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                &gt;_ Terminal idle. Setup target store and query above.
              </div>
            ) : (
              consoleLogs.map((log, i) => (
                <div key={i} className={`log-line ${log.type}`}>
                  {log.text}
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Right Side: Results Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner-container">
                <div className="pulse-spinner"></div>
                <p style={{ color: 'var(--text-secondary)' }}>Scraping target stores...</p>
              </div>
            </div>
          ) : !results ? (
            <div className="glass-card empty-state" style={{ height: '100%' }}>
              <Package />
              <h3>Scrape results will display here</h3>
              <p>Setup parameters on the left and click 'Initiate Scrape' to fetch catalog products.</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="glass-card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      Scrape Results: <span style={{ color: 'var(--accent-primary)' }}>{results.meta.query}</span>
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{results.meta.uniqueProducts} products | {results.meta.pagesScraped} pages | {results.meta.elapsedSeconds}s</span>
                      {results.meta.wasMockFallback && (
                        <span style={{ color: 'var(--warning)', fontWeight: 500 }}>(Demo mode: Flipkart blocked connection)</span>
                      )}
                    </p>
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-success" onClick={handleSaveAll} style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}>
                      <Bookmark size={14} /> Save All
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportJSON} style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}>
                      <FileJson size={14} /> JSON
                    </button>
                    <a href="/api/export/csv" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', textDecoration: 'none' }}>
                      <FileText size={14} /> CSV
                    </a>
                    <a href="/api/export/excel" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', textDecoration: 'none' }}>
                      <FileSpreadsheet size={14} /> Excel
                    </a>
                  </div>
                </div>

                {/* Product Table */}
                <div className="product-table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Store</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>Rating</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.products.map((product, idx) => (
                        <tr key={product.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <span className={`store-badge store-badge-${product.source || 'flipkart'}`}>
                              {product.source || 'flipkart'}
                            </span>
                          </td>
                          <td className="product-name-cell" title={product.name}>
                            {product.name}
                          </td>
                          <td className="price-cell">
                            <div>{product.priceFormatted}</div>
                            {product.deliveryTime && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--info)', fontWeight: 500, marginTop: '2px' }}>
                                🚚 {product.deliveryTime}
                              </div>
                            )}
                            {product.distance && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                📍 {product.distance}
                              </div>
                            )}
                            {(product.deliveryFee !== null || product.packagingFee !== null) && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {product.deliveryFee !== null && `Del: ₹${product.deliveryFee}`}
                                {product.deliveryFee !== null && product.packagingFee !== null && ' | '}
                                {product.packagingFee !== null && `Pack: ₹${product.packagingFee}`}
                              </div>
                            )}
                          </td>
                          <td>
                            {product.discountFormatted ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>{product.discountFormatted}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td>
                            {product.rating ? (
                              <span className={`star-rating-badge ${product.rating >= 4 ? 'high' : product.rating >= 3 ? 'medium' : 'low'}`} style={{ fontSize: '0.72rem' }}>
                                {product.rating} ★
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {product.productLink ? (
                                <a href={product.productLink} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.3rem' }} title="View on Store">
                                  <ExternalLink size={13} />
                                </a>
                              ) : null}
                              {onAddToCart && (
                                <button 
                                  className="btn-icon" 
                                  onClick={() => onAddToCart(product.name)}
                                  style={{ padding: '0.3rem', color: 'var(--accent-blue)' }}
                                  title="Add to Cart Optimizer"
                                >
                                  <ShoppingCart size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScrapeConsole;
