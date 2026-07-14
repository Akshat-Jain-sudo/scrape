import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  profile: null,
  preferences: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  updatePreferences: async () => {},
});

export function AuthProvider({ children }) {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase client
  useEffect(() => {
    let active = true;
    async function init() {
      const client = await getSupabaseClient();
      if (!active) return;
      if (client) {
        setSupabase(client);
        
        // Get initial session
        const { data: { session: initialSession } } = await client.auth.getSession();
        if (active) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await fetchUserData(client, initialSession.user.id);
          }
          setLoading(false);
        }

        // Listen for changes
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, currentSession) => {
          if (!active) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            await fetchUserData(client, currentSession.user.id);
          } else {
            setProfile(null);
            setPreferences(null);
          }
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        if (active) setLoading(false);
      }
    }
    init();
    return () => { active = false; };
  }, []);

  const fetchUserData = async (client, userId) => {
    try {
      // Fetch public.profiles
      const { data: prof, error: profErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!profErr) setProfile(prof);

      // Fetch public.user_preferences
      const { data: pref, error: prefErr } = await client
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!prefErr) setPreferences(pref);
    } catch (e) {
      console.error('Error fetching user data:', e);
    }
  };

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setProfile(null);
    setPreferences(null);
  };

  const updateProfile = async (updates) => {
    if (!supabase || !user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  const updatePreferences = async (updates) => {
    if (!supabase || !user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setPreferences(data);
    
    // Dynamically apply selected theme to document
    if (updates.theme) {
      document.body.className = `theme-${updates.theme}`;
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      preferences,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
