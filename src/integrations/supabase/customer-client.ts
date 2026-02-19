import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Separate Supabase client for customer auth sessions
// Uses a different localStorage key so admin and customer can be logged in simultaneously
export const supabaseCustomer = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: 'customer-auth-token',
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
