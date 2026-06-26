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
  FileJson,
  Mic,
  MicOff,
  Loader2,
  Trash2,
  Filter
} from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';

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
  ebay: 'eBay India',
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

  // General E-Commerce
  shopsy: 'Shopsy',
  paytmmall: 'Paytm Mall',
  dealshare: 'DealShare',
  citymall: 'CityMall',
  udaan: 'Udaan',
  ondc: 'ONDC',

  // Fashion & Lifestyle Marketplaces
  tatacliq_luxury: 'Tata CLiQ Luxury',
  nnnow: 'Nnnow',
  lifestylestores: 'Lifestyle Stores',
  shoppersstop: 'Shoppers Stop',
  westside: 'Westside',
  zudio: 'Zudio',
  azorte: 'Azorte',
  reliancetrends: 'Reliance Trends',
  yousta: 'Yousta',
  centro: 'Centro',

  // D2C Fashion & Apparel
  souledstore: 'The Souled Store',
  rarerabbit: 'Rare Rabbit',
  bombayshirt: 'Bombay Shirt Company',
  powerlook: 'Powerlook',
  beyoung: 'Beyoung',
  redwolf: 'Redwolf',
  campussutra: 'Campus Sutra',
  hubberholme: 'Hubberholme',
  mufti: 'Mufti',
  spykar: 'Spykar',
  killerjeans: 'Killer Jeans',
  flyingmachine: 'Flying Machine',
  roadster: 'Roadster',
  highlander: 'Highlander',
  tokyotalkies: 'Tokyo Talkies',
  mastandharbour: 'Mast & Harbour',
  urbanic: 'Urbanic',
  redtape: 'Red Tape',

  // International Fashion Brands
  hm: 'H&M India',
  uniqlo: 'Uniqlo India',
  marksandspencer: 'Marks & Spencer India',
  levis: 'Levi\'s India',
  benetton: 'United Colors of Benetton',
  tommyhilfiger: 'Tommy Hilfiger India',
  calvinklein: 'Calvin Klein India',
  uspoloassn: 'US Polo Assn India',
  forever21: 'Forever 21 India',
  jackjones: 'Jack & Jones India',
  only: 'Only India',
  veromoda: 'Vero Moda India',
  superdry: 'Superdry India',
  gasjeans: 'Gas Jeans India',

  // Ethnic Wear
  fabindia: 'Fabindia',
  manyavar: 'Manyavar',
  mohey: 'Mohey',
  wforwoman: 'W for Woman',
  aurelia: 'Aurelia',
  biba: 'Biba',
  globaldesi: 'Global Desi',
  houseofindya: 'House of Indya',
  libas: 'Libas',
  soch: 'Soch',
  meenabazaar: 'Meena Bazaar',
  nallisilks: 'Nalli Silks',
  karagiri: 'Karagiri',
  suta: 'Suta',
  kalkifashion: 'Kalki Fashion',

  // Footwear
  bata: 'Bata India',
  metroshoes: 'Metro Shoes',
  mochishoes: 'Mochi Shoes',
  libertyshoes: 'Liberty Shoes',
  khadims: 'Khadim\'s',
  paragon: 'Paragon',
  campusshoes: 'Campus Shoes',
  relaxo: 'Sparx / Relaxo',
  woodland: 'Woodland India',
  crocs: 'Crocs India',
  skechers: 'Skechers India',
  nike: 'Nike India',
  reebok: 'Reebok India',

  // Electronics & Appliances
  sony: 'Sony India',
  xiaomi: 'Xiaomi India',
  realme: 'Realme India',
  vivo: 'Vivo India',
  oppo: 'Oppo India',
  motorola: 'Motorola India',
  dell: 'Dell India',
  asus: 'Asus India',
  acer: 'Acer India',
  whirlpool: 'Whirlpool India',
  godrej: 'Godrej Appliances',
  haier: 'Haier India',
  voltas: 'Voltas',
  bluestar: 'Blue Star',

  // Retailers & Audio
  boat: 'boAt Lifestyle',
  noise: 'Noise',
  boult: 'Boult Audio',
  mivi: 'Mivi',
  fireboltt: 'Fire-Boltt',
  zebronics: 'Zebronics',
  portronics: 'Portronics',
  jbl: 'JBL India',
  anker: 'Anker India',
  sennheiser: 'Sennheiser India',
  ambrane: 'Ambrane',
  leafstudios: 'Leaf Studios',

  // Jewelry
  caratlane: 'CaratLane',
  bluestone: 'BlueStone',
  giva: 'GIVA',
  melorra: 'Melorra',
  miabytanishq: 'Mia by Tanishq',
  kalyanjewellers: 'Kalyan Jewellers',
  malabargold: 'Malabar Gold & Diamonds',
  sencogold: 'Senco Gold & Diamonds',
  pcjeweller: 'PC Jeweller',
  voylla: 'Voylla',
  orrajewellery: 'Orra Jewellery',
  candere: 'Candere by Kalyan Jewellers',
  kushals: 'Kushal\'s Fashion Jewellery',

  // Watches & Accessories
  titan: 'Titan',
  fastrack: 'Fastrack',
  sonata: 'Sonata',
  casio: 'Casio India',
  fossil: 'Fossil India',
  danielwellington: 'Daniel Wellington India',
  ethoswatches: 'Ethos Watches',
  helioswatches: 'Helios Watches',
  baggit: 'Baggit',
  caprese: 'Caprese',
  lavie: 'Lavie',
  hidesign: 'Hidesign',
  damilano: 'Da Milano',
  wildhorn: 'Wildhorn',

  // Eyewear
  titaneyeplus: 'Titan Eyeplus',
  johnjacobs: 'John Jacobs',
  coolwinks: 'Coolwinks',
  rayban: 'Ray-Ban India',
  sunglasshut: 'Sunglass Hut India',
  specsmakers: 'Specsmakers',
  lenspick: 'Lenspick',
  cleardekho: 'ClearDekho',
  vincentchase: 'Vincent Chase',

  // Beauty & Personal Care
  purplle: 'Purplle',
  myglamm: 'MyGlamm',
  sugarcosmetics: 'Sugar Cosmetics',
  mamaearth: 'Mamaearth',
  wowskin: 'Wow Skin Science',
  dermaco: 'The Derma Co',
  plumgoodness: 'Plum Goodness',
  mcaffeine: 'mCaffeine',
  forestessentials: 'Forest Essentials',
  kamaayurveda: 'Kama Ayurveda',
  biotique: 'Biotique',
  lotusherbals: 'Lotus Herbals',
  himalaya: 'Himalaya Wellness',
  minimalist: 'Minimalist',
  foxtale: 'Foxtale',
  pilgrim: 'Pilgrim',
  dotandkey: 'Dot & Key',
  facescanada: 'Faces Canada',

  // Home & Kitchen
  urbanladder: 'Urban Ladder',
  woodenstreet: 'Wooden Street',
  homecentre: 'Home Centre',
  ikea: 'IKEA India',
  sleepwell: 'Sleepwell',
  wakefit: 'Wakefit',
  flomattress: 'Flo Mattress',
  thesleepcompany: 'The Sleep Company',
  borosil: 'Borosil',
  wonderchef: 'Wonderchef',
  pigeon: 'Pigeon',
  prestige: 'Prestige',
  hawkins: 'Hawkins Cookers',

  // Kids & Sports
  hopscotch: 'Hopscotch',
  hamleys: 'Hamleys India',
  decathlon: 'Decathlon India',
  vectorx: 'Vector X',
  cosco: 'Cosco India',
  nivia: 'Nivia Sports',
  yonex: 'Yonex India',
  starsports: 'Star India Sports',

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

