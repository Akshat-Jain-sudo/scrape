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
                    <option value="all">All E-Commerce (174 Stores)</option>
                    <optgroup label="Marketplaces">
                      <option value="amazon">Amazon India</option>
                      <option value="flipkart">Flipkart</option>
                      <option value="meesho">Meesho</option>
                      <option value="snapdeal">Snapdeal</option>
                      <option value="jiomart">JioMart</option>
                      <option value="tatacliq">Tata CLiQ</option>
                      <option value="shopsy">Shopsy</option>
                      <option value="paytmmall">Paytm Mall</option>
                      <option value="shopclues">ShopClues</option>
                      <option value="dealshare">DealShare</option>
                      <option value="citymall">CityMall</option>
                      <option value="indiamart">IndiaMART</option>
                      <option value="udaan">Udaan</option>
                      <option value="ebay">eBay India</option>
                      <option value="etsy">Etsy</option>
                      <option value="alibaba">Alibaba</option>
                      <option value="aliexpress">AliExpress</option>
                      <option value="walmart">Walmart</option>
                      <option value="ondc">ONDC</option>
                    </optgroup>
                    <optgroup label="Fashion & Lifestyle Marketplaces">
                      <option value="myntra">Myntra</option>
                      <option value="ajio">AJIO</option>
                      <option value="nykaafashion">Nykaa Fashion</option>
                      <option value="tatacliq_luxury">Tata CLiQ Luxury</option>
                      <option value="nnnow">Nnnow</option>
                      <option value="lifestylestores">Lifestyle Stores</option>
                      <option value="shoppersstop">Shoppers Stop</option>
                      <option value="pantaloons">Pantaloons</option>
                      <option value="maxfashion">Max Fashion</option>
                      <option value="westside">Westside</option>
                      <option value="zudio">Zudio</option>
                      <option value="azorte">Azorte</option>
                      <option value="reliancetrends">Reliance Trends</option>
                      <option value="yousta">Yousta</option>
                      <option value="centro">Centro</option>
                    </optgroup>
                    <optgroup label="D2C Apparel & Casual Fashion">
                      <option value="snitch">Snitch</option>
                      <option value="souledstore">The Souled Store</option>
                      <option value="bewakoof">Bewakoof</option>
                      <option value="rarerabbit">Rare Rabbit</option>
                      <option value="bombayshirt">Bombay Shirt Company</option>
                      <option value="powerlook">Powerlook</option>
                      <option value="beyoung">Beyoung</option>
                      <option value="redwolf">Redwolf</option>
                      <option value="campussutra">Campus Sutra</option>
                      <option value="hubberholme">Hubberholme</option>
                      <option value="mufti">Mufti</option>
                      <option value="spykar">Spykar</option>
                      <option value="killerjeans">Killer Jeans</option>
                      <option value="flyingmachine">Flying Machine</option>
                      <option value="roadster">Roadster</option>
                      <option value="highlander">Highlander</option>
                      <option value="tokyotalkies">Tokyo Talkies</option>
                      <option value="mastandharbour">Mast & Harbour</option>
                      <option value="urbanic">Urbanic</option>
                      <option value="redtape">Red Tape</option>
                    </optgroup>
                    <optgroup label="International Fashion Brands">
                      <option value="hm">H&M India</option>
                      <option value="zara">Zara</option>
                      <option value="uniqlo">Uniqlo India</option>
                      <option value="marksandspencer">Marks & Spencer India</option>
                      <option value="levis">Levi's India</option>
                      <option value="benetton">United Colors of Benetton</option>
                      <option value="tommyhilfiger">Tommy Hilfiger India</option>
                      <option value="calvinklein">Calvin Klein India</option>
                      <option value="uspoloassn">US Polo Assn India</option>
                      <option value="forever21">Forever 21 India</option>
                      <option value="jackjones">Jack & Jones India</option>
                      <option value="only">Only India</option>
                      <option value="veromoda">Vero Moda India</option>
                      <option value="superdry">Superdry India</option>
                      <option value="gasjeans">Gas Jeans India</option>
                    </optgroup>
                    <optgroup label="Ethnic & Traditional Wear">
                      <option value="fabindia">Fabindia</option>
                      <option value="manyavar">Manyavar</option>
                      <option value="mohey">Mohey</option>
                      <option value="wforwoman">W for Woman</option>
                      <option value="aurelia">Aurelia</option>
                      <option value="biba">Biba</option>
                      <option value="globaldesi">Global Desi</option>
                      <option value="houseofindya">House of Indya</option>
                      <option value="libas">Libas</option>
                      <option value="soch">Soch</option>
                      <option value="meenabazaar">Meena Bazaar</option>
                      <option value="nallisilks">Nalli Silks</option>
                      <option value="karagiri">Karagiri</option>
                      <option value="suta">Suta</option>
                      <option value="kalkifashion">Kalki Fashion</option>
                    </optgroup>
                    <optgroup label="Footwear Brands & Stores">
                      <option value="bata">Bata India</option>
                      <option value="metroshoes">Metro Shoes</option>
                      <option value="mochishoes">Mochi Shoes</option>
                      <option value="libertyshoes">Liberty Shoes</option>
                      <option value="khadims">Khadim's</option>
                      <option value="paragon">Paragon</option>
                      <option value="campusshoes">Campus Shoes</option>
                      <option value="relaxo">Sparx / Relaxo</option>
                      <option value="woodland">Woodland India</option>
                      <option value="crocs">Crocs India</option>
                      <option value="skechers">Skechers India</option>
                      <option value="puma">Puma</option>
                      <option value="adidas">Adidas Store</option>
                      <option value="nike">Nike India</option>
                      <option value="reebok">Reebok India</option>
                    </optgroup>
                    <optgroup label="Electronics & Appliance Brands">
                      <option value="sony">Sony India</option>
                      <option value="samsung">Samsung Store</option>
                      <option value="lg">LG Brand Store</option>
                      <option value="apple">Apple Store</option>
                      <option value="xiaomi">Xiaomi India</option>
                      <option value="oneplus">OnePlus Store</option>
                      <option value="realme">Realme India</option>
                      <option value="vivo">Vivo India</option>
                      <option value="oppo">Oppo India</option>
                      <option value="motorola">Motorola India</option>
                      <option value="hp">HP World</option>
                      <option value="dell">Dell India</option>
                      <option value="lenovo">Lenovo Store</option>
                      <option value="asus">Asus India</option>
                      <option value="acer">Acer India</option>
                      <option value="whirlpool">Whirlpool India</option>
                      <option value="godrej">Godrej Appliances</option>
                      <option value="haier">Haier India</option>
                      <option value="voltas">Voltas</option>
                      <option value="bluestar">Blue Star</option>
                    </optgroup>
                    <optgroup label="Electronics Retailers & Audio">
                      <option value="croma">Croma</option>
                      <option value="reliance">Reliance Digital</option>
                      <option value="vijaysales">Vijay Sales</option>
                      <option value="boat">boAt Lifestyle</option>
                      <option value="noise">Noise</option>
                      <option value="boult">Boult Audio</option>
                      <option value="mivi">Mivi</option>
                      <option value="fireboltt">Fire-Boltt</option>
                      <option value="zebronics">Zebronics</option>
                      <option value="portronics">Portronics</option>
                      <option value="jbl">JBL India</option>
                      <option value="anker">Anker India</option>
                      <option value="sennheiser">Sennheiser India</option>
                      <option value="ambrane">Ambrane</option>
                      <option value="leafstudios">Leaf Studios</option>
                      <option value="headphones">Headphone Zone</option>
                      <option value="dailyobjects">Daily Objects</option>
                    </optgroup>
                    <optgroup label="Fine Jewelry">
                      <option value="tanishq">Tanishq</option>
                      <option value="joyalukkas">Joyalukkas</option>
                      <option value="caratlane">CaratLane</option>
                      <option value="bluestone">BlueStone</option>
                      <option value="giva">GIVA</option>
                      <option value="melorra">Melorra</option>
                      <option value="miabytanishq">Mia by Tanishq</option>
                      <option value="kalyanjewellers">Kalyan Jewellers</option>
                      <option value="malabargold">Malabar Gold & Diamonds</option>
                      <option value="sencogold">Senco Gold & Diamonds</option>
                      <option value="pcjeweller">PC Jeweller</option>
                      <option value="voylla">Voylla</option>
                      <option value="orrajewellery">Orra Jewellery</option>
                      <option value="candere">Candere by Kalyan Jewellers</option>
                      <option value="kushals">Kushal's Fashion Jewellery</option>
                    </optgroup>
                    <optgroup label="Watches & Fashion Accessories">
                      <option value="titan">Titan</option>
                      <option value="fastrack">Fastrack</option>
                      <option value="sonata">Sonata</option>
                      <option value="casio">Casio India</option>
                      <option value="fossil">Fossil India</option>
                      <option value="danielwellington">Daniel Wellington India</option>
                      <option value="ethoswatches">Ethos Watches</option>
                      <option value="helioswatches">Helios Watches</option>
                      <option value="baggit">Baggit</option>
                      <option value="caprese">Caprese</option>
                      <option value="lavie">Lavie</option>
                      <option value="hidesign">Hidesign</option>
                      <option value="damilano">Da Milano</option>
                      <option value="wildhorn">Wildhorn</option>
                    </optgroup>
                    <optgroup label="Eyewear & Sunglasses">
                      <option value="lenskart">Lenskart</option>
                      <option value="titaneyeplus">Titan Eyeplus</option>
                      <option value="johnjacobs">John Jacobs</option>
                      <option value="coolwinks">Coolwinks</option>
                      <option value="rayban">Ray-Ban India</option>
                      <option value="sunglasshut">Sunglass Hut India</option>
                      <option value="specsmakers">Specsmakers</option>
                      <option value="lenspick">Lenspick</option>
                      <option value="cleardekho">ClearDekho</option>
                      <option value="vincentchase">Vincent Chase</option>
                    </optgroup>
                    <optgroup label="Beauty & Personal Care">
                      <option value="nykaa">Nykaa</option>
                      <option value="purplle">Purplle</option>
                      <option value="myglamm">MyGlamm</option>
                      <option value="sugarcosmetics">Sugar Cosmetics</option>
                      <option value="mamaearth">Mamaearth</option>
                      <option value="wowskin">Wow Skin Science</option>
                      <option value="dermaco">The Derma Co</option>
                      <option value="plumgoodness">Plum Goodness</option>
                      <option value="mcaffeine">mCaffeine</option>
                      <option value="forestessentials">Forest Essentials</option>
                      <option value="kamaayurveda">Kama Ayurveda</option>
                      <option value="biotique">Biotique</option>
                      <option value="lotusherbals">Lotus Herbals</option>
                      <option value="himalaya">Himalaya Wellness</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="foxtale">Foxtale</option>
                      <option value="pilgrim">Pilgrim</option>
                      <option value="dotandkey">Dot & Key</option>
                      <option value="facescanada">Faces Canada</option>
                    </optgroup>
                    <optgroup label="Home Decor & Kitchenware">
                      <option value="pepperfry">Pepperfry</option>
                      <option value="urbanladder">Urban Ladder</option>
                      <option value="woodenstreet">Wooden Street</option>
                      <option value="homecentre">Home Centre</option>
                      <option value="ikea">IKEA India</option>
                      <option value="sleepwell">Sleepwell</option>
                      <option value="wakefit">Wakefit</option>
                      <option value="flomattress">Flo Mattress</option>
                      <option value="thesleepcompany">The Sleep Company</option>
                      <option value="borosil">Borosil</option>
                      <option value="wonderchef">Wonderchef</option>
                      <option value="pigeon">Pigeon</option>
                      <option value="prestige">Prestige</option>
                      <option value="hawkins">Hawkins Cookers</option>
                      <option value="chumbak">Chumbak</option>
                    </optgroup>
                    <optgroup label="Kids, Sports & Fitness">
                      <option value="firstcry">FirstCry</option>
                      <option value="hopscotch">Hopscotch</option>
                      <option value="hamleys">Hamleys India</option>
                      <option value="decathlon">Decathlon India</option>
                      <option value="cultstore">Cultsport</option>
                      <option value="vectorx">Vector X</option>
                      <option value="cosco">Cosco India</option>
                      <option value="nivia">Nivia Sports</option>
                      <option value="yonex">Yonex India</option>
                      <option value="starsports">Star India Sports</option>
                      <option value="bookswagon">Bookswagon</option>
                      <option value="vishalmegamart">Vishal Mega Mart</option>
                    </optgroup>
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
