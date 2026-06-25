import React, { useState, useCallback } from 'react';
import {
  Car,
  MapPin,
  Navigation,
  Clock,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  Zap,
  Bike,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trophy,
  ArrowRight,
  Sparkles,
  Crosshair,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Goa', 'Kochi', 'Indore', 'Nagpur'
];

const CATEGORY_ICONS = {
  bike: '🏍️',
  auto: '🛺',
  sedan: '🚗',
  suv: '🚙'
};

const CATEGORY_LABELS = {
  bike: 'Bike',
  auto: 'Auto',
  sedan: 'Sedan',
  suv: 'SUV'
};

const PLATFORM_LOGOS = {
  uber: { emoji: '⬛', accent: '#000000' },
  ola: { emoji: '🟢', accent: '#1C8C3B' },
  rapido: { emoji: '🟡', accent: '#FECB2F' },
  indrive: { emoji: '🟩', accent: '#A8E847' },
  blusmart: { emoji: '🔵', accent: '#0066FF' },
  nammayatri: { emoji: '🟢', accent: '#00B562' },
  meru: { emoji: '⚪', accent: '#E0E0E0' }
};

const QUICK_ROUTES = [
  { pickup: 'Airport', drop: 'Bandra', city: 'Mumbai' },
  { pickup: 'Airport', drop: 'Connaught Place', city: 'Delhi' },
  { pickup: 'Airport', drop: 'Koramangala', city: 'Bangalore' },
  { pickup: 'Koregaon Park', drop: 'Hinjewadi', city: 'Pune' },
  { pickup: 'Airport', drop: 'Hitech City', city: 'Hyderabad' },
  { pickup: 'Anna Nagar', drop: 'T Nagar', city: 'Chennai' }
];

// Detect city from coordinates using a rough bounding-box lookup
function detectCityFromCoords(lat, lon) {
  const cities = [
    { name: 'Mumbai', lat: 19.076, lon: 72.877, r: 0.5 },
    { name: 'Delhi', lat: 28.613, lon: 77.209, r: 0.6 },
    { name: 'Bangalore', lat: 12.971, lon: 77.594, r: 0.4 },
    { name: 'Hyderabad', lat: 17.385, lon: 78.486, r: 0.4 },
    { name: 'Chennai', lat: 13.082, lon: 80.270, r: 0.4 },
    { name: 'Pune', lat: 18.520, lon: 73.856, r: 0.3 },
    { name: 'Kolkata', lat: 22.572, lon: 88.363, r: 0.4 },
    { name: 'Ahmedabad', lat: 23.022, lon: 72.571, r: 0.3 },
    { name: 'Jaipur', lat: 26.912, lon: 75.787, r: 0.3 },
    { name: 'Lucknow', lat: 26.846, lon: 80.946, r: 0.3 },
    { name: 'Chandigarh', lat: 30.733, lon: 76.779, r: 0.2 },
    { name: 'Goa', lat: 15.299, lon: 74.123, r: 0.3 },
    { name: 'Kochi', lat: 9.931, lon: 76.267, r: 0.2 },
    { name: 'Indore', lat: 22.719, lon: 75.857, r: 0.2 },
    { name: 'Nagpur', lat: 21.145, lon: 79.088, r: 0.2 }
  ];

  let bestMatch = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lon - c.lon, 2));
    if (dist < c.r && dist < bestDist) {
      bestMatch = c.name;
      bestDist = dist;
    }
  }
  return bestMatch || 'Mumbai';
}

