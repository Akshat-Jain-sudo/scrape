import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Crosshair, Search, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';

export default function LocationBar() {
  const { location, setLocation } = useLocationContext();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatNominatimAddress = (addr) => {
    const locality = addr.neighbourhood || addr.suburb || addr.village || addr.city_district || '';
    const city = addr.city || addr.town || addr.county || addr.state_district || '';
    const state = addr.state || '';
    const pincode = addr.postcode || '';
    
    const parts = [];
    if (locality) parts.push(locality);
    if (city && city !== locality) parts.push(city);
    
    return {
      locality: locality || city || 'Unknown',
      city: city || state || 'Unknown',
      state,
      pincode,
      displayLabel: parts.length > 0 ? parts.join(', ') : 'Unknown Location'
    };
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setDetecting(true);
    setError(null);
    setShowDropdown(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'User-Agent': 'FlipScrape/1.0', 'Accept-Language': 'en' } }
          );
          
          if (!res.ok) throw new Error('Geocoding failed');
          
          const data = await res.json();
          const parsedAddress = formatNominatimAddress(data.address || {});
          
          setLocation({
            lat: latitude,
            lng: longitude,
            ...parsedAddress
          });
          setSearchQuery('');
        } catch (err) {
          console.error(err);
          setError('Failed to resolve location address');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location access denied. Please search manually.');
        } else {
          setError('Failed to detect location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Debounced search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    const debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'FlipScrape/1.0', 'Accept-Language': 'en' } }
        );
        
        if (!res.ok) throw new Error('Search failed');
        
        const data = await res.json();
        const formattedSuggestions = data.map(item => {
          const parsed = formatNominatimAddress(item.address || {});
          return {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            ...parsed,
            rawName: item.display_name
          };
        });
        
        setSuggestions(formattedSuggestions);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
        setError('Search failed. Try again.');
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectLocation = (sug) => {
    setLocation(sug);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="location-bar-container" style={{ position: 'relative', zIndex: 100, marginBottom: '1rem' }} ref={dropdownRef}>
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Current Location Display & Detect Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 auto', minWidth: '250px' }}>
          <div className="location-icon-wrapper" style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.5rem', borderRadius: '50%' }}>
            <MapPin size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Delivering to
            </span>
            <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {location.displayLabel} <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </span>
          </div>
          
          <button 
            className="btn btn-outline" 
            style={{ marginLeft: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.4rem' }}
            onClick={detectLocation}
            disabled={detecting}
          >
            {detecting ? <Loader2 size={14} className="spin" /> : <Crosshair size={14} />}
            Detect
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', flex: '2 1 300px' }}>
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input" 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              placeholder="Search for area, street name..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            />
            {isSearching && (
              <Loader2 size={16} className="spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '300px', overflowY: 'auto' }}>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                  className="location-suggestion-item"
                  onClick={() => handleSelectLocation(sug)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={16} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sug.displayLabel}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {sug.rawName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
}
