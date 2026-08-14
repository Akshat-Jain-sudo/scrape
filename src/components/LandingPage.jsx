import React, { useState, useEffect, useRef, useCallback } from 'react';
import SymbioteLogo from './SymbioteLogo';
import '../landing.css';

/* ──────────────────────────────────────────────────────────────
   Intersection Observer hook for scroll-reveal animations
   ────────────────────────────────────────────────────────────── */
function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

/* helper: scroll to section by id */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ══════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function LandingPage({ onOpenAuth }) {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Sticky nav effect */
  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCTA = useCallback((mode) => {
    if (onOpenAuth) onOpenAuth(mode);
  }, [onOpenAuth]);

  /* Section reveal refs */
  const [whatRef, whatVisible] = useScrollReveal();
  const [stepsRef, stepsVisible] = useScrollReveal();
  const [featuresRef, featuresVisible] = useScrollReveal();
  const [benefitsRef, benefitsVisible] = useScrollReveal();
  const [timeRef, timeVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [whyRef, whyVisible] = useScrollReveal();
  const [trustRef, trustVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  return (
    <div className="landing-page">
      {/* Ambient background */}
      <div className="lp-ambient">
        <div className="lp-ambient-orb lp-ambient-orb--1" />
        <div className="lp-ambient-orb lp-ambient-orb--2" />
        <div className="lp-ambient-orb lp-ambient-orb--3" />
      </div>
      <div className="lp-grid-pattern" />

      {/* ═══ NAVBAR ═══ */}
      <nav className={`lp-nav ${navScrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <SymbioteLogo size={30} />
            <span>symbiote</span>
          </div>

          <ul className={`lp-nav-links ${mobileMenuOpen ? 'lp-nav-links--open' : ''}`}>
            <li><button className="lp-nav-link" onClick={() => { scrollTo('how-it-works'); setMobileMenuOpen(false); }}>How It Works</button></li>
            <li><button className="lp-nav-link" onClick={() => { scrollTo('features'); setMobileMenuOpen(false); }}>Features</button></li>
            <li><button className="lp-nav-link" onClick={() => { scrollTo('benefits'); setMobileMenuOpen(false); }}>Benefits</button></li>
            <li><button className="lp-nav-link" onClick={() => { scrollTo('stats'); setMobileMenuOpen(false); }}>Impact</button></li>
            <li><button className="lp-nav-link" onClick={() => { scrollTo('why-choose'); setMobileMenuOpen(false); }}>Why Symbiote</button></li>
          </ul>

          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn--ghost" onClick={() => handleCTA('login')}>Login</button>
            <button className="lp-btn lp-btn--primary" onClick={() => handleCTA('signup')}>Get Started</button>
          </div>

          <button
            className="lp-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </nav>


      {/* ═══ HERO SECTION ═══ */}
      <section className="lp-section lp-hero">
        <div className="lp-container">
          <div className="lp-hero-content">
            <div className="lp-hero-text">
              <div className="lp-hero-badge">
                <span className="lp-hero-badge-dot" />
                Real-time price intelligence across 15+ stores
              </div>

              <h1>
                Find the <span className="lp-gradient-text">best price</span> for anything, instantly.
              </h1>

              <p className="lp-hero-description">
                Symbiote compares prices across Amazon, Flipkart, Blinkit, Zepto, Swiggy, and more — in real time.
                Stop overpaying. See every price side by side and always get the best deal.
              </p>

              <div className="lp-hero-actions">
                <button className="lp-btn lp-btn--primary lp-btn--large" onClick={() => handleCTA('signup')}>
                  Get Started — It's Free
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <button className="lp-btn lp-btn--secondary lp-btn--large" onClick={() => handleCTA('login')}>
                  Login
                </button>
              </div>

              <div className="lp-hero-meta">
                <div className="lp-hero-meta-item">
                  <strong>15+</strong>
                  <span>Stores compared</span>
                </div>
                <div className="lp-hero-meta-item">
                  <strong>Real-time</strong>
                  <span>Live prices</span>
                </div>
                <div className="lp-hero-meta-item">
                  <strong>Free</strong>
                  <span>No hidden costs</span>
                </div>
              </div>
            </div>

            {/* Hero Visual — Product comparison mock */}
            <div className="lp-hero-visual">
              <div className="lp-hero-visual-card">
                <div className="lp-hero-mock-header">
                  <div className="lp-hero-mock-dots">
                    <span className="lp-hero-mock-dot" />
                    <span className="lp-hero-mock-dot" />
                    <span className="lp-hero-mock-dot" />
                  </div>
                  <div className="lp-hero-mock-url">symbiote.app — price comparison</div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--lp-text-muted)', marginBottom: '0.75rem' }}>
                  🔍 Searching "iPhone 16 128GB" across stores...
                </div>

                <div className="lp-hero-comparison">
                  <div className="lp-hero-store-card">
                    <div className="lp-hero-store-name">Amazon</div>
                    <div className="lp-hero-store-price">₹79,900</div>
                    <div className="lp-hero-store-detail">Free delivery · 2 days</div>
                  </div>
                  <div className="lp-hero-store-card lp-hero-store-card--best">
                    <div className="lp-hero-store-name">Flipkart</div>
                    <div className="lp-hero-store-price">₹76,999</div>
                    <div className="lp-hero-store-detail">Free delivery · 3 days</div>
                    <div className="lp-hero-best-label">✓ Best Price</div>
                  </div>
                  <div className="lp-hero-store-card">
                    <div className="lp-hero-store-name">Croma</div>
                    <div className="lp-hero-store-price">₹81,490</div>
                    <div className="lp-hero-store-detail">₹99 delivery · 4 days</div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="lp-hero-float-badge lp-hero-float-badge--1">
                <div className="lp-hero-float-badge-icon lp-hero-float-badge-icon--green">💰</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--lp-green)' }}>₹4,491 saved</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--lp-text-muted)' }}>vs. highest price</div>
                </div>
              </div>
              <div className="lp-hero-float-badge lp-hero-float-badge--2">
                <div className="lp-hero-float-badge-icon lp-hero-float-badge-icon--blue">⚡</div>
                <div>
                  <div style={{ fontWeight: 600 }}>Compared in 2.4s</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--lp-text-muted)' }}>across 3 stores</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ WHAT IS IT ═══ */}
      <section className="lp-section" id="what-is-it" ref={whatRef}>
        <div className={`lp-container lp-animate ${whatVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">What is Symbiote?</span>
          <h2 className="lp-section-title">
            One search. Every store.<br />Every price. Best deal found.
          </h2>
          <p className="lp-section-subtitle">
            Symbiote is a real-time, multi-store price comparison engine that lets you search for any product and instantly see how it's priced across all major Indian e-commerce, grocery, and food delivery platforms.
          </p>

          <div className="lp-what-grid">
            <div className="lp-what-text">
              <p>
                When you want to buy something online, you currently have to open multiple tabs — Amazon, Flipkart, Blinkit, Zepto, Swiggy — compare prices manually, check delivery fees, and still wonder if you missed a better deal elsewhere.
              </p>
              <p>
                Symbiote eliminates that entire process. Enter what you're looking for, and the platform searches across <strong>15+ stores simultaneously</strong>, presents results side by side, highlights the cheapest option, and even factors in shipping costs and delivery speed.
              </p>
              <p>
                Whether it's electronics, fashion, groceries, or dinner — Symbiote helps you spend less and decide faster.
              </p>
            </div>

            <div className={`lp-what-highlights lp-stagger ${whatVisible ? 'lp-visible' : ''}`}>
              <div className="lp-what-highlight">
                <div className="lp-what-highlight-icon lp-what-highlight-icon--orange">🎯</div>
                <div>
                  <h4>Real-time price aggregation</h4>
                  <p>Live data from Amazon, Flipkart, Snapdeal, JioMart, Myntra, AJIO, Blinkit, Zepto, Swiggy, and more.</p>
                </div>
              </div>
              <div className="lp-what-highlight">
                <div className="lp-what-highlight-icon lp-what-highlight-icon--blue">📊</div>
                <div>
                  <h4>Beyond just price</h4>
                  <p>Compares delivery fees, express delivery times, packaging charges, ratings, and discount percentages.</p>
                </div>
              </div>
              <div className="lp-what-highlight">
                <div className="lp-what-highlight-icon lp-what-highlight-icon--purple">🛒</div>
                <div>
                  <h4>Works across categories</h4>
                  <p>E-commerce, fashion, quick-commerce groceries, and food delivery — all in one place.</p>
                </div>
              </div>
              <div className="lp-what-highlight">
                <div className="lp-what-highlight-icon lp-what-highlight-icon--green">📍</div>
                <div>
                  <h4>Location-aware results</h4>
                  <p>Automatically adapts delivery estimates and store availability based on your city.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ HOW IT WORKS ═══ */}
      <section className="lp-section lp-section-center" id="how-it-works" ref={stepsRef}>
        <div className={`lp-container lp-animate ${stepsVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">How It Works</span>
          <h2 className="lp-section-title">From search to savings in seconds</h2>
          <p className="lp-section-subtitle">
            No sign-up friction, no learning curve. Just search what you want and let Symbiote do the rest.
          </p>

          <div className={`lp-steps lp-stagger ${stepsVisible ? 'lp-visible' : ''}`}>
            <div className="lp-step">
              <div className="lp-step-number"><span className="lp-step-icon">🔍</span></div>
              <h3>Search</h3>
              <p>Type any product name — from iPhones to milk — and select a category (electronics, fashion, grocery, or food).</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number"><span className="lp-step-icon">⚡</span></div>
              <h3>Compare</h3>
              <p>Symbiote queries all relevant stores simultaneously and returns live pricing, delivery details, and ratings.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number"><span className="lp-step-icon">🏷️</span></div>
              <h3>Find the Best Deal</h3>
              <p>The platform automatically highlights the cheapest option with a visual indicator so you don't miss it.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number"><span className="lp-step-icon">🎉</span></div>
              <h3>Save & Track</h3>
              <p>Save products to your library, set price alerts, track price history, and export data anytime.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ KEY FEATURES ═══ */}
      <section className="lp-section" id="features" ref={featuresRef}>
        <div className={`lp-container lp-animate ${featuresVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">Key Features</span>
          <h2 className="lp-section-title">Everything you need to shop smarter</h2>
          <p className="lp-section-subtitle">
            A complete toolkit designed to eliminate overpaying and simplify purchase decisions across every product category.
          </p>

          <div className={`lp-features-grid lp-stagger ${featuresVisible ? 'lp-visible' : ''}`}>
            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--orange">⚡</div>
              <h3>Real-Time Price Comparison</h3>
              <p>Search once and get live pricing from Amazon, Flipkart, Snapdeal, JioMart, Blinkit, Zepto, Swiggy, and more — all on one screen.</p>
              <div className="lp-feature-benefit">→ Never overpay again</div>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--green">🛒</div>
              <h3>Cart Optimizer</h3>
              <p>Add multiple grocery items and let Symbiote calculate the cheapest store for your entire cart, including delivery and packaging fees.</p>
              <div className="lp-feature-benefit">→ Minimize total grocery spend</div>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--blue">📉</div>
              <h3>Price History & Alerts</h3>
              <p>Track how prices change over time with visual charts. Set target prices and get notified when a product drops below your threshold.</p>
              <div className="lp-feature-benefit">→ Buy at the right moment</div>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--purple">📊</div>
              <h3>Analytics Dashboard</h3>
              <p>See store-wise price distributions, rating analysis, discount trends, and a delivery speed vs. cost matrix to understand market pricing.</p>
              <div className="lp-feature-benefit">→ Make data-driven decisions</div>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--teal">🚀</div>
              <h3>Scrape Console</h3>
              <p>Power users can run bulk searches with a terminal-style interface, process multiple pages, and export product catalogs as CSV or Excel.</p>
              <div className="lp-feature-benefit">→ Scale your research instantly</div>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-feature-icon--red">📍</div>
              <h3>Location Intelligence</h3>
              <p>Automatic GPS-based city detection adjusts delivery estimates, shipping fees, and store availability for your specific location.</p>
              <div className="lp-feature-benefit">→ See accurate local pricing</div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ HOW IT HELPS ═══ */}
      <section className="lp-section lp-section-center" id="benefits" ref={benefitsRef}>
        <div className={`lp-container lp-animate ${benefitsVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">How It Helps You</span>
          <h2 className="lp-section-title">Spend less time comparing, more time doing</h2>
          <p className="lp-section-subtitle">
            Symbiote removes the tedious parts of online shopping so you can focus on what matters — getting the best value for your money.
          </p>

          <div className={`lp-benefits-grid lp-stagger ${benefitsVisible ? 'lp-visible' : ''}`}>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">🚫</div>
              <h4>No more tab-switching</h4>
              <p>Stop opening 5 different store websites just to compare one product.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">⏱️</div>
              <h4>Instant answers</h4>
              <p>Get comparison results in seconds instead of spending minutes on each store.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">💸</div>
              <h4>Real savings</h4>
              <p>The cheapest option is highlighted automatically — no mental math required.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">🎯</div>
              <h4>Complete picture</h4>
              <p>See price, delivery cost, speed, ratings, and discounts side by side.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">📦</div>
              <h4>Smart grocery shopping</h4>
              <p>Build a full cart list and optimize across Blinkit, Zepto, BigBasket, and more.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">🔔</div>
              <h4>Never miss a price drop</h4>
              <p>Set target prices and get visual alerts when products reach your ideal price.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">📋</div>
              <h4>Export & organize</h4>
              <p>Download your research as CSV or styled Excel spreadsheets for later reference.</p>
            </div>
            <div className="lp-benefit-item">
              <div className="lp-benefit-emoji">🧠</div>
              <h4>Better decisions</h4>
              <p>Analytics and price history help you understand pricing patterns before you buy.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ TIME SAVED — BEFORE vs AFTER ═══ */}
      <section className="lp-section" id="time-saved" ref={timeRef}>
        <div className={`lp-container lp-animate ${timeVisible ? 'lp-visible' : ''}`}>
          <div className="lp-section-center">
            <span className="lp-section-label">Time Saved</span>
            <h2 className="lp-section-title">Stop wasting time. Start saving money.</h2>
            <p className="lp-section-subtitle">
              See the difference between manually comparing prices and letting Symbiote do it for you.
            </p>
          </div>

          <div className="lp-time-comparison">
            {/* BEFORE */}
            <div className="lp-time-card lp-time-card--before">
              <div className="lp-time-card-label">❌ Manual Process</div>
              <ul className="lp-time-steps-list">
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">1</span>
                  Open Amazon, search product
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">2</span>
                  Open Flipkart, repeat search
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">3</span>
                  Open Snapdeal, JioMart, Croma...
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">4</span>
                  Compare prices manually
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">5</span>
                  Factor in delivery costs
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">6</span>
                  Decide and hope you didn't miss a deal
                </li>
              </ul>
              <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--lp-red)', fontWeight: 600 }}>
                ⏱ Estimated: 10–20 minutes per product
              </div>
            </div>

            {/* VS */}
            <div className="lp-time-vs">
              <div className="lp-time-vs-badge">VS</div>
              <div className="lp-time-vs-text">Compare</div>
            </div>

            {/* AFTER */}
            <div className="lp-time-card lp-time-card--after">
              <div className="lp-time-card-label">✓ With Symbiote</div>
              <ul className="lp-time-steps-list">
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">1</span>
                  Type your product name
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">2</span>
                  View all prices side by side
                </li>
                <li className="lp-time-step-item">
                  <span className="lp-time-step-bullet">3</span>
                  Click the best deal
                </li>
              </ul>
              <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--lp-green)', fontWeight: 600 }}>
                ⚡ Estimated: under 30 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ STATISTICS ═══ */}
      <section className="lp-section lp-section-center" id="stats" ref={statsRef}>
        <div className={`lp-container lp-animate ${statsVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">Impact</span>
          <h2 className="lp-section-title">Measurable results</h2>
          <p className="lp-section-subtitle">
            Placeholder metrics below — replace with verified data as it becomes available.
          </p>

          <div className={`lp-stats-grid lp-stagger ${statsVisible ? 'lp-visible' : ''}`}>
            <div className="lp-stat-card">
              <div className="lp-stat-value">[XX%]</div>
              <div className="lp-stat-label">Average savings vs. single-store shopping</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value">15+</div>
              <div className="lp-stat-label">Stores compared simultaneously</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value">[X hrs]</div>
              <div className="lp-stat-label">Average time saved per month per user</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-value">[XX%]</div>
              <div className="lp-stat-label">Reduction in manual comparison effort</div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ WHY CHOOSE SYMBIOTE ═══ */}
      <section className="lp-section" id="why-choose" ref={whyRef}>
        <div className={`lp-container lp-animate ${whyVisible ? 'lp-visible' : ''}`}>
          <div className="lp-section-center">
            <span className="lp-section-label">Why Symbiote</span>
            <h2 className="lp-section-title">Built for smart shoppers</h2>
            <p className="lp-section-subtitle">
              A clear, focused tool designed to solve one problem well — helping you find the best price without the hassle.
            </p>
          </div>

          <div className={`lp-why-grid lp-stagger ${whyVisible ? 'lp-visible' : ''}`}>
            <div className="lp-why-card">
              <div className="lp-why-icon">💡</div>
              <div>
                <h4>Simple & Focused</h4>
                <p>Search, compare, decide. No bloat, no unnecessary features. Just the information you need.</p>
              </div>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">⚡</div>
              <div>
                <h4>Fast Results</h4>
                <p>Real-time scraping returns comparison data in seconds, not minutes.</p>
              </div>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">🤖</div>
              <div>
                <h4>Automated Intelligence</h4>
                <p>Best deal highlighting, cart optimization, and price alerts work automatically.</p>
              </div>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">📊</div>
              <div>
                <h4>Complete Data</h4>
                <p>Not just price — delivery fees, speed, ratings, discounts, and historical trends.</p>
              </div>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">🌍</div>
              <div>
                <h4>Location Aware</h4>
                <p>Results adapt to your city for accurate delivery estimates and availability.</p>
              </div>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">🔓</div>
              <div>
                <h4>Free to Use</h4>
                <p>No subscriptions, no hidden fees. Start comparing prices immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-divider" />


      {/* ═══ TRUST / CREDIBILITY ═══ */}
      <section className="lp-section lp-section-center" ref={trustRef}>
        <div className={`lp-container lp-animate ${trustVisible ? 'lp-visible' : ''}`}>
          <span className="lp-section-label">Built With Trust</span>
          <h2 className="lp-section-title">Transparent. Open-source. Community-driven.</h2>
          <p className="lp-section-subtitle">
            Symbiote is an open-source project built with transparency. No hidden tracking, no affiliate manipulation — just honest price comparison.
          </p>

          <div className="lp-trust-items">
            <div className="lp-trust-item">
              <div className="lp-trust-icon">🔒</div>
              <span>No data sold to third parties</span>
            </div>
            <div className="lp-trust-item">
              <div className="lp-trust-icon">🌐</div>
              <span>Open-source on GitHub</span>
            </div>
            <div className="lp-trust-item">
              <div className="lp-trust-icon">⚙️</div>
              <span>Self-hostable architecture</span>
            </div>
            <div className="lp-trust-item">
              <div className="lp-trust-icon">🛡️</div>
              <span>No affiliate link manipulation</span>
            </div>
          </div>
        </div>
      </section>


      {/* ═══ FINAL CTA ═══ */}
      <section className="lp-section lp-cta-section" ref={ctaRef}>
        <div className={`lp-container lp-animate ${ctaVisible ? 'lp-visible' : ''}`}>
          <div className="lp-cta-card">
            <h2>Ready to stop overpaying?</h2>
            <p>
              Start comparing prices across 15+ stores in seconds. Free forever — no credit card needed.
            </p>
            <div className="lp-cta-actions">
              <button className="lp-btn lp-btn--primary lp-btn--large" onClick={() => handleCTA('signup')}>
                Get Started — It's Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
              <button className="lp-btn lp-btn--secondary lp-btn--large" onClick={() => handleCTA('login')}>
                Login to Your Account
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-logo">
              <SymbioteLogo size={22} />
              <span>symbiote</span>
            </div>

            <p className="lp-footer-text">
              Multi-store price comparison engine. Built in India 🇮🇳
            </p>

            <ul className="lp-footer-links">
              <li><a href="https://github.com/Akshat-Jain-sudo/scrape" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>How It Works</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