export default function CabCompare() {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState('');

  const handleCompare = useCallback(async (p, d, c) => {
    const pickupVal = p || pickup;
    const dropVal = d || drop;
    const cityVal = c || city;

    if (!pickupVal.trim() || !dropVal.trim()) {
      setError('Please enter both pickup and drop locations');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/cab-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: pickupVal, drop: dropVal, city: cityVal })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to compare fares');
      }

      const data = await res.json();
      setResults(data);
      setExpandedPlatform(data.platforms[0]?.platformId || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pickup, drop, city]);

  const handleQuickRoute = (route) => {
    setPickup(route.pickup);
    setDrop(route.drop);
    setCity(route.city);
    handleCompare(route.pickup, route.drop, route.city);
  };

  const swapLocations = () => {
    setPickup(drop);
    setDrop(pickup);
  };

  // GPS location detection
  const detectMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode using Nominatim (free, no API key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=16`,
            { headers: { 'Accept-Language': 'en' } }
          );
          
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            // Build a readable short address
            const parts = [];
            if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
            if (addr.city_district && !parts.includes(addr.city_district)) parts.push(addr.city_district);
            
            const locationName = parts.length > 0 
              ? parts.join(', ')
              : (addr.road || addr.hamlet || data.display_name?.split(',').slice(0, 2).join(',') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            
            setPickup(locationName);
            setDetectedAddress(locationName);
            
            // Auto-detect city
            const detectedCity = detectCityFromCoords(latitude, longitude);
            setCity(detectedCity);
          } else {
            // Fallback: just use coordinates
            setPickup(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          // Geocoding failed, use coordinates
          const detectedCity = detectCityFromCoords(latitude, longitude);
          setCity(detectedCity);
          setPickup(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Please allow location access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('Failed to detect location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const filteredPlatforms = results?.platforms?.filter(p => {
    if (activeFilter === 'all') return true;
    return p.rides.some(r => r.category === activeFilter);
  }) || [];

  // Count total available rides across all platforms
  const totalAvailable = results?.platforms?.reduce((sum, p) => sum + (p.availableRides || p.rides.length), 0) || 0;
  const totalRides = results?.platforms?.reduce((sum, p) => sum + (p.totalRides || p.rides.length), 0) || 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>
            <Car style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} size={28} />
            Cab Fare Compare
            <span className="header-count-badge" style={{ background: 'linear-gradient(135deg, #F57224, #2874F0)' }}>
              7 Platforms
            </span>
          </h1>
          <p>Compare ride fares across Uber, Ola, Rapido, inDrive, BluSmart & more — with location-aware availability</p>
        </div>
      </div>

      {/* Route Input Section */}
      <div className="glass-card cab-input-section">
        <div className="cab-route-form">
          <div className="cab-location-inputs">
            {/* Pickup */}
            <div className="cab-input-group">
              <div className="cab-input-icon pickup-icon">
                <div className="cab-dot pickup-dot"></div>
              </div>
              <input
                type="text"
                className="cab-input"
                placeholder="Pickup location (e.g., Airport)"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
              />
              {/* GPS Detect Button */}
              <button
                className="cab-gps-btn"
                onClick={detectMyLocation}
                disabled={detectingLocation}
                title="Use my current location"
              >
                {detectingLocation ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <Crosshair size={14} />
                )}
              </button>
            </div>

            {/* Swap Button */}
            <button className="cab-swap-btn" onClick={swapLocations} title="Swap locations">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            {/* Drop */}
            <div className="cab-input-group">
              <div className="cab-input-icon drop-icon">
                <div className="cab-dot drop-dot"></div>
              </div>
              <input
                type="text"
                className="cab-input"
                placeholder="Drop location (e.g., Bandra)"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
              />
            </div>
          </div>

          {/* Detected location indicator */}
          {detectedAddress && (
            <div className="cab-detected-location">
              <Crosshair size={12} />
              <span>Detected: <strong>{detectedAddress}</strong>, {city}</span>
            </div>
          )}

          <div className="cab-controls-row">
            {/* City Selector */}
            <div className="cab-city-select-wrapper">
              <MapPin size={14} className="cab-city-icon" />
              <select
                className="cab-city-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Compare Button */}
            <button
              className="btn btn-primary cab-compare-btn"
              onClick={() => handleCompare()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Compare Fares
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Routes */}
        <div className="cab-quick-routes">
          <span className="cab-quick-label">Quick routes:</span>
          <div className="cab-quick-chips">
            {QUICK_ROUTES.map((route, idx) => (
              <button
                key={idx}
                className="cab-quick-chip"
                onClick={() => handleQuickRoute(route)}
              >
                <Navigation size={10} />
                {route.pickup} → {route.drop}, {route.city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card" style={{ borderLeft: '3px solid var(--danger)', padding: '1rem 1.25rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--danger)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {error}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="spinner-container" style={{ marginTop: '3rem' }}>
          <div className="pulse-spinner"></div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Checking availability at your locations...
          </p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="cab-results" style={{ animation: 'fadeIn 0.4s ease-out' }}>

          {/* Route Info Bar */}
          <div className="cab-route-info glass-card">
            <div className="cab-route-detail">
              <MapPin size={14} style={{ color: '#4CAF50' }} />
              <span>{results.pickup}</span>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              <MapPin size={14} style={{ color: '#F44336' }} />
              <span>{results.drop}</span>
              <span className="cab-city-tag">{results.city}</span>
            </div>
            <div className="cab-route-metrics">
              <span className="cab-metric-badge">
                <Navigation size={12} /> {results.route.distanceFormatted}
              </span>
              <span className="cab-metric-badge">
                <Clock size={12} /> ~{results.route.durationFormatted}
              </span>
              <span className="cab-metric-badge" style={{ color: totalAvailable === totalRides ? '#4CAF50' : '#FF9800' }}>
                <CheckCircle2 size={12} /> {totalAvailable}/{totalRides} rides available
              </span>
              {results.surgeActive && (
                <span className="cab-metric-badge surge-badge">
                  <Zap size={12} /> Surge {results.surgeMultiplier}x
                </span>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="cab-stats-row">
            <div className="glass-card cab-stat-card best-deal">
              <div className="cab-stat-icon">
                <Trophy size={20} />
              </div>
              <div className="cab-stat-content">
                <span className="cab-stat-label">Best Deal</span>
                <span className="cab-stat-value">{results.stats.cheapest?.fare}</span>
                <span className="cab-stat-sub">{results.stats.cheapest?.platform} • {results.stats.cheapest?.rideType}</span>
              </div>
            </div>

            <div className="glass-card cab-stat-card">
              <div className="cab-stat-icon">
                <TrendingDown size={20} />
              </div>
              <div className="cab-stat-content">
                <span className="cab-stat-label">You Save</span>
                <span className="cab-stat-value" style={{ color: '#4CAF50' }}>{results.stats.potentialSavingsFormatted}</span>
                <span className="cab-stat-sub">vs {results.stats.costliest?.platform}</span>
              </div>
            </div>

            <div className="glass-card cab-stat-card">
              <div className="cab-stat-icon">
                <Car size={20} />
              </div>
              <div className="cab-stat-content">
                <span className="cab-stat-label">Avg Fare</span>
                <span className="cab-stat-value">{results.stats.avgFareFormatted}</span>
                <span className="cab-stat-sub">{results.stats.totalPlatforms} platforms</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="cab-filter-tabs">
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'bike', label: 'Bike', icon: '🏍️' },
              { key: 'auto', label: 'Auto', icon: '🛺' },
              { key: 'sedan', label: 'Sedan', icon: '🚗' },
              { key: 'suv', label: 'SUV', icon: '🚙' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`cab-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Platform Cards */}
          <div className="cab-platforms-grid">
            {filteredPlatforms.map((platform, idx) => {
              const logo = PLATFORM_LOGOS[platform.platformId] || { emoji: '🚕', accent: '#888' };
              const isExpanded = expandedPlatform === platform.platformId;
              const isBestDeal = idx === 0;
              const filteredRides = activeFilter === 'all'
                ? platform.rides
                : platform.rides.filter(r => r.category === activeFilter);

              return (
                <div
                  key={platform.platformId}
                  className={`glass-card cab-platform-card ${isBestDeal ? 'cab-best-deal' : ''}`}
                  style={{ animationDelay: `${idx * 80}ms`, borderColor: isBestDeal ? `${logo.accent}44` : undefined }}
                >
                  {/* Platform Header */}
                  <div
                    className="cab-platform-header"
                    onClick={() => setExpandedPlatform(isExpanded ? null : platform.platformId)}
                  >
                    <div className="cab-platform-info">
                      <span
                        className="cab-platform-badge"
                        style={{ background: logo.accent === '#FFFFFF' ? '#333' : logo.accent }}
                      >
                        {platform.platformName.charAt(0)}
                      </span>
                      <div>
                        <h3 className="cab-platform-name">
                          {platform.platformName}
                          {isBestDeal && (
                            <span className="cab-best-label">
                              <Trophy size={11} /> Cheapest
                            </span>
                          )}
                        </h3>
                        <span className="cab-platform-rides-count">
                          {platform.availableRides !== undefined
                            ? `${platform.availableRides}/${platform.totalRides} available at this location`
                            : `${platform.rides.length} ride type${platform.rides.length > 1 ? 's' : ''}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="cab-platform-right">
                      <div className="cab-platform-price">
                        <span className="cab-from-label">from</span>
                        <span className="cab-price-value">{platform.cheapestFareFormatted}</span>
                      </div>
                      <div className="cab-platform-eta">
                        <Clock size={12} />
                        <span>{platform.fastestEta < 999 ? `${platform.fastestEta} min` : 'N/A'}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Ride Types */}
                  {isExpanded && (
                    <div className="cab-rides-list">
                      {filteredRides.map(ride => (
                        <div key={ride.id} className={`cab-ride-row ${ride.isSurging ? 'surging' : ''} ${!ride.available ? 'cab-ride-unavailable' : ''}`}>
                          <div className="cab-ride-left">
                            <span className="cab-ride-category-icon">
                              {CATEGORY_ICONS[ride.category] || '🚗'}
                            </span>
                            <div>
                              <span className="cab-ride-name">
                                {ride.name}
                                {ride.available ? (
                                  <CheckCircle2 size={12} className="cab-avail-icon available" />
                                ) : (
                                  <XCircle size={12} className="cab-avail-icon unavailable" />
                                )}
                              </span>
                              <span className="cab-ride-cat">
                                {ride.available
                                  ? CATEGORY_LABELS[ride.category]
                                  : ride.unavailableReason || 'Not available here'
                                }
                              </span>
                            </div>
                          </div>
                          <div className="cab-ride-right">
                            {ride.available ? (
                              <>
                                <div className="cab-ride-meta">
                                  <span className="cab-ride-eta">
                                    <Clock size={11} /> {ride.eta}
                                  </span>
                                  {ride.isSurging && (
                                    <span className="cab-surge-tag">
                                      <Zap size={10} /> {ride.surgeMultiplier}x
                                    </span>
                                  )}
                                </div>
                                <span className="cab-ride-fare">{ride.fareFormatted}</span>
                              </>
                            ) : (
                              <span className="cab-ride-fare" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unavailable</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Book button — deep link with location baked in */}
                      <a
                        href={platform.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cab-book-btn"
                        style={{ background: logo.accent === '#FFFFFF' ? '#333' : logo.accent }}
                      >
                        Book on {platform.platformName}
                        <ExternalLink size={13} />
                      </a>
                      <span className="cab-deeplink-note">
                        <Info size={10} /> Opens {platform.platformName} with your route pre-filled
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="glass-card cab-comparison-table-wrapper" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <Bike size={18} /> Quick Comparison Table
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="cab-comparison-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Cheapest</th>
                    <th>Fare</th>
                    <th>ETA</th>
                    <th>Availability</th>
                    <th>Surge</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.platforms.map((p, i) => {
                    const logo = PLATFORM_LOGOS[p.platformId] || { accent: '#888' };
                    return (
                      <tr key={p.platformId} className={i === 0 ? 'cab-table-best' : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              className="cab-table-dot"
                              style={{ background: logo.accent === '#FFFFFF' ? '#333' : logo.accent }}
                            ></span>
                            {p.platformName}
                            {i === 0 && <Trophy size={12} style={{ color: '#FFD700' }} />}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.cheapestRideType}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{p.cheapestFareFormatted}</td>
                        <td>{p.fastestEta < 999 ? `${p.fastestEta} min` : 'N/A'}</td>
                        <td>
                          <span style={{
                            color: p.availableRides === p.totalRides ? '#4CAF50' : '#FF9800',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            {p.availableRides !== undefined ? `${p.availableRides}/${p.totalRides}` : 'All'}
                          </span>
                        </td>
                        <td>
                          {p.rides[0]?.isSurging ? (
                            <span className="cab-surge-tag" style={{ fontSize: '0.72rem' }}>
                              <Zap size={9} /> {p.rides[0].surgeMultiplier}x
                            </span>
                          ) : (
                            <span style={{ color: '#4CAF50', fontSize: '0.8rem' }}>Normal</span>
                          )}
                        </td>
                        <td>
                          <a href={p.deepLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }} title={`Open ${p.platformName} with route`}>
                            <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="cab-disclaimer">
            ⓘ Fares are simulated estimates based on publicly known pricing. Actual fares may vary. Links open each platform with your route pre-filled for easy booking.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!results && !loading && !error && (
        <div className="glass-card empty-state" style={{ marginTop: '2rem' }}>
          <Car size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
          <h3>Compare Cab Fares Instantly</h3>
          <p>Enter your pickup & drop locations to compare fares across Uber, Ola, Rapido, BluSmart, inDrive, and more.</p>
          <button
            className="btn btn-secondary"
            onClick={detectMyLocation}
            disabled={detectingLocation}
            style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {detectingLocation ? (
              <><RefreshCw size={14} className="spin" /> Detecting...</>
            ) : (
              <><Crosshair size={14} /> Use My Current Location</>
            )}
          </button>
          <div className="cab-quick-routes" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
            <div className="cab-quick-chips" style={{ justifyContent: 'center' }}>
              {QUICK_ROUTES.slice(0, 3).map((route, idx) => (
                <button
                  key={idx}
                  className="cab-quick-chip"
                  onClick={() => handleQuickRoute(route)}
                >
                  <Navigation size={10} />
                  {route.pickup} → {route.drop}, {route.city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
