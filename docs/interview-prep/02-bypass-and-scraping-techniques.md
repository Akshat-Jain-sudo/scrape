# How the Project Bypasses Website Blocking & Fetches Results

> **Quick Reference:** This document is a focused breakdown of all anti-bot and scraping techniques used in the project. For the full backend reference, see `01-complete-backend-deep-dive.md`.

---

## Overview — Two Modes of Bypassing

| Mode | Tool Used | Purpose | Files |
|------|-----------|---------|-------|
| **Passive Scraping** | Axios + Cheerio | Read prices, names, images | `scraper.js` |
| **Active Automation** | Playwright (Chromium) | Login, add-to-cart, checkout | `automator/` |

---

## Part A — Passive Scraping Bypass (HTTP-Level)

### 1. User-Agent Rotation

**Why:** Servers track the `User-Agent` header. If 500 requests come from the exact same browser signature in an hour, the IP gets blocked.

**How:** A pool of **7 real User-Agent strings** spanning Chrome, Firefox, Safari, and Edge across Windows, Mac, and Linux. `getRandomUserAgent()` picks a random one per request.

```javascript
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  // ... 7 total
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

**How to explain in interview:**
> "We maintain a rotating pool of real browser fingerprints. Each HTTP request picks a random User-Agent, preventing the server from clustering our requests as bot traffic."

---

### 2. HTTP Header Spoofing & Selective Stripping

**Why:** WAFs (Cloudflare, Akamai) inspect the *combination* of headers, not just User-Agent. Bots typically send headers that real browsers don't.

**How:** We set realistic `Accept`, `Accept-Language`, and `Accept-Encoding` headers, but **deliberately omit** `Cache-Control` and `Upgrade-Insecure-Requests` — these were found to trigger Flipkart's WAF.

```javascript
function getHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
    // INTENTIONALLY REMOVED: 'Cache-Control', 'Upgrade-Insecure-Requests'
    // Reason: Flipkart returns 403 Forbidden when these are present
  };
}
```

**How to explain in interview:**
> "Through trial and error, we discovered that including `Cache-Control` in the headers triggered Flipkart's WAF. By selectively stripping those headers while keeping a realistic `Accept` chain, our requests pass as normal browser traffic."

---

### 3. Jittered Exponential Backoff

**Why:** Even with perfect headers, sending too many requests too fast triggers HTTP 429 (rate limiting).

**How:** The `fetchWithRetry()` function retries failed requests with exponentially increasing delays, plus random noise (jitter):

```
Wait = 2^attempt × 1000ms + Math.random() × 1000ms
```

| Attempt | Base Delay | With Jitter |
|---------|-----------|-------------|
| 1       | 2000ms    | 2000–3000ms |
| 2       | 4000ms    | 4000–5000ms |
| 3 (final) | THROW   | — |

**Why jitter matters:**
Without jitter, retry at exactly 2s, 4s, 8s creates a predictable mathematical pattern — which is how bots retry. Adding random noise makes the pattern indistinguishable from a human clicking "refresh" on a slow page.

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { headers: getHeaders(), timeout: 10000 });
    } catch (error) {
      if (attempt === maxRetries) throw new Error(`Failed after ${maxRetries} attempts`);
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}
```

**How to explain in interview:**
> "We use exponential backoff with random jitter to handle rate limiting. The jitter prevents the thundering herd problem and makes our retry pattern statistically indistinguishable from human behavior."

---

### 4. Adaptive CSS Selector Fallback Chains

**Why:** E-commerce sites change their CSS class names frequently (Flipkart does it almost weekly) specifically to break scrapers.

**How:** Every data extraction call accepts an **array of CSS selectors** and tries them in order:

```javascript
function extractText($, el, selectors) {
  for (const selector of selectors) {
    const found = $(el).find(selector);
    if (found.length > 0) {
      const text = found.first().text().trim();
      if (text) return text;
    }
  }
  return null;
}

// Price extraction — tries 3 class names:
const price = cleanPrice(extractText($, el, ['.hZ3P6w', '.Nx9bqj', '._30jeq3']));

// Title extraction:
const title = extractText($, el, ['.KzDlHZ', '.IRpwTa', '._4rR01T', 'a.s1Q9rs']);
```

**How to explain in interview:**
> "Our selector chains act as a version-tolerant parser. When Flipkart renames a CSS class in a UI update, our scraper degrades gracefully to the next selector in the chain instead of breaking entirely."

---

### 5. Product Card Container Auto-Detection

**Why:** The outer container div also changes class names.

**How:** The scraper tries **6 different container patterns** and uses whichever returns results:

```javascript
const productCardSelectors = [
  'div[data-id]',
  'div._1AtVbE div._13ber2',
  'div._1xHGtK._373qXS',
  'div._2kHMtA',
  'div.tUxRFH',
  'div.slAVV4'
];
```

---

### 6. Image Proxy — Bypassing CDN Hotlink Protection

**Why:** When our frontend tries to display product images directly, the CDN blocks the request because the `Referer` doesn't match their domain.

**How:** The `/api/proxy-image` endpoint acts as a reverse proxy:

