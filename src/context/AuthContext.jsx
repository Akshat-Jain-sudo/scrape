import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  profile: null,
  preferences: null,
  signup: async () => {},
  login: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  updatePreferences: async () => {},
});

const TOKEN_KEY = 'symbiote_auth_token';
const USER_KEY = 'symbiote_auth_user';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: get stored auth headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // Fetch user profile from /api/auth/me
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        setUser({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
        });
        setProfile({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
        });
        setPreferences({
          theme: u.theme || 'dark',
          notifications_enabled: u.notifications_enabled !== false,
        });
        // Build session-like object for backward compat
        setSession({
          access_token: localStorage.getItem(TOKEN_KEY),
          user: { id: u.id, email: u.email },
        });
        return true;
      } else {
        // Token invalid or expired — clear auth
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setSession(null);
        setProfile(null);
        setPreferences(null);
        return false;
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      return false;
    }
  }, [getAuthHeaders]);

  // On mount: check for existing token and load user
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetchUserData();
      }
      setLoading(false);
    }
    init();
  }, [fetchUserData]);

  // Sign up with email + password
  const signup = async (email, password, fullName) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    // Store token and user data
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    setUser(data.user);
    setSession({ access_token: data.token, user: data.user });
    setProfile({ id: data.user.id, email: data.user.email, full_name: data.user.full_name });
    setPreferences({ theme: 'dark', notifications_enabled: true });
    
    return data;
  };

  // Login with email + password
  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Store token and user data
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    setUser(data.user);
    setSession({ access_token: data.token, user: data.user });
    
    // Fetch full profile
    await fetchUserData();
    
    return data;
  };

  // Sign out
  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('symbiote_user_profile');
    setUser(null);
    setSession(null);
    setProfile(null);
    setPreferences(null);
  };

  // Update user profile (full_name)
  const updateProfile = async (updates) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    
    setProfile(prev => ({ ...prev, ...data.user }));
    return data.user;
  };

  // Update preferences (theme, notifications)
  const updatePreferences = async (updates) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    
    setPreferences(prev => ({ ...prev, ...updates }));

    // Dynamically apply selected theme to document
    if (updates.theme) {
      document.body.className = `theme-${updates.theme}`;
    }
    return data.user;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      preferences,
      signup,
      login,
      signOut,
      updateProfile,
      updatePreferences,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
