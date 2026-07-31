import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ProfileContext = createContext({
  profile: null,
  loading: true,
  activePerksCount: 0,
  saveProfile: async () => {},
  refreshProfile: async () => {},
});

// Available membership definitions for UI rendering
export const MEMBERSHIP_OPTIONS = [
  { key: 'amazonPrime', label: 'Amazon Prime', icon: '📦', color: '#ff9900', stores: ['amazon', 'amazonfresh'] },
  { key: 'flipkartPlus', label: 'Flipkart Plus', icon: '⚡', color: '#2874f0', stores: ['flipkart', 'fkminutes', 'shopsy'] },
  { key: 'zomatoGold', label: 'Zomato Gold', icon: '🍽️', color: '#e23744', stores: ['zomato'] },
  { key: 'swiggyOne', label: 'Swiggy One', icon: '🧡', color: '#fc8019', stores: ['swiggy', 'instamart'] },
  { key: 'blinkitPass', label: 'Blinkit Pass', icon: '⚡', color: '#f8cb00', stores: ['blinkit'] },
];

export const BANK_CARD_OPTIONS = [
  'HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'AMEX', 'Citi', 'YES', 'IDFC', 'IndusInd', 'BOB', 'Federal', 'AU', 'RBL'
];

export const DIETARY_OPTIONS = [
  { key: 'any', label: 'All Food', icon: '🍽️' },
  { key: 'veg', label: 'Vegetarian', icon: '🥬' },
  { key: 'jain', label: 'Jain', icon: '🌿' },
  { key: 'eggetarian', label: 'Eggetarian', icon: '🥚' },
  { key: 'nonveg', label: 'Non-Veg', icon: '🍗' },
];

export function ProfileProvider({ children }) {
  const { session, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Also cache in localStorage for faster hydration
        localStorage.setItem('symbiote_user_profile', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // Attempt loading from localStorage cache
      const cached = localStorage.getItem('symbiote_user_profile');
      if (cached) {
        try { setProfile(JSON.parse(cached)); } catch (e) { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const saveProfile = useCallback(async (updates) => {
    try {
      const merged = { ...profile, ...updates };
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(merged)
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        localStorage.setItem('symbiote_user_profile', JSON.stringify(data.profile));
        return data.profile;
      }
      return null;
    } catch (err) {
      console.error('Failed to save user profile:', err);
      return null;
    }
  }, [profile, getAuthHeaders]);

  // Load profile on mount and auth change
  useEffect(() => {
    refreshProfile();
  }, [user, refreshProfile]);

  // Compute active perks count
  const activePerksCount = (() => {
    if (!profile) return 0;
    const memberships = profile.memberships || {};
    const bankCards = profile.bankCards || [];
    const activeMemberships = Object.values(memberships).filter(Boolean).length;
    return activeMemberships + bankCards.length;
  })();

  return (
    <ProfileContext.Provider value={{
      profile,
      loading,
      activePerksCount,
      saveProfile,
      refreshProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