```
Frontend → GET /api/proxy-image?url=https://flipkart.com/image.jpg
  → Server fetches the image with spoofed headers
  → Server forwards raw bytes to frontend
```

Key trick — the `Referer` header is set to match the source domain:

```javascript
headers: {
  'Referer': url.includes('flipkart') ? 'https://www.flipkart.com/' : 'https://www.snapdeal.com/',
  'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
}
```

Also caches responses for 24 hours (`Cache-Control: public, max-age=86400`).

---

## Part B — Active Automation Bypass (Browser-Level)

Used by the **Playwright Order Automator** when the system needs to actually log in, add items to cart, and checkout.

### 7. Disabling the WebDriver Flag

**Why:** All headless browsers set `navigator.webdriver = true` by default. Amazon/Flipkart's JavaScript detects this immediately and shows a CAPTCHA.

**How:** Launch Chromium with the `AutomationControlled` flag disabled:

```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled'  // ← strips navigator.webdriver
  ]
});
```

**How to explain in interview:**
> "We disable Blink's AutomationControlled feature, which strips the `navigator.webdriver` property. This is the single most common detection vector for headless browsers."

---

### 8. Browser Fingerprint Mimicry

**Why:** Even without `navigator.webdriver`, sites cross-reference timezone, locale, and viewport with the IP address geolocation. A mismatch (e.g., Indian IP + UTC timezone) triggers fraud detection.

**How:** The browser context is configured to match an Indian user:

```javascript
const context = await browser.newContext({
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
});
```

---

### 9. Graceful CAPTCHA/OTP Yielding

**Why:** Sometimes, despite all evasion, the site still throws a CAPTCHA or OTP challenge. A brittle bot would crash here.

**How:** The automator detects challenge pages by URL pattern matching:

```javascript
const currentUrl = page.url();
if (currentUrl.includes('ap/cvf') || currentUrl.includes('ap/mfa') || currentUrl.includes('ap/challenge')) {
  return { status: 'needs_otp', steps, message: 'OTP or CAPTCHA required.' };
}
```

It then:
1. Updates the session status to `needs_otp`
2. Takes a screenshot of the current browser state
3. Sends the screenshot to the frontend via the polling API
4. **Pauses and waits** for the user to manually complete the challenge

**How to explain in interview:**
> "Our system is designed for graceful degradation. If hard anti-bot measures are triggered, we don't crash — we yield control to the user, take a screenshot of the current state, and resume automation after they complete the challenge."

---

## Part C — The Complete Scraping Pipeline

### Flipkart Live Scraping Flow

```
1. Build URL → https://www.flipkart.com/search?q=<query>&page=<n>
2. fetchWithRetry(url) → with rotated User-Agent + stripped headers
3. Load HTML → cheerio.load(html)
4. Detect product cards → try 6 container selectors
5. For each card:
   a. Extract title → try ['.KzDlHZ', '.IRpwTa', '._4rR01T'] selectors
   b. Extract price → cleanPrice(text) → strips ₹, commas → float
   c. Extract rating → cleanRating(text) → "4.3 out of 5" → 4.3
   d. Extract reviews → cleanReviewCount(text) → "1,234 Ratings" → 1234
   e. Extract image → src or data-src attribute
   f. Build product link → prepend "https://www.flipkart.com"
6. Deduplicate → Set keyed by `{source}-{name.toLowerCase()}`
7. Find bestPriceDeal → linear scan for lowest price > 0
8. Return normalized product array
```

### Snapdeal Specific Parsing

Snapdeal uses **CSS width for star ratings** instead of text:

```javascript
// The filled-stars div has: style="width: 86%"
// 100% = 5 stars, so: 86 / 20 = 4.3 stars
const widthStr = $(el).find('.rating-stars .filled-stars').attr('style');
const ratingMatch = widthStr ? widthStr.match(/width:\s*([\d.]+)%/) : null;
const rating = ratingMatch ? parseFloat((parseFloat(ratingMatch[1]) / 20).toFixed(1)) : null;
```

### Data Cleaning Helper Functions

| Function | Input | Output |
|----------|-------|--------|
| `cleanPrice()` | `"₹12,999.00"` | `12999` |
| `cleanRating()` | `"4.3 out of 5 stars"` | `4.3` |
| `cleanReviewCount()` | `"1,234 Ratings & 567 Reviews"` | `{ ratings: 1234, reviews: 567 }` |
| `cleanDiscount()` | `"23% off"` | `23` |

---

## Summary — Bypass Techniques at a Glance

| # | Technique | Layer | Target |
|---|-----------|-------|--------|
| 1 | User-Agent Rotation | HTTP | Fingerprint clustering |
| 2 | Header Stripping | HTTP | WAF pattern matching |
| 3 | Exponential Backoff + Jitter | HTTP | Rate limiting (429) |
| 4 | CSS Selector Chains | DOM | Class name changes |
| 5 | Container Auto-Detection | DOM | Layout changes |
| 6 | Image Referer Spoofing | CDN | Hotlink protection |
| 7 | WebDriver Flag Removal | Browser | `navigator.webdriver` detection |
| 8 | Fingerprint Mimicry | Browser | Geo/timezone mismatch detection |
| 9 | CAPTCHA Graceful Yielding | Browser | Hard anti-bot challenges |