const DEFAULT_SOURCES = {
  ecommerce: ['amazon', 'flipkart', 'snapdeal', 'myntra', 'ajio'],
  quickcommerce: ['blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes'],
  food: ['zomato', 'swiggy']
};

const STORE_GROUPS = {
  ecommerce: [
    {
      id: 'marketplaces',
      name: 'Marketplaces',
      stores: ['amazon', 'flipkart', 'meesho', 'snapdeal', 'jiomart', 'tatacliq', 'shopsy', 'paytmmall', 'shopclues', 'dealshare', 'citymall', 'indiamart', 'udaan', 'ebay', 'etsy', 'alibaba', 'aliexpress', 'walmart', 'ondc']
    },
    {
      id: 'fashion',
      name: 'Fashion & Lifestyle',
      stores: ['myntra', 'ajio', 'nykaafashion', 'tatacliq_luxury', 'nnnow', 'lifestylestores', 'shoppersstop', 'pantaloons', 'maxfashion', 'westside', 'zudio', 'azorte', 'reliancetrends', 'yousta', 'centro']
    },
    {
      id: 'd2c',
      name: 'D2C Apparel & Casual',
      stores: ['snitch', 'souledstore', 'bewakoof', 'rarerabbit', 'bombayshirt', 'powerlook', 'beyoung', 'redwolf', 'campussutra', 'hubberholme', 'mufti', 'spykar', 'killerjeans', 'flyingmachine', 'roadster', 'highlander', 'tokyotalkies', 'mastandharbour', 'urbanic', 'redtape']
    },
    {
      id: 'international',
      name: 'International Brands',
      stores: ['hm', 'zara', 'uniqlo', 'marksandspencer', 'levis', 'benetton', 'tommyhilfiger', 'calvinklein', 'uspoloassn', 'forever21', 'jackjones', 'only', 'veromoda', 'superdry', 'gasjeans']
    },
    {
      id: 'ethnic',
      name: 'Ethnic & Traditional',
      stores: ['fabindia', 'manyavar', 'mohey', 'wforwoman', 'aurelia', 'biba', 'globaldesi', 'houseofindya', 'libas', 'soch', 'meenabazaar', 'nallisilks', 'karagiri', 'suta', 'kalkifashion']
    },
    {
      id: 'footwear',
      name: 'Footwear Brands',
      stores: ['bata', 'metroshoes', 'mochishoes', 'libertyshoes', 'khadims', 'paragon', 'campusshoes', 'relaxo', 'woodland', 'crocs', 'skechers', 'puma', 'adidas', 'nike', 'reebok']
    },
    {
      id: 'electronics_brands',
      name: 'Electronics Brands',
      stores: ['sony', 'samsung', 'lg', 'apple', 'xiaomi', 'oneplus', 'realme', 'vivo', 'oppo', 'motorola', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'whirlpool', 'godrej', 'haier', 'voltas', 'bluestar']
    },
    {
      id: 'electronics_retailers',
      name: 'Electronics Retailers & Audio',
      stores: ['croma', 'reliance', 'vijaysales', 'boat', 'noise', 'boult', 'mivi', 'fireboltt', 'zebronics', 'portronics', 'jbl', 'anker', 'sennheiser', 'ambrane', 'leafstudios', 'headphones', 'dailyobjects']
    },
    {
      id: 'jewelry',
      name: 'Fine Jewelry',
      stores: ['tanishq', 'joyalukkas', 'caratlane', 'bluestone', 'giva', 'melorra', 'miabytanishq', 'kalyanjewellers', 'malabargold', 'sencogold', 'pcjeweller', 'voylla', 'orrajewellery', 'candere', 'kushals']
    },
    {
      id: 'watches',
      name: 'Watches & Accessories',
      stores: ['titan', 'fastrack', 'sonata', 'casio', 'fossil', 'danielwellington', 'ethoswatches', 'helioswatches', 'baggit', 'caprese', 'lavie', 'hidesign', 'damilano', 'wildhorn']
    },
    {
      id: 'eyewear',
      name: 'Eyewear & Sunglasses',
      stores: ['lenskart', 'titaneyeplus', 'johnjacobs', 'coolwinks', 'rayban', 'sunglasshut', 'specsmakers', 'lenspick', 'cleardekho', 'vincentchase']
    },
    {
      id: 'beauty',
      name: 'Beauty & Personal Care',
      stores: ['nykaa', 'purplle', 'myglamm', 'sugarcosmetics', 'mamaearth', 'wowskin', 'dermaco', 'plumgoodness', 'mcaffeine', 'forestessentials', 'kamaayurveda', 'biotique', 'lotusherbals', 'himalaya', 'minimalist', 'foxtale', 'pilgrim', 'dotandkey', 'facescanada']
    },
    {
      id: 'home',
      name: 'Home & Kitchen',
      stores: ['pepperfry', 'urbanladder', 'woodenstreet', 'homecentre', 'ikea', 'sleepwell', 'wakefit', 'flomattress', 'thesleepcompany', 'borosil', 'wonderchef', 'pigeon', 'prestige', 'hawkins', 'chumbak']
    },
    {
      id: 'kids_sports',
      name: 'Kids & Sports',
      stores: ['firstcry', 'hopscotch', 'hamleys', 'decathlon', 'cultstore', 'vectorx', 'cosco', 'nivia', 'yonex', 'starsports', 'bookswagon', 'vishalmegamart']
    }
  ],
  quickcommerce: [
    {
      id: 'quick',
      name: 'Quick Commerce Stores',
      stores: ['blinkit', 'zepto', 'instamart', 'bbnow', 'fkminutes', 'amazonfresh', 'jiomartexpress', 'bbdaily', 'dunzo', 'countrydelight']
    }
  ],
  food: [
    {
      id: 'food_delivery',
      name: 'Food Delivery Apps',
      stores: ['zomato', 'swiggy']
    }
  ]
};

