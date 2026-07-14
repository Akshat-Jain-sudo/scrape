import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

// Dynamically fetch config from backend to avoid hardcoding keys or requiring manual Vite env variables
export async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  try {
    const res = await fetch('/api/config/supabase');
    if (!res.ok) throw new Error('Failed to fetch Supabase config');
    const config = await res.json();
    
    if (!config.url || !config.anonKey) {
      throw new Error('Invalid Supabase configuration returned by server');
    }
    
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  } catch (error) {
    console.error('Supabase initialization error:', error);
    return null;
  }
}
