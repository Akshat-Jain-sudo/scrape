import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Sparkles, 
  MapPin, 
  TrendingDown, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  ShoppingBag
} from 'lucide-react';

const STORE_BADGE_CLASSES = {
  amazon: 'store-badge-amazon',
  flipkart: 'store-badge-flipkart',
  meesho: 'store-badge-meesho',
  snapdeal: 'store-badge-snapdeal',
  jiomart: 'store-badge-jiomart',
  tatacliq: 'store-badge-tatacliq',
  shopclues: 'store-badge-shopclues',
  indiamart: 'store-badge-indiamart',
  myntra: 'store-badge-myntra',
  ajio: 'store-badge-ajio',
  nykaa: 'store-badge-nykaa',
  nykaafashion: 'store-badge-nykaafashion',
  firstcry: 'store-badge-firstcry',
  pepperfry: 'store-badge-pepperfry',
  bookswagon: 'store-badge-bookswagon',
  ebay: 'store-badge-ebay',
  etsy: 'store-badge-etsy',
  alibaba: 'store-badge-alibaba',
  aliexpress: 'store-badge-aliexpress',
  walmart: 'store-badge-walmart',
  croma: 'store-badge-croma',
  reliance: 'store-badge-reliance',
  samsung: 'store-badge-samsung',
  vijaysales: 'store-badge-vijaysales',
  hp: 'store-badge-hp',
  oneplus: 'store-badge-oneplus',
  lenovo: 'store-badge-lenovo',
  lg: 'store-badge-lg',
  dailyobjects: 'store-badge-dailyobjects',
  headphones: 'store-badge-headphones',
  apple: 'store-badge-apple',
  puma: 'store-badge-puma',
  lenskart: 'store-badge-lenskart',
  zara: 'store-badge-zara',
  tanishq: 'store-badge-tanishq',
  pantaloons: 'store-badge-pantaloons',
  adidas: 'store-badge-adidas',
  maxfashion: 'store-badge-maxfashion',
  bewakoof: 'store-badge-bewakoof',
  chumbak: 'store-badge-chumbak',
  joyalukkas: 'store-badge-joyalukkas',
  snitch: 'store-badge-snitch',
  cultstore: 'store-badge-cultstore',
  vishalmegamart: 'store-badge-vishalmegamart',

  // General E-Commerce
  shopsy: 'store-badge-shopsy',
  paytmmall: 'store-badge-paytmmall',
  dealshare: 'store-badge-dealshare',
  citymall: 'store-badge-citymall',
  udaan: 'store-badge-udaan',
  ondc: 'store-badge-ondc',

  // Fashion & Lifestyle Marketplaces
  tatacliq_luxury: 'store-badge-tatacliq-luxury',
  nnnow: 'store-badge-nnnow',
  lifestylestores: 'store-badge-lifestylestores',
  shoppersstop: 'store-badge-shoppersstop',
  westside: 'store-badge-westside',
  zudio: 'store-badge-zudio',
  azorte: 'store-badge-azorte',
  reliancetrends: 'store-badge-reliancetrends',
  yousta: 'store-badge-yousta',
  centro: 'store-badge-centro',

  // D2C Fashion & Apparel
  souledstore: 'store-badge-souledstore',
  rarerabbit: 'store-badge-rarerabbit',
  bombayshirt: 'store-badge-bombayshirt',
  powerlook: 'store-badge-powerlook',
  beyoung: 'store-badge-beyoung',
  redwolf: 'store-badge-redwolf',
  campussutra: 'store-badge-campussutra',
  hubberholme: 'store-badge-hubberholme',
  mufti: 'store-badge-mufti',
  spykar: 'store-badge-spykar',
  killerjeans: 'store-badge-killerjeans',
  flyingmachine: 'store-badge-flyingmachine',
  roadster: 'store-badge-roadster',
  highlander: 'store-badge-highlander',
  tokyotalkies: 'store-badge-tokyotalkies',
  mastandharbour: 'store-badge-mastandharbour',
  urbanic: 'store-badge-urbanic',
  redtape: 'store-badge-redtape',

  // International Fashion Brands
  hm: 'store-badge-hm',
  uniqlo: 'store-badge-uniqlo',
  marksandspencer: 'store-badge-marksandspencer',
  levis: 'store-badge-levis',
  benetton: 'store-badge-benetton',
  tommyhilfiger: 'store-badge-tommyhilfiger',
  calvinklein: 'store-badge-calvinklein',
  uspoloassn: 'store-badge-uspoloassn',
  forever21: 'store-badge-forever21',
  jackjones: 'store-badge-jackjones',
  only: 'store-badge-only',
  veromoda: 'store-badge-veromoda',
  superdry: 'store-badge-superdry',
  gasjeans: 'store-badge-gasjeans',

  // Ethnic Wear
  fabindia: 'store-badge-fabindia',
  manyavar: 'store-badge-manyavar',
  mohey: 'store-badge-mohey',
  wforwoman: 'store-badge-wforwoman',
  aurelia: 'store-badge-aurelia',
  biba: 'store-badge-biba',
  globaldesi: 'store-badge-globaldesi',
  houseofindya: 'store-badge-houseofindya',
  libas: 'store-badge-libas',
  soch: 'store-badge-soch',
  meenabazaar: 'store-badge-meenabazaar',
  nallisilks: 'store-badge-nallisilks',
  karagiri: 'store-badge-karagiri',
  suta: 'store-badge-suta',
  kalkifashion: 'store-badge-kalkifashion',

  // Footwear
  bata: 'store-badge-bata',
  metroshoes: 'store-badge-metroshoes',
  mochishoes: 'store-badge-mochishoes',
  libertyshoes: 'store-badge-libertyshoes',
  khadims: 'store-badge-khadims',
  paragon: 'store-badge-paragon',
  campusshoes: 'store-badge-campusshoes',
  relaxo: 'store-badge-relaxo',
  woodland: 'store-badge-woodland',
  crocs: 'store-badge-crocs',
  skechers: 'store-badge-skechers',
  nike: 'store-badge-nike',
  reebok: 'store-badge-reebok',

  // Electronics & Appliances
  sony: 'store-badge-sony',
  xiaomi: 'store-badge-xiaomi',
  realme: 'store-badge-realme',
  vivo: 'store-badge-vivo',
  oppo: 'store-badge-oppo',
  motorola: 'store-badge-motorola',
  dell: 'store-badge-dell',
  asus: 'store-badge-asus',
  acer: 'store-badge-acer',
  whirlpool: 'store-badge-whirlpool',
  godrej: 'store-badge-godrej',
  haier: 'store-badge-haier',
  voltas: 'store-badge-voltas',
  bluestar: 'store-badge-bluestar',

  // Retailers & Audio
  boat: 'store-badge-boat',
  noise: 'store-badge-noise',
  boult: 'store-badge-boult',
  mivi: 'store-badge-mivi',
  fireboltt: 'store-badge-fireboltt',
  zebronics: 'store-badge-zebronics',
  portronics: 'store-badge-portronics',
  jbl: 'store-badge-jbl',
  anker: 'store-badge-anker',
  sennheiser: 'store-badge-sennheiser',
  ambrane: 'store-badge-ambrane',
  leafstudios: 'store-badge-leafstudios',

  // Jewelry
  caratlane: 'store-badge-caratlane',
  bluestone: 'store-badge-bluestone',
  giva: 'store-badge-giva',
  melorra: 'store-badge-melorra',
  miabytanishq: 'store-badge-miabytanishq',
  kalyanjewellers: 'store-badge-kalyanjewellers',
  malabargold: 'store-badge-malabargold',
  sencogold: 'store-badge-sencogold',
  pcjeweller: 'store-badge-pcjeweller',
  voylla: 'store-badge-voylla',
  orrajewellery: 'store-badge-orrajewellery',
  candere: 'store-badge-candere',
  kushals: 'store-badge-kushals',

  // Watches & Accessories
  titan: 'store-badge-titan',
  fastrack: 'store-badge-fastrack',
  sonata: 'store-badge-sonata',
  casio: 'store-badge-casio',
  fossil: 'store-badge-fossil',
  danielwellington: 'store-badge-danielwellington',
  ethoswatches: 'store-badge-ethoswatches',
  helioswatches: 'store-badge-helioswatches',
  baggit: 'store-badge-baggit',
  caprese: 'store-badge-caprese',
  lavie: 'store-badge-lavie',
  hidesign: 'store-badge-hidesign',
  damilano: 'store-badge-damilano',
  wildhorn: 'store-badge-wildhorn',

  // Eyewear
  titaneyeplus: 'store-badge-titaneyeplus',
  johnjacobs: 'store-badge-johnjacobs',
  coolwinks: 'store-badge-coolwinks',
  rayban: 'store-badge-rayban',
  sunglasshut: 'store-badge-sunglasshut',
  specsmakers: 'store-badge-specsmakers',
  lenspick: 'store-badge-lenspick',
  cleardekho: 'store-badge-cleardekho',
  vincentchase: 'store-badge-vincentchase',

  // Beauty & Personal Care
  purplle: 'store-badge-purplle',
  myglamm: 'store-badge-myglamm',
  sugarcosmetics: 'store-badge-sugarcosmetics',
  mamaearth: 'store-badge-mamaearth',
  wowskin: 'store-badge-wowskin',
  dermaco: 'store-badge-dermaco',
  plumgoodness: 'store-badge-plumgoodness',
  mcaffeine: 'store-badge-mcaffeine',
  forestessentials: 'store-badge-forestessentials',
  kamaayurveda: 'store-badge-kamaayurveda',
  biotique: 'store-badge-biotique',
  lotusherbals: 'store-badge-lotusherbals',
  himalaya: 'store-badge-himalaya',
  minimalist: 'store-badge-minimalist',
  foxtale: 'store-badge-foxtale',
  pilgrim: 'store-badge-pilgrim',
  dotandkey: 'store-badge-dotandkey',
  facescanada: 'store-badge-facescanada',

  // Home & Kitchen
  urbanladder: 'store-badge-urbanladder',
  woodenstreet: 'store-badge-woodenstreet',
  homecentre: 'store-badge-homecentre',
  ikea: 'store-badge-ikea',
  sleepwell: 'store-badge-sleepwell',
  wakefit: 'store-badge-wakefit',
  flomattress: 'store-badge-flomattress',
  thesleepcompany: 'store-badge-thesleepcompany',
  borosil: 'store-badge-borosil',
  wonderchef: 'store-badge-wonderchef',
  pigeon: 'store-badge-pigeon',
  prestige: 'store-badge-prestige',
  hawkins: 'store-badge-hawkins',

  // Kids & Sports
  hopscotch: 'store-badge-hopscotch',
  hamleys: 'store-badge-hamleys',
  decathlon: 'store-badge-decathlon',
  vectorx: 'store-badge-vectorx',
  cosco: 'store-badge-cosco',
  nivia: 'store-badge-nivia',
  yonex: 'store-badge-yonex',
  starsports: 'store-badge-starsports',

  blinkit: 'store-badge-blinkit',
  zepto: 'store-badge-zepto',
  instamart: 'store-badge-instamart',
  bbnow: 'store-badge-bbnow',
  fkminutes: 'store-badge-fkminutes',
  amazonfresh: 'store-badge-amazonfresh',
  jiomartexpress: 'store-badge-jiomartexpress',
  bbdaily: 'store-badge-bbdaily',
  dunzo: 'store-badge-dunzo',
  countrydelight: 'store-badge-countrydelight',
  zomato: 'store-badge-zomato',
  swiggy: 'store-badge-swiggy'
};

