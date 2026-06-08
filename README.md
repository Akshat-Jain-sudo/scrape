# 🛍️ FlipScrape — Multi-Store Price Comparison Engine

FlipScrape is a full-stack, real-time e-commerce price comparison engine built on **Express** and **React (Vite)**. It aggregates, scrapes, and compares prices across multiple retail categories (Electronics, Fashion, and Quick Commerce/Grocery) in real-time, helping users discover the best deal across platforms.

---

## ✨ Key Features

- ⚡ **Live Comparative Feed**: Preloaded trending product lists that automatically fetch and display side-by-side comparative pricing cards.
- 🏷️ **Store Category Navigation**:
  - **Electronics**: Compares prices across *Flipkart*, *Snapdeal*, and *Croma*.
  - **Fashion**: Compares prices across *Myntra*, *Ajio*, and *Flipkart*.
  - **Quick Commerce / Grocery**: Compares prices and express delivery margins across *Blinkit*, *Swiggy Instamart*, and *Zepto*.
- 🎯 **Best Deal Highlights**: Automatically analyzes retrieved prices and highlights the cheapest option with a glowing pulsing indicator.
- 🔒 **Anti-Block WAF Bypass**: Uses rotating browser signatures and header isolation to navigate strict Web Application Firewalls (e.g., bypassing Flipkart's 403 Forbidden blockers).
- 🧩 **Fail-Safe Mock Fallback**: If a connection times out or is completely blocked by a store's rate limits, the scraper gracefully serves synthesized comparative mock data to keep the UI fully functional.
- 📊 **Insight Hub (Analytics)**: Visualizes data range distributions, store distributions, average price indexes, and maximum discount margins.
- 💾 **CSV & Excel Export**: Download saved catalog results as spreadsheet formats (.csv and .xlsx) styled with custom branding.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), Lucide Icons, Vanilla Glassmorphic CSS
- **Backend**: Node.js, Express, Cheerio (HTML Parsing), Axios (HTTP Client)
- **Data Export**: `json2csv`, `exceljs`
- **Utility**: `concurrently` (multi-process manager)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed on your system.

### One-Click Local Setup
If you are on Windows, simply double-click the launcher shortcut:
1. Open the project folder.
2. Double-click **`FlipScrape.lnk`**.
This will automatically verify packages, install missing dependencies, and launch the site.

### Command Line Installation
1. Install all root, client, and server dependencies:
   ```bash
   npm run install:all
   ```
2. Start the development environment (spins up both server and client):
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to:
   - Client Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend Server: [http://localhost:5000](http://localhost:5000)

---

## ☁️ Deployment Guide

FlipScrape is configured to serve static React assets directly from the Express backend in production environments. This allows you to host the entire application as a **single, unified service** (no separate static and api servers required).

### Steps to Deploy (Render, Heroku, Railway, etc.):
1. Point your cloud host to your GitHub repository: `https://github.com/Akshat-Jain-sudo/scrape`
2. Configure the following build parameters:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Port**: Set by the platform environment (`process.env.PORT`)
3. The build script will automatically:
   - Install root, server, and client dependencies.
   - Run Vite to compile the client-side files to `/client/dist`.
   - Serve the frontend files from the Express app origin relative directory.
