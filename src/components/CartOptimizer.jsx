import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ShoppingBag,
  Upload,
  Mic,
  MicOff,
  Brain,
  CreditCard,
  CheckCircle2,
  Terminal as TerminalIcon,
  ChevronRight,
  AlertCircle
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
  shopsy: 'store-badge-shopsy',
  paytmmall: 'store-badge-paytmmall',
  dealshare: 'store-badge-dealshare',
  citymall: 'store-badge-citymall',
  udaan: 'store-badge-udaan',
  ondc: 'store-badge-ondc',
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
  titaneyeplus: 'store-badge-titaneyeplus',
  johnjacobs: 'store-badge-johnjacobs',
  coolwinks: 'store-badge-coolwinks',
  rayban: 'store-badge-rayban',
  sunglasshut: 'store-badge-sunglasshut',
  specsmakers: 'store-badge-specsmakers',
  lenspick: 'store-badge-lenspick',
  cleardekho: 'store-badge-cleardekho',
  vincentchase: 'store-badge-vincentchase',
  purplle: 'store-badge-purplle',
  myglamm: 'store-badge-myglamm',
  sugarcosmetics: 'store-badge-sugarcosmetics',
  mamaearth: 'store-badge-mamaearth',
  wowskin: 'store-badge-wowskin',
  warm: 'store-badge-warm',
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

