/**
 * Symbiote AI Chatbot Engine
 * 
 * A rule-based, context-aware conversational engine tailored for the
 * FlipScrape Price Comparison & Cart Optimizer platform.
 * 
 * Capabilities:
 *  - Feature help & guidance (Scrape Console, Cart Optimizer, Price Alerts, etc.)
 *  - Feedback & suggestion collection (bugs, features, improvements)
 *  - Contextual awareness (knows which page the user is on)
 *  - Multi-turn conversation with session memory
 */

// ── Intent Definitions ──
// Each intent has keywords, optional patterns, and a handler function.

const INTENTS = [
  {
    name: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'howdy', 'sup', 'yo', 'good morning', 'good evening', 'good afternoon', 'hola', 'namaste'],
    patterns: [/^(hi|hello|hey|yo)\b/i],
    priority: 1,
  },
  {
    name: 'farewell',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'cya', 'goodnight', 'take care'],
    patterns: [/\b(bye|goodbye|see\s?you|later|cya)\b/i],
    priority: 1,
  },
  {
    name: 'thanks',
    keywords: ['thanks', 'thank you', 'thx', 'appreciate', 'grateful', 'ty'],
    patterns: [/\b(thanks?|thank\s?you|thx|ty)\b/i],
    priority: 1,
  },
  {
    name: 'help_general',
    keywords: ['help', 'what can you do', 'how does this work', 'guide', 'tutorial', 'features', 'what is this', 'how to use'],
    patterns: [/\b(help|guide|tutorial|what.*do|how.*work|how.*use)\b/i],
    priority: 2,
  },
  {
    name: 'help_scraper',
    keywords: ['scrape', 'scraper', 'scraping', 'search products', 'find products', 'flipkart', 'snapdeal', 'search console', 'scrape console'],
    patterns: [/\b(scrap[eir]|scraping|search.*product|flipkart|snapdeal|scrape\s?console)\b/i],
    priority: 3,
  },
  {
    name: 'help_cart',
    keywords: ['cart', 'optimizer', 'cart optimizer', 'cheapest', 'best store', 'compare stores', 'shopping list', 'optimize cart', 'grocery'],
    patterns: [/\b(cart\s?optim|cheapest\s?store|compare\s?store|shopping\s?list|optimize.*cart|grocery)\b/i],
    priority: 3,
  },
  {
    name: 'help_price_alert',
    keywords: ['price alert', 'target price', 'price drop', 'notify', 'alert me', 'watch price', 'price tracking', 'price history'],
    patterns: [/\b(price\s?(alert|drop|track|history|watch)|target\s?price|alert\s?me|notify.*price)\b/i],
    priority: 3,
  },
  {
    name: 'help_saved',
    keywords: ['saved products', 'archive', 'library', 'my products', 'bookmarks', 'export', 'csv', 'excel'],
    patterns: [/\b(saved\s?product|archive|library|my\s?product|bookmark|export|csv|excel)\b/i],
    priority: 3,
  },
  {
    name: 'help_analytics',
    keywords: ['analytics', 'insights', 'statistics', 'charts', 'data', 'trends', 'insight hub'],
    patterns: [/\b(analytics?|insights?|statistics?|charts?|trends?|insight\s?hub)\b/i],
    priority: 3,
  },
  {
    name: 'help_cab',
    keywords: ['cab', 'ride', 'uber', 'ola', 'rapido', 'taxi', 'cab compare', 'fare', 'ride fare'],
    patterns: [/\b(cab|ride|uber|ola|rapido|taxi|fare)\b/i],
    priority: 3,
  },
  {
    name: 'help_theme',
    keywords: ['theme', 'dark mode', 'light mode', 'amoled', 'cyberpunk', 'color', 'appearance', 'switch theme'],
    patterns: [/\b(theme|dark\s?mode|light\s?mode|amoled|cyberpunk|appearance|switch\s?theme)\b/i],
    priority: 3,
  },
  {
    name: 'feedback_bug',
    keywords: ['bug', 'broken', 'not working', 'error', 'crash', 'issue', 'problem', 'glitch', 'doesn\'t work', 'failed'],
    patterns: [/\b(bug|broken|not\s?work|error|crash|issue|problem|glitch|fail|doesn'?t\s?work)\b/i],
    priority: 4,
  },
  {
    name: 'feedback_feature',
    keywords: ['feature request', 'add feature', 'i want', 'i wish', 'it would be nice', 'suggestion', 'suggest', 'can you add', 'new feature', 'please add'],
    patterns: [/\b(feature\s?request|add.*feature|i\s?(want|wish)|suggestion|suggest|can\s?you\s?add|please\s?add|new\s?feature|it\s?would\s?be)\b/i],
    priority: 4,
  },
  {
    name: 'feedback_improvement',
    keywords: ['improve', 'improvement', 'better', 'enhance', 'upgrade', 'optimize', 'polish', 'refine', 'could be better'],
    patterns: [/\b(improv|better|enhanc|upgrad|optimiz|polish|refin|could\s?be\s?better)\b/i],
    priority: 4,
  },
  {
    name: 'feedback_rate',
    keywords: ['rate', 'rating', 'review', 'stars', 'how do you rate', 'feedback', 'opinion'],
    patterns: [/\b(rate|rating|review|stars|feedback|opinion)\b/i],
    priority: 3,
  },
  {
    name: 'about',
    keywords: ['about', 'who made', 'developer', 'symbiote', 'what is symbiote', 'version', 'about this app'],
    patterns: [/\b(about|who\s?made|developer|what\s?is\s?symbiote|version|about\s?this)\b/i],
    priority: 2,
  },
];

// ── Response Templates ──

const RESPONSES = {
  greeting: [
    "Hey there! 👋 I'm **Symbiote AI**, your personal assistant for this platform. How can I help you today?\n\nYou can ask me about:\n• 🔍 **Scraping** products\n• 🛒 **Cart Optimizer**\n• 💰 **Price Alerts**\n• 🚕 **Cab Compare**\n• 💡 **Suggest improvements**\n• 🐛 **Report bugs**",
    "Hello! 🤖 Welcome to the Symbiote assistant. I can help you navigate the app, answer questions, or collect your feedback. What's on your mind?",
    "Hi there! ✨ I'm here to help you get the most out of FlipScrape. Ask me anything about features, or share your feedback!",
  ],

  farewell: [
    "Goodbye! 👋 Thanks for using Symbiote. Come back anytime you need help!",
    "See you later! 🚀 If you have more questions, I'll be right here.",
    "Take care! ✨ Don't forget to check your price alerts!",
  ],

  thanks: [
    "You're welcome! 😊 Happy to help. Is there anything else you'd like to know?",
    "No problem at all! 🎉 Let me know if there's anything else I can assist with.",
    "Glad I could help! ✨ Feel free to reach out anytime.",
  ],

  help_general: [
    "Here's what I can help you with! 🎯\n\n**📍 Navigation & Features:**\n• **Scrape Console** — Search & compare products across Flipkart, Snapdeal, and more\n• **Cart Optimizer** — Find the cheapest store for your entire shopping list\n• **Saved Products** — Your product library with price history & export\n• **Analytics** — Insights on your scraping patterns\n• **Cab Compare** — Compare ride fares across Uber, Ola & Rapido\n\n**🛠 Actions I can do:**\n• Answer questions about any feature\n• Collect bug reports & feedback\n• Suggest improvements\n• Help you navigate the app\n\nJust ask! 💬",
  ],

  help_scraper: [
    "🔍 **Scrape Console** is the heart of Symbiote!\n\nHere's how to use it:\n1. Go to the **Scrape Console** tab in the sidebar\n2. Type a product name (e.g., \"iPhone 15\", \"washing machine\")\n3. Select a **category** (Electronics, Fashion, Grocery, etc.)\n4. Hit **Search** — we'll compare prices across Flipkart, Snapdeal, Amazon, Croma, and more!\n\n**Pro tips:**\n• 🎤 Use **voice search** to dictate your query\n• 💾 **Save** results to your product library for tracking\n• 🛒 Add items directly to the **Cart Optimizer**\n• 📊 Prices auto-track when you search the same product again\n\nWant to know about any specific aspect?",
  ],

  help_cart: [
    "🛒 **Cart Optimizer** helps you find the cheapest store for multiple items!\n\nHow it works:\n1. Go to the **Cart Optimizer** tab\n2. Add items to your shopping list (manually or from saved products)\n3. Click **Optimize** — we'll calculate which single store has the lowest total\n4. See a breakdown of prices, delivery fees, and savings!\n\n**Features:**\n• 🎤 **Voice input** — say \"Add milk, bread, and eggs\"\n• 📊 Visual comparison across all stores\n• 💰 Shows delivery fees and total savings\n• 🏪 Supports Blinkit, Zepto, BigBasket, DMart, and more\n\nPerfect for your grocery runs! 🥬",
  ],

  help_price_alert: [
    "💰 **Price Alerts** help you buy at the right time!\n\nHow to set up:\n1. Save any product to your library (from Scrape Console)\n2. Go to **Saved Products** tab\n3. Set a **target price** in the alert input field\n4. When the price drops to or below your target, you'll see a **🔥 Price Alert Met** banner!\n\n**How tracking works:**\n• Every time you search for a product, its price is automatically recorded\n• View the **price history chart** by clicking the 📈 icon on any saved product\n• The cron scheduler also periodically re-checks prices\n\nNever miss a deal again! 🎯",
  ],

  help_saved: [
    "📦 **Saved Products** is your product library!\n\n**Features:**\n• View all products you've saved from scraping sessions\n• **Price history charts** — click the 📈 icon to see price trends\n• **Price alerts** — set target prices to track drops\n• **Export** your collection as CSV or Excel\n• **Delete** individual products or clear all\n• **Add to Cart Optimizer** directly from here\n\n**Export formats:**\n• 📄 **CSV** — lightweight, opens in any spreadsheet app\n• 📊 **Excel** — formatted .xlsx file with all product data\n\nAll your deal-hunting in one place! 🏷️",
  ],

  help_analytics: [
    "📊 **Analytics / Insight Hub** gives you a bird's eye view of your data!\n\nYou'll see:\n• **Scraping history** — when and what you've searched\n• **Price distribution** across stores\n• **Category breakdown** of your saved products\n• **Store performance** — which stores have the best deals\n\nThe more you use Symbiote, the richer your analytics get! 📈",
  ],

  help_cab: [
    "🚕 **Cab Compare** helps you find the cheapest ride!\n\nHow to use it:\n1. Go to the **Cab Compare** tab\n2. Enter your **pickup** and **drop** locations\n3. See fare estimates across **Uber**, **Ola**, and **Rapido**\n4. Compare ride types (Mini, Sedan, SUV, Auto, Bike)\n\n**What you'll see:**\n• 💰 Estimated fare range for each platform\n• ⏱ Estimated travel time\n• 🏷️ Surge pricing indicators\n• 🏆 Highlighted cheapest option\n\nSave money on every ride! 🚀",
  ],

  help_theme: [
    "🎨 **Themes** — Symbiote has 3 beautiful themes!\n\n1. **🌃 Cyberpunk** (default) — Dark with neon orange accents\n2. **☀️ Glass Light** — Clean, modern light mode\n3. **🖤 AMOLED Black** — True black for OLED screens\n\n**How to switch:**\n• Click the **🎨 palette icon** in the sidebar footer\n• Or use the palette icon in the mobile header\n• Theme preference is saved automatically!\n\nEach theme has its own vibe — try them all! ✨",
  ],

  feedback_bug: [
    "🐛 Oh no, sounds like you ran into an issue!\n\nI'd love to help. Could you describe:\n1. **What happened?** (the bug or error)\n2. **What were you trying to do?** (which feature/page)\n3. **Any error messages?**\n\nType your bug report and I'll save it for the team. You can also just describe it in your own words — I'll categorize it automatically! 📝",
  ],

  feedback_feature: [
    "💡 Great, I love hearing new ideas!\n\nPlease describe the feature you'd like to see. Be as detailed as you'd like — for example:\n• What should it do?\n• Where should it appear?\n• Why would it be useful?\n\nType your suggestion below and I'll save it! ✨",
  ],

  feedback_improvement: [
    "🔧 Want to make Symbiote even better? I'm all ears!\n\nTell me what could be improved — it could be:\n• 🎨 Design or layout changes\n• ⚡ Performance improvements\n• 🧭 Navigation or UX flow\n• 📊 Data or accuracy\n\nShare your thoughts and I'll log it for the development team! 📝",
  ],

  feedback_rate: [
    "⭐ We'd love your rating!\n\nOn a scale of **1 to 5 stars**, how would you rate your experience with Symbiote?\n\nJust type a number (1-5) or say something like \"4 stars\". You can also share why you gave that rating! 🌟",
  ],

  about: [
    "🧬 **Symbiote (FlipScrape)** — v1.0\n\nA premium **Price Comparison & Cart Optimizer** platform that helps you:\n• 🔍 Scrape & compare prices across e-commerce stores\n• 🛒 Optimize your shopping cart for the cheapest total\n• 💰 Track prices and set alerts for drops\n• 🚕 Compare cab fares across Uber, Ola & Rapido\n\n**Tech Stack:**\n• React 19 + Vite (Frontend)\n• Express + Neon PostgreSQL (Backend)\n• Cheerio + Axios (Scraping)\n\nBuilt with ❤️ by the Symbiote team — © 2026",
  ],

  fallback: [
    "Hmm, I'm not quite sure about that 🤔. Could you rephrase?\n\nHere's what I can help with:\n• Questions about **features** (scraping, cart, alerts, etc.)\n• **Bug reports** — describe what went wrong\n• **Suggestions** — share ideas for improvement\n• **Feedback** — rate your experience",
    "I didn't quite catch that. 💬 Try asking about a specific feature, or say \"help\" to see everything I can do!",
    "I'm still learning! 🤖 Try asking about scraping, cart optimization, price alerts, or share your feedback with me.",
  ],
};

// ── Context-Aware Suggestions ──
// When user is on a specific page, offer tailored tips

const PAGE_TIPS = {
  dashboard: "💡 **Tip:** You're on the Dashboard! Try searching for a trending product, or head to the Scrape Console for detailed searches.",
  scraper: "💡 **Tip:** You're in the Scrape Console. Try searching for products like \"earbuds\" or \"running shoes\" — I'll compare prices across stores!",
  cart: "💡 **Tip:** You're in the Cart Optimizer. Add your grocery items and I'll find the cheapest store for your entire list!",
  cab: "💡 **Tip:** You're in Cab Compare. Enter pickup & drop locations to compare fares across Uber, Ola, and Rapido!",
  archive: "💡 **Tip:** You're viewing Saved Products. Set target prices on items to get alerted when prices drop!",
  insights: "💡 **Tip:** You're in Analytics. The more products you scrape and save, the richer these insights become!",
};

// ── Session Context ──
// In-memory map to track conversation state per session

const sessionContexts = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

function getSessionContext(sessionId) {
  if (!sessionContexts.has(sessionId)) {
    sessionContexts.set(sessionId, {
      lastIntent: null,
      feedbackPending: null, // { category, awaitingMessage: true/false, awaitingRating: true/false }
      messageCount: 0,
      createdAt: Date.now(),
    });
  }
  const ctx = sessionContexts.get(sessionId);
  ctx.lastAccess = Date.now();
  return ctx;
}

// Periodically clean up stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, ctx] of sessionContexts.entries()) {
    if (now - (ctx.lastAccess || ctx.createdAt) > SESSION_TTL_MS) {
      sessionContexts.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ── Intent Classification ──

function classifyIntent(message) {
  const lowerMsg = message.toLowerCase().trim();

  let bestMatch = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    let score = 0;

    // Check regex patterns first (higher weight)
    if (intent.patterns) {
      for (const pattern of intent.patterns) {
        if (pattern.test(lowerMsg)) {
          score += 10;
          break;
        }
      }
    }

    // Check keyword matches
    for (const keyword of intent.keywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        // Longer keyword matches are more specific
        score += 3 + keyword.length * 0.5;
      }
    }

    // Apply priority boost
    if (score > 0) {
      score += intent.priority;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent.name;
    }
  }

  return bestScore > 0 ? bestMatch : 'fallback';
}

