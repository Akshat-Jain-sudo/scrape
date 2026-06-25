import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Bookmark, 
  Star, 
  ArrowRight, 
  MapPin, 
  ChevronDown, 
  ShoppingBag, 
  Utensils, 
  Search, 
  Sparkles, 
  TrendingUp, 
  ShoppingCart, 
  RefreshCw,
  Mic,
  MicOff,
  Brain
} from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';

const STORE_NAMES = {
  amazon: 'Amazon',
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
  bbnow: 'BB Now',
  fkminutes: 'FK Minutes',
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

function SpeedCostMatrix({ comparisonData }) {
  if (!comparisonData || !comparisonData.comparison) return null;
  
  const stores = Object.entries(comparisonData.comparison)
    .filter(([_, details]) => details.deliveryTime && details.price)
    .map(([store, details]) => {
      const timeMatch = details.deliveryTime.match(/(\d+)\s*mins?/i);
      const timeVal = timeMatch ? parseInt(timeMatch[1], 10) : 60;
      return {
        store,
        price: details.price,
        time: timeVal,
        label: STORE_NAMES[store] || store,
        deliveryTimeText: details.deliveryTime
      };
    });

  if (stores.length < 2) return null;

  const prices = stores.map(s => s.price);
  const times = stores.map(s => s.time);

  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  const minTime = Math.min(...times) * 0.8;
  const maxTime = Math.max(...times) * 1.2;
  const timeRange = maxTime - minTime || 1;

  const width = 360;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = stores.map(s => {
    const x = paddingX + ((s.time - minTime) / timeRange) * chartWidth;
    const y = height - paddingY - ((s.price - minPrice) / priceRange) * chartHeight;
    return { ...s, x, y };
  });

  return (
    <div className="speed-cost-matrix-card" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', marginTop: '1rem', width: '100%' }}>
      <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
        <Zap size={12} color="var(--accent-primary)" /> Speed vs. Cost Tradeoff
      </h4>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ maxWidth: '100%', display: 'block' }}>
          <text x={width / 2} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="middle">⏳ Delivery Time (Faster →)</text>
          <text x={10} y={height / 2} fill="var(--text-muted)" fontSize="8" textAnchor="middle" transform={`rotate(-90 10 ${height/2})`}>₹ Cost (Cheaper ↑)</text>
          
          <rect x={paddingX} y={paddingY} width={chartWidth} height={chartHeight} fill="none" stroke="rgba(255,255,255,0.05)" />
          
          <line x1={paddingX + chartWidth/2} y1={paddingY} x2={paddingX + chartWidth/2} y2={height - paddingY} stroke="rgba(255,255,255,0.02)" strokeDasharray="2,2" />
          <line x1={paddingX} y1={paddingY + chartHeight/2} x2={width - paddingX} y2={paddingY + chartHeight/2} stroke="rgba(255,255,255,0.02)" strokeDasharray="2,2" />

          {points.map((p, idx) => {
            const isCheapest = p.price === Math.min(...prices);
            const isFastest = p.time === Math.min(...times);
            const dotColor = p.store === 'zomato' ? '#cb202d' : 
                             p.store === 'swiggy' ? '#fc8019' : 
                             p.store === 'blinkit' ? '#dca306' : 
                             p.store === 'zepto' ? '#40186b' : 
                             p.store === 'instamart' ? '#c25303' : 'var(--accent-primary)';
            
            return (
              <g key={idx} className="matrix-node">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isCheapest || isFastest ? "6" : "4.5"} 
                  fill={dotColor} 
                  stroke={isCheapest ? "var(--success)" : isFastest ? "var(--info)" : "rgba(255,255,255,0.2)"}
                  strokeWidth={isCheapest || isFastest ? "2" : "1"} 
                />
                <text 
                  x={p.x} 
                  y={p.y - 8} 
                  fill="var(--text-primary)" 
                  fontSize="7" 
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.label.split(' ')[0]}
                </text>
                <text 
                  x={p.x} 
                  y={p.y + 12} 
                  fill="var(--text-muted)" 
                  fontSize="6.5" 
                  textAnchor="middle"
                >
                  ₹{p.price} ({p.deliveryTimeText})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Sub-component to manage real-time comparison for a single product card in the feed
function ComparisonFeedCard({ item, category, onSaveComparison, savedProducts, onAddToCart, selectedSources = [] }) {
  const [loading, setLoading] = useState(true);
  const [compData, setCompData] = useState(null);
  const [error, setError] = useState(null);
  const { location } = useLocationContext();
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAIRecommendation = async (data) => {
    setAiLoading(true);
    setAiRecommendation('');
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartData: { products: Object.entries(data.comparison).map(([store, details]) => ({ name: data.productName, price: details.price, rating: details.rating, source: store, discount: details.discount })) }, 
          type: 'product' 
        })
      });
      if (response.ok) {
        const resData = await response.json();
        setAiRecommendation(resData.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchComparison = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: item.query, category, location })
      });
      if (response.ok) {
        const data = await response.json();
        setCompData(data);
        fetchAIRecommendation(data);
      } else {
        throw new Error('Comparison failed');
      }
    } catch (err) {
      setError('Failed to fetch comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [item.id, category, location]);

  const handleSave = () => {
    if (!compData) return;
    const productsToSave = Object.entries(compData.comparison).map(([store, details]) => ({
      id: `${compData.id}-${store}`,
      name: compData.productName,
      price: details.price,
      priceFormatted: details.priceFormatted,
      originalPrice: details.originalPrice,
      originalPriceFormatted: details.originalPriceFormatted,
      discount: details.discount,
      discountFormatted: details.discountFormatted,
      rating: details.rating,
      ratingsCount: details.ratingsCount,
      productLink: details.productLink,
      imageUrl: compData.imageUrl || item.image,
      searchQuery: item.query,
      source: store,
      deliveryTime: details.deliveryTime,
      deliveryFee: details.deliveryFee,
      packagingFee: details.packagingFee,
      distance: details.distance,
      restaurantName: details.restaurantName,
      scrapedAt: compData.scrapedAt
    }));

    onSaveComparison(productsToSave);
  };

  const getStoreBadgeClass = (store) => {
    return `store-badge store-badge-${store}`;
  };

  return (
    <div className="glass-card comparison-feed-card stagger-in">
      <div className="comp-img-container">
        <img 
          src={
            compData?.imageUrl && compData.imageUrl.startsWith('http') && !compData.imageUrl.includes('unsplash.com') 
              ? `/api/proxy-image?url=${encodeURIComponent(compData.imageUrl)}` 
              : (compData?.imageUrl || item.image)
          } 
          alt={item.name} 
          className="comp-img" 
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'; }}
        />
        {compData?.bestPriceStore && !loading && (
          <span 
            className="discount-badge" 
            style={{ 
              position: 'absolute', 
              top: '10px', 
              left: '10px', 
              background: 'var(--success)', 
              fontSize: '0.7rem' 
            }}
          >
            Best Price on {compData.bestPriceStore.toUpperCase()}
          </span>
        )}
      </div>

      <div className="comp-info-container">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <h3 className="comp-title" title={compData?.productName || item.name}>
              {compData?.productName || item.name}
            </h3>
            {!loading && !error && (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {onAddToCart && (
                  <button 
                    className="btn-icon" 
                    onClick={() => onAddToCart(compData?.productName || item.name)} 
                    title="Add to Cart Optimizer"
                    style={{ color: 'var(--accent-blue)', padding: '0.25rem' }}
                  >
                    <ShoppingCart size={18} />
                  </button>
                )}
                <button 
                  className="btn-icon" 
                  onClick={handleSave} 
                  title="Save comparison to library"
                  style={{ color: 'var(--accent-primary)', padding: '0.25rem' }}
                >
                  <Bookmark size={18} />
                </button>
              </div>
            )}
          </div>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            Category: <span style={{ textTransform: 'capitalize' }}>{category}</span>
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
          </div>
        ) : error ? (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => fetchComparison(true)}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <>
            <div className="comp-stores-table">
              {Object.entries(compData.comparison)
                .filter(([store]) => {
                  return selectedSources.length === 0 || selectedSources.includes(store) || store === compData.bestPriceStore;
                })
                .map(([store, details]) => {
                  const isBest = store === compData.bestPriceStore;
                  const isSelected = selectedSources.length === 0 || selectedSources.includes(store);
                  return (
                    <div key={store} className={`comp-store-row ${isBest ? 'is-best' : ''}`}>
                      <div>
                        <span className={getStoreBadgeClass(store)}>
                          {store}
                        </span>
                        {details.sourceMode && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            marginLeft: '0.35rem', 
                            background: details.sourceMode === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)', 
                            color: details.sourceMode === 'live' ? 'var(--success)' : 'var(--text-muted)',
                            padding: '0.1rem 0.35rem', 
                            borderRadius: '4px',
                            display: 'inline-block',
                            verticalAlign: 'middle'
                          }}>
                            {details.sourceMode === 'live' ? 'Live' : 'Estimated'}
                          </span>
                        )}
                        {!isSelected && isBest && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 700, marginLeft: '0.35rem', background: 'rgba(16,185,129,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', display: 'inline-block', verticalAlign: 'middle' }}>
                            ★ Best Deal (Unselected Store)
                          </span>
                        )}
                      {details.restaurantName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                          🏪 {details.restaurantName}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="comp-price-val">{details.priceFormatted}</span>
                      {details.originalPriceFormatted && (
                        <span className="comp-price-orig">{details.originalPriceFormatted}</span>
                      )}
                      {details.discountFormatted && (
                        <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                          ({details.discountFormatted})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {details.rating && (
                          <>
                            <Star size={12} fill="var(--warning)" stroke="var(--warning)" />
                            <span>{details.rating}</span>
                          </>
                        )}
                        {details.deliveryTime && (
                          <span style={{ color: 'var(--info)', fontWeight: 500, fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                            🚚 {details.deliveryTime}
                          </span>
                        )}
                      </div>
                      {details.distance && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 Distance: {details.distance}
                        </div>
                      )}
                      {(details.deliveryFee !== null || details.packagingFee !== null) && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {details.deliveryFee !== null && `Del: ₹${details.deliveryFee}`}
                          {details.deliveryFee !== null && details.packagingFee !== null && ' | '}
                          {details.packagingFee !== null && `Pack: ₹${details.packagingFee}`}
                        </div>
                      )}
                    </div>

                    <div>
                      <a 
                        href={details.productLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-store-go"
                      >
                        Buy <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gemini AI Analyst Recommendation Panel */}
            <div className="gemini-analyst-panel glass-card stagger-in" style={{ padding: '0.75rem', border: '1px solid rgba(245,114,36,0.15)', background: 'rgba(245,114,36,0.01)', margin: '0.75rem 0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <Brain size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gemini Value Analyst</span>
                {aiLoading && <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
              </div>
              {aiLoading ? (
                <div className="shimmer-lines">
                  <div className="shimmer-line" style={{ height: '8px' }}></div>
                  <div className="shimmer-line" style={{ height: '8px', width: '70%' }}></div>
                </div>
              ) : aiRecommendation ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }} dangerouslySetInnerHTML={{ __html: aiRecommendation }}></p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Generating value summary...</p>
              )}
            </div>
            
            <SpeedCostMatrix comparisonData={compData} />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          <span>Real-time price feed</span>
          {!loading && !error && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-spinner" style={{ width: '6px', height: '6px', margin: 0 }}></span> Live Checked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ 
  savedProducts, 
  onSaveProducts, 
  onNavigateToScraper, 
  addToast, 
  onAddToCart
}) {
  const { location } = useLocationContext();
  const [activeCategory, setActiveCategory] = useState('ecommerce');
  const [trendingDeals, setTrendingDeals] = useState(null);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Custom search states
  const [searchQuery, setSearchQuery] = useState('');
  const [customComp, setCustomComp] = useState(null);
  const [searching, setSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [selectedSources, setSelectedSources] = useState(['amazon', 'flipkart', 'snapdeal', 'myntra', 'ajio']);
  const [storeSearch, setStoreSearch] = useState('');

  // Sync selectedSources with category
  useEffect(() => {
    setSelectedSources(DEFAULT_SOURCES[activeCategory] || []);
    setStoreSearch('');
  }, [activeCategory]);

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
    const allCategoryStores = (STORE_GROUPS[activeCategory] || []).reduce((acc, group) => {
      return [...acc, ...group.stores];
    }, []);
    setSelectedSources(allCategoryStores);
  };

  const clearAllStores = () => {
    setSelectedSources([]);
  };

  const selectPresetStores = () => {
    setSelectedSources(DEFAULT_SOURCES[activeCategory] || []);
  };

  const filteredGroups = (STORE_GROUPS[activeCategory] || []).map(group => {
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
    if (selectedSources.length === 0) {
      addToast('Please select at least one shopping website to compare', 'warning');
      return;
    }
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
      addToast('Listening for product name...', 'info');
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
      addToast('Voice search timed out or failed.', 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      addToast(`Searching for: "${transcript}"`, 'info');
      setSearchQuery(transcript);
      
      setSearching(true);
      setCustomComp(null);

      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: transcript.trim(), category: activeCategory, location })
        });

        if (response.ok) {
          const data = await response.json();
          setCustomComp(data);
          addToast(`Found comparisons for "${transcript}"`, 'success');
        } else {
          throw new Error('Comparison failed');
        }
      } catch (error) {
        console.error(error);
        addToast('Failed to compare prices.', 'error');
      } finally {
        setSearching(false);
      }
    };

    recognition.start();
  };

  // Fetch trending products config
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending');
        if (response.ok) {
          const data = await response.json();
          setTrendingDeals(data);
        }
      } catch (error) {
        console.error('Failed to fetch trending deals:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  const handleCustomSearch = async () => {
    if (!searchQuery.trim()) return;
    if (selectedSources.length === 0) {
      addToast('Please select at least one shopping website to compare', 'warning');
      return;
    }

    setSearching(true);
    setCustomComp(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), category: activeCategory, location })
      });

      if (response.ok) {
        const data = await response.json();
        setCustomComp(data);
        addToast(`Found comparisons for "${searchQuery}"`, 'success');
      } else {
        throw new Error('Comparison request failed');
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to compare prices. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveComparison = async (products) => {
    await onSaveProducts(products);
  };

  const currentTrendingItems = trendingDeals ? trendingDeals[activeCategory] || [] : [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>Compare Dashboard</h1>
          <p>Real-time comparative pricing feed across e-commerce, fashion, and quick-commerce stores</p>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="category-tabs">
        <button 
          className={`category-tab ${activeCategory === 'ecommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('ecommerce'); setCustomComp(null); }}
        >
          <ShoppingBag size={16} />
          <span>E-Commerce <span className="tab-subtext">(Amazon, Flipkart, Meesho, AJIO, Walmart, Nykaa & more)</span></span>
        </button>
        <button 
          className={`category-tab ${activeCategory === 'quickcommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('quickcommerce'); setCustomComp(null); }}
        >
          <Zap size={16} />
          <span>Quick Commerce <span className="tab-subtext">(Blinkit, Zepto, Swiggy Instamart, BigBasket, Dunzo & more)</span></span>
        </button>
        <button 
          className={`category-tab ${activeCategory === 'food' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('food'); setCustomComp(null); }}
        >
          <Utensils size={16} />
          <span>Food Delivery <span className="tab-subtext">(Zomato & Swiggy)</span></span>
        </button>
      </div>

      {/* Custom Search Box */}
      <div className="glass-card search-hero" style={{ marginBottom: '2rem' }}>
        <h2>🔍 Search & Compare Any Product</h2>
        <p>
          Compare price indicators in real-time on: 
          {activeCategory === 'ecommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Amazon, Flipkart, Meesho, Snapdeal, JioMart, Tata CLiQ, Myntra, AJIO, Nykaa, Nykaa Fashion, FirstCry, Pepperfry, H&M, Zara, Uniqlo, Levi's, Bata, Nike, Samsung, Sony, Apple, Croma, Tanishq, Titan, Lenskart, Decathlon, and 140+ more brands</strong>}
          {activeCategory === 'quickcommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Blinkit, Zepto, Swiggy Instamart, BigBasket Now, Flipkart Minutes, Amazon Fresh, JioMart Express, BB Daily, Dunzo, Country Delight</strong>}
          {activeCategory === 'food' && <strong style={{ color: 'var(--accent-primary)' }}> Zomato, Swiggy</strong>}
        </p>
        
        <div className="search-box">
          <input 
            type="text"
            placeholder={
              activeCategory === 'ecommerce' ? 'Search electronics, clothing across Amazon, Flipkart...' :
              activeCategory === 'quickcommerce' ? 'Search groceries across Blinkit, Zepto, Instamart...' :
              activeCategory === 'food' ? 'Search restaurants on Zomato & Swiggy...' :
              `Search and compare in ${activeCategory}...`
            }
            className="console-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searching}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
          />
          <button 
            type="button" 
            className={`btn btn-secondary ${isListening ? 'listening-mic-btn' : ''}`}
            style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: isListening ? 'var(--danger)' : 'var(--text-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleVoiceSearch}
            title="Voice Search Assistant"
            disabled={searching}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCustomSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? (
              <>
                <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%' }}></div>
                Comparing...
              </>
            ) : (
              <>
                <Search size={16} />
                Compare
              </>
            )}
          </button>
        </div>

        {/* Website Selection Panel (dashboard) */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, textTransform: 'none', letterSpacing: 'normal' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Target Websites to Compare:</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {selectedSources.length} selected
              </span>
            </label>

            {/* Search & Actions Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Search websites..." 
                className="console-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', width: '200px', flexGrow: 1 }}
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                disabled={searching}
              />
              
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                  onClick={selectAllStores}
                  disabled={searching}
                >
                  Select All
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                  onClick={clearAllStores}
                  disabled={searching}
                >
                  Clear All
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                  onClick={selectPresetStores}
                  disabled={searching}
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Scrollable Checkbox Grid */}
            <div className="store-checkbox-scroll-box" style={{
              maxHeight: '180px',
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
                            disabled={searching}
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
        </div>
      </div>

      {/* Custom Comparison Result Card */}
      {customComp && !searching && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> Custom Search Comparison
          </h2>
          <ComparisonFeedCard 
            item={{ id: 'custom', name: searchQuery, query: searchQuery, image: '' }} 
            category={activeCategory} 
            onSaveComparison={handleSaveComparison}
            savedProducts={savedProducts}
            onAddToCart={onAddToCart}
            selectedSources={selectedSources}
          />
        </div>
      )}

      {/* Search Loading Screen */}
      {searching && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <div className="spinner-container" style={{ padding: '2.5rem' }}>
            <div className="pulse-spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Comparing prices for "<strong>{searchQuery}</strong>" across stores...</p>
          </div>
        </div>
      )}

      {/* Trending / Scrolldown comparative feed */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-primary)" /> 
          Trending Deals comparison (Scroll to compare)
        </h2>

        {loadingTrending ? (
          <div className="spinner-container">
            <div className="pulse-spinner"></div>
            <p>Loading trending comparison models...</p>
          </div>
        ) : currentTrendingItems.length === 0 ? (
          <div className="glass-card empty-state">
            <ShoppingCart size={40} />
            <h3>No comparisons configured</h3>
            <p>Select another category tab above to see comparisons.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentTrendingItems.map(item => (
              <ComparisonFeedCard 
                key={item.id} 
                item={item} 
                category={activeCategory}
                onSaveComparison={handleSaveComparison}
                savedProducts={savedProducts}
                onAddToCart={onAddToCart}
                selectedSources={selectedSources}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