// Dynamic helper to inject and load Tesseract.js script
const loadTesseract = () => {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
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

  // New Features States
  const [splitView, setSplitView] = useState(false); // toggle single store vs split
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrItems, setOcrItems] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');
  
  // Checkout simulation
  const [checkoutStage, setCheckoutStage] = useState('idle'); // idle, logs, payment, success
  const [checkoutLogs, setCheckoutLogs] = useState([]);
  const [otpCode, setOtpCode] = useState('');
  const terminalEndRef = useRef(null);

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

  // Scroll to bottom of checkout simulation log terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [checkoutLogs]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
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
    setAiRecommendation('');
    addToast('Cart list cleared', 'info');
  };

  const triggerOptimization = async () => {
    if (items.length === 0) {
      addToast('Please add at least one item to optimize', 'warning');
      return;
    }

    setLoading(true);
    setResults(null);
    setAiRecommendation('');

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
      addToast(`Optimized! Cheapest Single Store: ${data.cartByStore[data.cheapestStore]?.storeName || data.cheapestStore}`, 'success');
      
      // Fire AI Analysis
      fetchAIRecommendation(data);
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Error optimizing cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── OCR Scanner ──
  const handleOcrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);
    setOcrModalOpen(true);
    setOcrItems([]);

    try {
      const tesseract = await loadTesseract();
      const result = await tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const lines = result.data.text.split('\n');
      const parsedItems = [];
      
      lines.forEach(line => {
        let cleaned = line.trim();
        if (!cleaned || cleaned.length < 3) return;
        
        // Filter out receipt overhead lines
        if (/\b(total|subtotal|cgst|sgst|tax|vat|invoice|cash|card|change|balance|paid|price|qty|amount|date|time|store|phone|welcome|thank)\b/i.test(cleaned)) {
          return;
        }
        
        // Filter out price numbers
        if (/^[\d\s.,₹x*#:-]+$/.test(cleaned)) {
          return;
        }
        
        // Clean name
        cleaned = cleaned.replace(/[\d.,₹]+$/g, '').trim(); 
        cleaned = cleaned.replace(/^\b\d+\b/g, '').trim(); 

        if (cleaned.length > 2) {
          parsedItems.push(cleaned);
        }
      });

      const uniqueExtracted = Array.from(new Set(parsedItems));
      if (uniqueExtracted.length === 0) {
        addToast('No items could be resolved from image.', 'warning');
        setOcrModalOpen(false);
      } else {
        setOcrItems(uniqueExtracted.map(name => ({ name, selected: true })));
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to run OCR scanner', 'error');
      setOcrModalOpen(false);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleAddOcrItems = () => {
    const selected = ocrItems.filter(i => i.selected).map(i => i.name);
    if (selected.length === 0) {
      setOcrModalOpen(false);
      return;
    }
    const merged = Array.from(new Set([...items, ...selected]));
    setItems(merged);
    addToast(`Added ${selected.length} items to your shopping list!`, 'success');
    setOcrModalOpen(false);
  };

  // ── Voice Assistant ──
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      addToast('Listening... Speak your shopping list.', 'info');
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
      addToast('Voice input timed out or failed.', 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      addToast(`Transcribed: "${transcript}"`, 'info');
      
      setLoading(true);
      try {
        const response = await fetch('/api/ai/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcription: transcript })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            setItems(data.items);
            if (data.category) setCategory(data.category);
            addToast(`Loaded ${data.items.length} items from voice! Category: ${data.category}`, 'success');
          } else {
            addToast('No items recognized in your speech.', 'info');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    recognition.start();
  };

  // ── Gemini Value Analyst ──
  const fetchAIRecommendation = async (cartData) => {
    setAiLoading(true);
    setAiRecommendation('');
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData, type: 'cart' })
      });
      if (response.ok) {
        const data = await response.json();
        setAiRecommendation(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Unified Checkout Automation Agent ──
  const runCheckoutSimulation = async () => {
    setCheckoutStage('logs');
    setCheckoutLogs([]);
    
    const addLogWithDelay = (text, delayTime) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const timeStr = new Date().toLocaleTimeString([], { hour12: false });
          setCheckoutLogs(prev => [...prev, `[${timeStr}] ${text}`]);
          resolve();
        }, delayTime);
      });
    };

    await addLogWithDelay('🤖 Initializing Headless Browser Automation Agent...', 300);
    await addLogWithDelay('🖥️ Launching headless Chromium runner (Stealth Module active)...', 400);
    await addLogWithDelay('🔒 Spoofing fingerprint attributes & canvas tokens (WAF bypass)...', 400);

    const isSplit = splitView && results.splitCart && results.splitCart.savings > 0;
    const targetCart = isSplit ? results.splitCart : results.cartByStore[results.cheapestStore];
    const usedStores = isSplit ? results.splitCart.usedStores : [results.cheapestStore];

    for (const store of usedStores) {
      const name = results.cartByStore[store].storeName;
      await addLogWithDelay(`🌐 [${name}] Connecting to secure store storefront...`, 500);
      await addLogWithDelay(`👤 [${name}] Injecting customer authentication cookies & credentials...`, 500);
      await addLogWithDelay(`🛒 [${name}] Clearing active checkout basket...`, 400);
      
      const storeItems = isSplit ? results.splitCart.storeBreakdown[store].items : results.cartByStore[store].items;
      for (const item of storeItems) {
        await addLogWithDelay(`   ↳ Added item to store basket: "${item.name}" (₹${item.price})`, 300);
      }
      
      await addLogWithDelay(`🎟️ [${name}] Running promo code matching engine...`, 450);
      const discount = Math.floor(Math.random() * 60) + 15;
      await addLogWithDelay(`   ↳ Success: Applied promo coupon 'OPTIMIZE' (Discount: -₹${discount})`, 350);
      
      await addLogWithDelay(`📍 [${name}] Formulating delivery destination address to "${location}" coordinates...`, 400);
    }

    await addLogWithDelay('💳 Reconciling checkout portals and initializing payments gateway...', 500);
    await addLogWithDelay('🔒 Preparing UPI Dynamic Payment Request URLs...', 500);
    await addLogWithDelay('🔑 Waiting for user OTP payment authorization code...', 300);

    setTimeout(() => {
      setCheckoutStage('payment');
    }, 300);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      addToast('Please enter a valid 6-digit verification code', 'warning');
      return;
    }
    setCheckoutStage('success');
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
                  setResults(null);
                  setAiRecommendation('');
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

          <form onSubmit={handleAddItem} className="cart-item-input-row" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
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
              type="button" 
              className={`btn btn-secondary ${isListening ? 'listening-mic-btn' : ''}`}
              style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: isListening ? 'var(--danger)' : 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              onClick={handleVoiceSearch}
              title="Voice Search Assistant"
              disabled={loading}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px' }}
              disabled={loading || !newItem.trim()}
            >
              <Plus size={16} />
            </button>
          </form>

          {/* OCR Receipt Upload block */}
          <div className="ocr-upload-container" style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', textAlign: 'center' }}>
            <input 
              type="file" 
              accept="image/*" 
              id="receipt-file" 
              onChange={handleOcrUpload} 
              style={{ display: 'none' }}
              disabled={ocrLoading || loading}
            />
            <label htmlFor="receipt-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
              <Upload size={20} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>OCR Receipt / Screenshot Parser</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scan shopping invoices to import list items</span>
            </label>
          </div>

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
              {/* Tab Selector: Single vs Split Cart */}
              <div className="cart-views-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '10px', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <button 
                  className={`tab-btn ${!splitView ? 'active' : ''}`}
                  onClick={() => setSplitView(false)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: !splitView ? 'var(--accent-primary)' : 'transparent', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Buy from Single Store
                </button>
                <button 
                  className={`tab-btn ${splitView ? 'active' : ''}`}
                  onClick={() => setSplitView(true)}
                  disabled={!results.splitCart || results.splitCart.savings <= 0}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: splitView ? 'var(--accent-primary)' : 'transparent', color: results.splitCart && results.splitCart.savings > 0 ? '#fff' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: results.splitCart && results.splitCart.savings > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  <span>Split-Cart Optimizer</span>
                  {results.splitCart && results.splitCart.savings > 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--success)', padding: '0.1rem 0.35rem', borderRadius: '20px' }}>Save +₹{results.splitCart.savings}</span>
                  )}
                </button>
              </div>

              {/* Recommendation Banner */}
              {!splitView ? (
                /* Single Store Recommendation */
                results.cheapestStore ? (
                  <div className="cart-cheapest-highlight stagger-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ background: 'var(--success-glow)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
                        <TrendingDown size={28} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                          Recommended Store: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{results.cartByStore[results.cheapestStore]?.storeName}</span>
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Grand Total is <strong style={{ color: 'var(--text-primary)' }}>₹{results.cheapestTotal}</strong> (includes ₹{(results.cartByStore[results.cheapestStore]?.deliveryFee || 0) + (results.cartByStore[results.cheapestStore]?.packagingFee || 0)} overheads)
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {results.savings > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Savings</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>₹{results.savings}</div>
                        </div>
                      )}
                      <button 
                        className="btn btn-blue" 
                        onClick={runCheckoutSimulation}
                        style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <CreditCard size={14} /> Checkout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cart-cheapest-highlight stagger-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--danger)', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ background: 'var(--danger-glow)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={28} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                          No Single Store Fulfills Your Cart
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Some items are not sold at any single storefront in this category. Switch to <strong style={{ color: 'var(--accent-primary)' }}>Split-Cart Optimizer</strong> to buy them.
                        </p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setSplitView(true)}
                      style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}
                      disabled={!results.splitCart}
                    >
                      Use Split Cart
                    </button>
                  </div>
                )
              ) : (
                /* Split Cart Recommendation */
                <div className="cart-cheapest-highlight split-gradient-banner stagger-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.1) 100%)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
                      <Brain size={28} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        Mathematical Split-Cart Optimized!
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Buy items from multiple stores for a cheaper grand total: <strong style={{ color: 'var(--text-primary)' }}>₹{results.splitCart.grandTotal}</strong>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Net Split Savings</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>₹{results.savings + results.splitCart.savings}</div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={runCheckoutSimulation}
                      style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <CreditCard size={14} /> Checkout Both
                    </button>
                  </div>
                </div>
              )}

              {/* Gemini AI Analyst Recommendation Panel */}
              <div className="gemini-analyst-panel glass-card stagger-in" style={{ padding: '1rem', border: '1px solid rgba(245,114,36,0.15)', background: 'rgba(245,114,36,0.02)', margin: '0.75rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Brain size={18} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gemini Value Analyst</span>
                  {aiLoading && <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
                </div>
                {aiLoading ? (
                  <div className="shimmer-lines">
                    <div className="shimmer-line"></div>
                    <div className="shimmer-line" style={{ width: '80%' }}></div>
                  </div>
                ) : aiRecommendation ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: aiRecommendation }}></p>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Generating strategic shopping recommendations...</p>
                )}
              </div>

              {/* Displaying Store Grid depending on tab selection */}
              {!splitView ? (
                /* Single Store grid */
                <div className="cart-store-grids">
                  {Object.keys(results.cartByStore).map((storeKey) => {
                    const storeCart = results.cartByStore[storeKey];
                    const isCheapest = results.cheapestStore === storeKey;
                    
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
                                  {item.available !== false && item.price < 9999999 ? (
                                    <>
                                      <div>₹{item.price}</div>
                                      {item.productLink && (
                                        <a 
                                          href={item.productLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          style={{ color: 'var(--accent-blue)', fontSize: '0.65rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '1px' }}
                                          title={`Buy directly on ${storeCart.storeName}`}
                                        >
                                          Buy <ExternalLink size={8} />
                                        </a>
                                      )}
                                    </>
                                  ) : (
                                    <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600 }}>N/A</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="cart-store-summary-row" style={{ marginTop: '0.5rem' }}>
                          <span>Subtotal ({storeCart.items.length} items)</span>
                          <span>{storeCart.total === 'N/A' ? 'N/A' : `₹${storeCart.subtotal}`}</span>
                        </div>

                        {storeCart.deliveryFee > 0 && (
                          <div className="cart-store-summary-row">
                            <span>Delivery Fee</span>
                            <span>{storeCart.total === 'N/A' ? 'N/A' : `₹${storeCart.deliveryFee}`}</span>
                          </div>
                        )}

                        {storeCart.packagingFee > 0 && (
                          <div className="cart-store-summary-row">
                            <span>Packaging & Taxes</span>
                            <span>{storeCart.total === 'N/A' ? 'N/A' : `₹${storeCart.packagingFee}`}</span>
                          </div>
                        )}

                        <div className="cart-store-total-row">
                          <span>Grand Total</span>
                          <span style={{ color: isCheapest && storeCart.total !== 'N/A' ? 'var(--success)' : 'var(--text-primary)' }}>
                            {storeCart.total === 'N/A' ? 'N/A (Missing Items)' : `₹${storeCart.total}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Split-cart store cards list */
                <div className="cart-store-grids">
                  {results.splitCart.usedStores.map((storeKey) => {
                    const storeCart = results.splitCart.storeBreakdown[storeKey];
                    
                    return (
                      <div 
                        key={storeKey} 
                        className="cart-store-card glass-card cheapest stagger-in"
                        style={{ padding: '1.25rem' }}
                      >
                        <div className="cart-store-header">
                          <span className={`store-badge ${STORE_BADGE_CLASSES[storeKey] || 'store-badge-flipkart'}`}>
                            {storeCart.storeName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                            <Clock size={12} /> {storeCart.deliveryTime}
                          </span>
                        </div>

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
                                    >
                                      Buy <ExternalLink size={8} />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

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

                        <div className="cart-store-total-row">
                          <span>Store Total</span>
                          <span style={{ color: 'var(--success)' }}>₹{storeCart.total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* OCR receipt scanner review modal */}
      {ocrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ width: '450px', padding: '1.5rem', animation: 'scaleUp 0.3s' }}>
            <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} color="var(--accent-primary)" />
              <span>OCR Shopping List Scanner</span>
            </h2>

            {ocrLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="pulse-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                <h4 style={{ color: 'var(--text-primary)' }}>Parsing Receipt Image...</h4>
                <div className="ocr-progress-container" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem' }}>
                  <div className="ocr-progress-bar" style={{ width: `${ocrProgress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Analyzing characters: {ocrProgress}% complete</span>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Review the extracted items. Check the ones you want to import into your shopping cart list.</p>
                
                <div className="ocr-items-checklist" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(0,0,0,0.2)' }}>
                  {ocrItems.map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={item.selected} 
                        onChange={() => setOcrItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setOcrModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }} onClick={handleAddOcrItems}>Import Selected</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout simulation overlay modal */}
      {checkoutStage !== 'idle' && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ width: '600px', padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)', animation: 'scaleUp 0.3s' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TerminalIcon size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unified Checkout Agent Console</span>
              </div>
              <button 
                onClick={() => setCheckoutStage('idle')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ×
              </button>
            </div>

            {/* Terminal logs stage */}
            {checkoutStage === 'logs' && (
              <div style={{ padding: '1.25rem', background: '#0a0a0f', fontFamily: 'Courier New, monospace', minHeight: '350px', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                  {checkoutLogs.map((log, idx) => (
                    <div key={idx} style={{ color: log.includes('✓') || log.includes('Success') ? 'var(--success)' : log.includes('↳') ? 'var(--info)' : '#fff' }}>
                      {log}
                    </div>
                  ))}
                  <div ref={terminalEndRef}></div>
                </div>
              </div>
            )}

            {/* Payment Verification stage */}
            {checkoutStage === 'payment' && (
              <div style={{ padding: '1.75rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--success)', margin: '0 auto 0.75rem' }}>
                  <CheckCircle2 size={42} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>Secure Checkout Prepared</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                  We have mapped your cart across the optimized store distribution. Authorize the UPI order request below.
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
                    {/* Mock QR Code */}
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=flipscrape@paytm" 
                      alt="UPI QR Code" 
                      style={{ display: 'block', width: '100px', height: '100px' }}
                    />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Payable Amount</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>₹{splitView ? results.splitCart.grandTotal : results.cheapestTotal}</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--info)' }}>Unified order across {splitView ? results.splitCart.usedStores.length : 1} store(s)</span>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ maxWidth: '320px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OTP Verification Code</label>
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit code (e.g. 123456)" 
                      className="console-input"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem', padding: '0.5rem' }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-blue" 
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    Confirm & Complete Checkout
                  </button>
                </form>
              </div>
            )}

            {/* Success Stage */}
            {checkoutStage === 'success' && (
              <div style={{ padding: '2.5rem 1.75rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--success)', animation: 'scaleUp 0.4s ease-out', marginBottom: '1.25rem' }}>
                  <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
                </div>
                <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 700 }}>Orders Placed Successfully!</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0.5rem auto 1.5rem', lineHeight: 1.5 }}>
                  The Unified Checkout agent has successfully placed your orders on {splitView ? results.splitCart.usedStores.map(s => results.cartByStore[s]?.storeName).join(' & ') : results.cartByStore[results.cheapestStore]?.storeName}. Delivery details have been sent to your registered phone number.
                </p>

                <div style={{ background: 'rgba(16,185,129,0.05)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--success)', maxWidth: '350px', margin: '0 auto 1.5rem', fontSize: '0.8rem', color: 'var(--success)' }}>
                  🎉 Transaction Complete! You saved ₹{splitView ? results.savings + results.splitCart.savings : results.savings} compared to market highs!
                </div>

                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    setCheckoutStage('idle');
                    setResults(null);
                    setItems([]);
                  }}
                  style={{ padding: '0.6rem 2rem' }}
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CartOptimizer;
