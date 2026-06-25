import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}

export function LocationProvider({ children }) {
  // Initialize from localStorage or default
  const [location, setLocationState] = useState(() => {
    const saved = localStorage.getItem('flipscrape_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved location', e);
      }
    }
    // Default location
    return {
      lat: 28.7041,
      lng: 77.1025,
      locality: 'Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '',
      displayLabel: 'Delhi'
    };
  });

  // Sync to localStorage whenever location changes
  const setLocation = (newLocation) => {
    setLocationState(newLocation);
    localStorage.setItem('flipscrape_location', JSON.stringify(newLocation));
  };

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}