function CartOptimizer({ userLocation, addToast }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('optimize_cart_items');
    return saved ? JSON.parse(saved) : ['Milk', 'Bread', 'Eggs', 'Butter'];
  });
  const [newItem, setNewItem] = useState('');
  const [category, setCategory] = useState('quickcommerce');
  const [location, setLocation] = useState(userLocation || 'Mumbai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Sync userLocation if it changes
  useEffect(() => {
    if (userLocation) {
      setLocation(userLocation);
    }
  }, [userLocation]);

  // Persist items in localStorage
  useEffect(() => {
    localStorage.setItem('optimize_cart_items', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e) => {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      addToast('Item already in list', 'info');
      return;
    }
    setItems(prev => [...prev, trimmed]);
    setNewItem('');
  };

  const handleDeleteItem = (itemToDelete) => {
    setItems(prev => prev.filter(item => item !== itemToDelete));
  };

  const handleClearAll = () => {
    setItems([]);
    setResults(null);
    addToast('Cart list cleared', 'info');
  };

  const triggerOptimization = async () => {
    if (items.length === 0) {
      addToast('Please add at least one item to optimize', 'warning');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/cart/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          location,
          category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run cart optimization');
      }

      const data = await response.json();
      setResults(data);
      addToast(`Optimized across stores! Cheapest: ${data.cartByStore[data.cheapestStore]?.storeName || data.cheapestStore}`, 'success');
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Error optimizing cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>Cheapest Cart Optimizer</h1>
          <p>Build your grocery or food shopping list and find the absolute cheapest store overall, including delivery & packaging fees</p>
        </div>
      </div>

      <div className="cart-workspace">
        {/* Left Side: Cart Builder */}
        <div className="cart-builder-card glass-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} color="var(--accent-primary)" />
            <span>List Builder</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Select Category</span>
              <select 
                className="console-select"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setResults(null); // Reset results since stores will change
                }}
                disabled={loading}
              >
                <option value="quickcommerce">Quick Commerce (Grocery)</option>
                <option value="food">Food Delivery</option>
                <option value="ecommerce">E-Commerce (General)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Location Context</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--accent-primary)' }} />
                <select 
                  className="console-select"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem 0.6rem 2rem', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                >
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bangalore">Bangalore</option>
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="cart-item-input-row" style={{ marginTop: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Add item (e.g. Milk, Biryani)" 
              className="console-input"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', flex: 1 }}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px' }}
              disabled={loading || !newItem.trim()}
            >
              <Plus size={16} />
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} listed
            </span>
            {items.length > 0 && (
              <button 
                type="button" 
                onClick={handleClearAll} 
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                disabled={loading}
              >
                <Trash2 size={12} /> Clear List
              </button>
            )}
          </div>

          <div className="cart-items-list" style={{ minHeight: '120px' }}>
            {items.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: 'auto 0', fontStyle: 'italic' }}>
                Your list is empty. Add grocery or food items above.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={index} className="cart-item-pill">
                  <span>{item}</span>
                  <button 
                    type="button" 
                    className="cart-item-delete"
                    onClick={() => handleDeleteItem(item)}
                    disabled={loading}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button 
            type="button" 
            className="btn btn-blue"
            onClick={triggerOptimization}
            style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
            disabled={loading || items.length === 0}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing Markets...' : 'Optimize Store Cart'}
          </button>
        </div>

        {/* Right Side: Results */}
        <div className="cart-results-layout">
          {loading ? (
            <div className="glass-card" style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner-container">
                <div className="pulse-spinner"></div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Running real-time catalog queries across stores...</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Comparing individual items, calculating delivery/packaging fees, and optimizing grand totals...</p>
              </div>
            </div>
          ) : !results ? (
            <div className="glass-card empty-state" style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ShoppingCart size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
              <h3>Ready for Optimization</h3>
              <p>Add the items you want to buy, choose your category and location, and run the optimizer.</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '340px', margin: '0.25rem auto 0' }}>We will fetch matching products from all active stores in the category, add taxes & overhead fees, and highlight where you pay the least.</p>
            </div>
          ) : (
            <>
              {/* Cheapest Banner */}
              <div className="cart-cheapest-highlight stagger-in">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'var(--success-glow)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
                    <TrendingDown size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                      Recommend Store: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{results.cartByStore[results.cheapestStore]?.storeName}</span>
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Grand Total is <strong style={{ color: 'var(--text-primary)' }}>₹{results.cheapestTotal}</strong> (including ₹{(results.cartByStore[results.cheapestStore]?.deliveryFee || 0) + (results.cartByStore[results.cheapestStore]?.packagingFee || 0)} overheads)
                    </p>
                  </div>
                </div>
                {results.savings > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Savings</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>₹{results.savings}</div>
                  </div>
                )}
              </div>

              {/* Grid of Stores */}
              <div className="cart-store-grids">
                {Object.keys(results.cartByStore).map((storeKey) => {
                  const storeCart = results.cartByStore[storeKey];
                  const isCheapest = results.cheapestStore === storeKey;
                  const totalOverhead = storeCart.deliveryFee + storeCart.packagingFee;
                  
                  return (
                    <div 
                      key={storeKey} 
                      className={`cart-store-card glass-card stagger-in ${isCheapest ? 'cheapest' : ''}`}
                      style={{ padding: '1.25rem' }}
                    >
                      {isCheapest && (
                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--success)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderBottomLeftRadius: '8px', textTransform: 'uppercase' }}>
                          Cheapest Option
                        </div>
                      )}
                      
                      <div className="cart-store-header">
                        <span className={`store-badge ${STORE_BADGE_CLASSES[storeKey] || 'store-badge-flipkart'}`}>
                          {storeCart.storeName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                          <Clock size={12} /> {storeCart.deliveryTime}
                        </span>
                      </div>

                      {/* Items details table */}
                      <table className="cart-store-items-table">
                        <tbody>
                          {storeCart.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="cart-store-item-name" title={`${item.query}: ${item.name}`}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '6px' }}>{item.query} →</span>
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td className="cart-store-item-price">
                                <div>₹{item.price}</div>
                                {item.productLink && (
                                  <a 
                                    href={item.productLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ color: 'var(--accent-blue)', fontSize: '0.65rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '1px' }}
                                    title={`Buy ${item.name} directly on ${storeCart.storeName}`}
                                  >
                                    Buy item <ExternalLink size={8} />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Subtotal & Overheads breakdown */}
                      <div className="cart-store-summary-row" style={{ marginTop: '0.5rem' }}>
                        <span>Subtotal ({storeCart.items.length} items)</span>
                        <span>₹{storeCart.subtotal}</span>
                      </div>

                      {storeCart.deliveryFee > 0 && (
                        <div className="cart-store-summary-row">
                          <span>Delivery Fee</span>
                          <span>₹{storeCart.deliveryFee}</span>
                        </div>
                      )}

                      {storeCart.packagingFee > 0 && (
                        <div className="cart-store-summary-row">
                          <span>Packaging & Taxes</span>
                          <span>₹{storeCart.packagingFee}</span>
                        </div>
                      )}

                      {/* Grand Total */}
                      <div className="cart-store-total-row">
                        <span>Grand Total</span>
                        <span style={{ color: isCheapest ? 'var(--success)' : 'var(--text-primary)' }}>₹{storeCart.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartOptimizer;