// ── Response Generation ──

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractRating(message) {
  // Match patterns like "4 stars", "4/5", just "4", "four stars"
  const numWords = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  
  const numMatch = message.match(/\b([1-5])\s*(?:star|\/5|out\s*of\s*5)?/i);
  if (numMatch) return parseInt(numMatch[1]);

  for (const [word, val] of Object.entries(numWords)) {
    if (message.toLowerCase().includes(word)) return val;
  }
  return null;
}

/**
 * Generate a chatbot response for a user message.
 * 
 * @param {string} message       - The user's message
 * @param {string} sessionId     - Session identifier
 * @param {string} currentPage   - The page the user is currently viewing
 * @returns {{ reply: string, intent: string, feedbackSaved?: object }}
 */
export function generateResponse(message, sessionId, currentPage = 'dashboard') {
  const ctx = getSessionContext(sessionId);
  ctx.messageCount++;

  const trimmedMsg = message.trim();
  if (!trimmedMsg) {
    return { reply: "It looks like you sent an empty message. Type something and I'll do my best to help! 💬", intent: 'empty' };
  }

  // ── Handle pending feedback flow ──
  if (ctx.feedbackPending) {
    const fb = ctx.feedbackPending;

    // If awaiting a rating number
    if (fb.awaitingRating) {
      const rating = extractRating(trimmedMsg);
      if (rating) {
        fb.rating = rating;
        fb.awaitingRating = false;

        if (!fb.message) {
          fb.awaitingMessage = true;
          return {
            reply: `${'⭐'.repeat(rating)} — Thanks for the ${rating}-star rating!\n\nWould you like to add a comment? If so, type it now. Or say **"done"** to submit.`,
            intent: 'feedback_collecting',
          };
        }

        // Complete — save feedback
        const result = { category: fb.category, message: fb.message, rating: fb.rating, page: currentPage };
        ctx.feedbackPending = null;
        return {
          reply: `✅ **Feedback saved!** Thank you for your ${rating}-star rating and comment.\n\nYour input helps us make Symbiote better. Is there anything else? 🙏`,
          intent: 'feedback_saved',
          feedbackSaved: result,
        };
      }

      // Not a rating — treat as a comment
      if (trimmedMsg.toLowerCase() === 'skip' || trimmedMsg.toLowerCase() === 'done' || trimmedMsg.toLowerCase() === 'no') {
        const result = { category: fb.category, message: fb.message || '(no comment)', rating: null, page: currentPage };
        ctx.feedbackPending = null;
        return {
          reply: "✅ **Feedback saved!** Thanks for sharing. Every bit helps! 🙏\n\nAnything else I can help with?",
          intent: 'feedback_saved',
          feedbackSaved: result,
        };
      }
    }

    // If awaiting message/description
    if (fb.awaitingMessage) {
      if (trimmedMsg.toLowerCase() === 'done' || trimmedMsg.toLowerCase() === 'skip' || trimmedMsg.toLowerCase() === 'no') {
        if (fb.rating || fb.message) {
          const result = { category: fb.category, message: fb.message || '(no comment)', rating: fb.rating || null, page: currentPage };
          ctx.feedbackPending = null;
          return {
            reply: "✅ **Feedback saved!** Thanks for sharing your thoughts. 🎉\n\nAnything else?",
            intent: 'feedback_saved',
            feedbackSaved: result,
          };
        }
        ctx.feedbackPending = null;
        return { reply: "Okay, no worries! Feedback cancelled. Let me know if you need anything else. 😊", intent: 'feedback_cancelled' };
      }

      fb.message = trimmedMsg;
      fb.awaitingMessage = false;

      if (!fb.rating && fb.category !== 'bug') {
        fb.awaitingRating = true;
        return {
          reply: `Got it! 📝 Thanks for that.\n\nWould you also like to give a quick **star rating** (1-5)? Or say **"skip"** to submit without one.`,
          intent: 'feedback_collecting',
        };
      }

      // Complete — save
      const result = { category: fb.category, message: fb.message, rating: fb.rating || null, page: currentPage };
      ctx.feedbackPending = null;
      return {
        reply: `✅ **${fb.category === 'bug' ? 'Bug report' : 'Feedback'} saved!** We really appreciate you taking the time. 🙏\n\nAnything else I can help with?`,
        intent: 'feedback_saved',
        feedbackSaved: result,
      };
    }
  }

  // ── Classify intent ──
  const intent = classifyIntent(trimmedMsg);
  ctx.lastIntent = intent;

  // ── Generate reply based on intent ──
  let reply;

  switch (intent) {
    case 'feedback_bug':
      ctx.feedbackPending = { category: 'bug', awaitingMessage: true, awaitingRating: false };
      reply = pickRandom(RESPONSES.feedback_bug);
      break;

    case 'feedback_feature':
      ctx.feedbackPending = { category: 'feature', awaitingMessage: true, awaitingRating: false };
      reply = pickRandom(RESPONSES.feedback_feature);
      break;

    case 'feedback_improvement':
      ctx.feedbackPending = { category: 'improvement', awaitingMessage: true, awaitingRating: false };
      reply = pickRandom(RESPONSES.feedback_improvement);
      break;

    case 'feedback_rate':
      ctx.feedbackPending = { category: 'general', awaitingRating: true, awaitingMessage: false };
      reply = pickRandom(RESPONSES.feedback_rate);
      break;

    default:
      reply = pickRandom(RESPONSES[intent] || RESPONSES.fallback);
      break;
  }

  // Add contextual page tip on first message or help requests
  if ((ctx.messageCount === 1 || intent === 'help_general') && currentPage && PAGE_TIPS[currentPage]) {
    reply += '\n\n---\n' + PAGE_TIPS[currentPage];
  }

  return { reply, intent };
}