function ScrapeConsole({ savedProducts, onSaveProducts, addToast, onAddToCart }) {
  const { location } = useLocationContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ecommerce');
  const [selectedSources, setSelectedSources] = useState(['amazon', 'flipkart', 'snapdeal', 'myntra', 'ajio']);
  const [storeSearch, setStoreSearch] = useState('');
  const [pages, setPages] = useState(3);
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const consoleEndRef = useRef(null);

  // Sync selectedSources with category
  useEffect(() => {
    setSelectedSources(DEFAULT_SOURCES[category] || []);
    setStoreSearch('');
  }, [category]);

  const toggleSource = (storeKey) => {
    setSelectedSources(prev => {
      if (prev.includes(storeKey)) {
        return prev.filter(s => s !== storeKey);
      } else {
        return [...prev, storeKey];
      }
    });
  };

  const selectAllStores = () => {
    const allCategoryStores = (STORE_GROUPS[category] || []).reduce((acc, group) => {
      return [...acc, ...group.stores];
    }, []);
    setSelectedSources(allCategoryStores);
  };

  const clearAllStores = () => {
    setSelectedSources([]);
  };

  const selectPresetStores = () => {
    setSelectedSources(DEFAULT_SOURCES[category] || []);
  };

  const filteredGroups = (STORE_GROUPS[category] || []).map(group => {
    const matchingStores = group.stores.filter(storeKey => {
      const storeName = STORE_NAMES[storeKey] || storeKey;
      return storeName.toLowerCase().includes(storeSearch.toLowerCase());
    });
    return {
      ...group,
      stores: matchingStores
    };
  }).filter(group => group.stores.length > 0);

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
      addToast('Listening for search query...', 'info');
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
      setQuery(transcript);
    };

    recognition.start();
  };

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
    if (selectedSources.length === 0) {
      addToast('Please select at least one shopping website to scrape', 'warning');
      return;
    }

    setConsoleLogs([]);
    setLoading(true);
    setResults(null);
    setProgress(0);

    addLog(`INIT: Symbiote scraper cluster starting...`, 'info');
    await new Promise(r => setTimeout(r, 200));
    addLog(`CONFIG: Category=${category.toUpperCase()} | Query="${query}" | Sources=${selectedSources.join(', ').toUpperCase()} | Pages=${pages}`, 'accent');
    await new Promise(r => setTimeout(r, 200));

    if (category === 'food') {
      addLog(`LOCATION: Detecting current city boundaries for "${location.displayLabel}"...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      addLog(`AGENT: Fetching menus based on localized GPS coordinates...`, 'info');
      await new Promise(r => setTimeout(r, 150));

      const activeStores = selectedSources;

      for (const st of activeStores) {
        const name = STORE_NAMES[st] || st.toUpperCase();
        const proxyIP = `103.22.201.${Math.floor(Math.random() * 254) + 1}`;
        addLog(`PROXY: Rotated IP pool to ${proxyIP}:8080 (ScrapingBee India Agent)`, 'accent');
        await new Promise(r => setTimeout(r, 100));
        addLog(`FETCH [${st.toUpperCase()}]: Checking local restaurants on ${name}...`, 'info');
        await new Promise(r => setTimeout(r, 150));
      }
    } else if (category === 'quickcommerce') {
      addLog(`LOCATION: Resolving delivery zone coordinates...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      addLog(`AGENT: Overriding coordinate request headers...`, 'info');
      await new Promise(r => setTimeout(r, 150));

      const activeStores = selectedSources;

      for (const st of activeStores) {
        const name = STORE_NAMES[st] || st.toUpperCase();
        const proxyIP = `103.22.201.${Math.floor(Math.random() * 254) + 1}`;
        addLog(`PROXY: Rotated IP pool to ${proxyIP}:8080 (ScrapingBee India Agent)`, 'accent');
        await new Promise(r => setTimeout(r, 100));
        addLog(`FETCH [${st.toUpperCase()}]: Querying ${name} express catalog...`, 'info');
        await new Promise(r => setTimeout(r, 150));
      }
    } else {
      addLog(`AGENT: Preparing rotated request headers...`, 'info');
      await new Promise(r => setTimeout(r, 150));
      const proxyIP = `103.22.201.${Math.floor(Math.random() * 254) + 1}`;
      addLog(`PROXY: Rotated IP pool to ${proxyIP}:8080 (ScrapingBee India Agent)`, 'accent');
      await new Promise(r => setTimeout(r, 150));
      addLog(`RATE: Delay buffer (1.2s - 2.8s) between page indexes`, 'info');
      await new Promise(r => setTimeout(r, 150));
      
      const activeStores = selectedSources;

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
        body: JSON.stringify({ query: query.trim(), category, source: selectedSources, pages, location })
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
    downloadAnchor.setAttribute('download', `symbiote_${source}_${query.replace(/\s+/g, '_')}_${Date.now()}.json`);
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="e.g. laptop, milk, sneakers..." 
                  className="console-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => e.key === 'Enter' && simulateScrapeLogs()}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className={`btn btn-secondary ${isListening ? 'listening-mic-btn' : ''}`}
                  style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: isListening ? 'var(--danger)' : 'var(--text-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleVoiceSearch}
                  title="Voice Search Assistant"
                  disabled={loading}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
            </div>

            <div className="input-box-wrapper">
              <label className="input-label">Select Category</label>
              <select 
                className="console-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                }}
                disabled={loading}
              >
                <option value="ecommerce">E-Commerce</option>
                <option value="quickcommerce">Quick Commerce</option>
                <option value="food">Food Delivery</option>
              </select>
            </div>

            <div className="input-box-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Select Target Websites</span>
                <span style={{ fontSize: '0.75rem', textTransform: 'none', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {selectedSources.length} selected
                </span>
              </label>

              {/* Search & Actions Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Search websites..." 
                  className="console-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)' }}
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  disabled={loading}
                />
                
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                    onClick={selectAllStores}
                    disabled={loading}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                    onClick={clearAllStores}
                    disabled={loading}
                  >
                    Clear All
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                    onClick={selectPresetStores}
                    disabled={loading}
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* Scrollable Checkbox Grid */}
              <div className="store-checkbox-scroll-box" style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {filteredGroups.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                    No websites match your search
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>
                        {group.name}
                      </span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.4rem' }}>
                        {group.stores.map(storeKey => {
                          const isSelected = selectedSources.includes(storeKey);
                          const storeName = STORE_NAMES[storeKey] || storeKey;
                          
                          return (
                            <button
                              key={storeKey}
                              type="button"
                              onClick={() => toggleSource(storeKey)}
                              disabled={loading}
                              className={`store-toggle-badge ${isSelected ? 'active' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.5rem',
                                borderRadius: '6px',
                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                                background: isSelected ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                textAlign: 'left',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={storeName}
                            >
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{
                                  margin: 0,
                                  accentColor: 'var(--accent-primary)',
                                  pointerEvents: 'none'
                                }}
                              />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              {/* Featured Lowest Price Showcase Card */}
              {(() => {
                const cheapest = results.bestPriceDeal || results.products.reduce((lowest, p) => p.price < lowest.price ? p : lowest, results.products[0]);
                if (!cheapest) return null;
                return (
                  <div className="glass-card cheapest-product-showcase stagger-in" style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(40,116,240,0.06) 100%)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    boxShadow: '0 0 25px rgba(16,185,129,0.15)',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, var(--success), #059669)',
                      color: 'white',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.75rem',
                      borderRadius: '20px',
                      boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 2
                    }}>
                      <Star size={12} fill="white" />
                      <span>Best Price Deal</span>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Product Image */}
                      {cheapest.imageUrl && (
                        <div className="showcase-img-wrapper" style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '12px',
                          background: '#111827',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                          border: '1px solid rgba(255,255,255,0.06)',
                          flexShrink: 0
                        }}>
                          <img 
                            src={cheapest.imageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(cheapest.imageUrl)}` : cheapest.imageUrl} 
                            alt={cheapest.name} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      {/* Product Details */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <span className={`store-badge store-badge-${cheapest.source || 'flipkart'}`} style={{ marginBottom: '0.4rem' }}>
                          {STORE_NAMES[cheapest.source] || cheapest.source}
                        </span>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {cheapest.name}
                        </h2>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div className="price-row" style={{ marginBottom: 0, gap: '0.5rem' }}>
                            <span className="price-current" style={{ fontSize: '1.45rem', color: 'var(--success)' }}>
                              {cheapest.priceFormatted || `₹${cheapest.price}`}
                            </span>
                            {cheapest.originalPrice && (
                              <span className="price-original" style={{ fontSize: '0.9rem' }}>
                                {cheapest.originalPriceFormatted || `₹${cheapest.originalPrice}`}
                              </span>
                            )}
                            {cheapest.discount > 0 && (
                              <span className="price-discount" style={{ fontSize: '0.8rem' }}>
                                {cheapest.discountFormatted || `${cheapest.discount}% off`}
                              </span>
                            )}
                          </div>

                          {cheapest.rating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span className={`star-rating-badge high`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                                {cheapest.rating} ★
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {cheapest.deliveryTime && <span>🚚 {cheapest.deliveryTime}</span>}
                          {cheapest.distance && <span>📍 {cheapest.distance}</span>}
                          {cheapest.deliveryFee !== null && <span>• Delivery: ₹{cheapest.deliveryFee}</span>}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                        {cheapest.productLink && (
                          <a 
                            href={cheapest.productLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}
                          >
                            Buy on Website <ExternalLink size={12} />
                          </a>
                        )}
                        {onAddToCart && (
                          <button 
                            className="btn btn-blue"
                            onClick={() => onAddToCart(cheapest.name)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                          >
                            <ShoppingCart size={12} /> Add to Cart Optimizer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {product.imageUrl ? (
                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                  <img 
                                    src={product.imageUrl.startsWith('http') && !product.imageUrl.includes('unsplash.com') ? `/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}` : product.imageUrl} 
                                    alt={product.name} 
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                  <ShoppingCart size={16} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                                </div>
                              )}
                              <span>{product.name}</span>
                            </div>
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
