import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseConfigError = !supabaseUrl || !supabaseServiceKey
  ? 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  : null;

if (supabaseConfigError) {
  console.warn(`[SUPABASE] ${supabaseConfigError}. Supabase-backed endpoints will be unavailable.`);
}

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

export const supabaseReady = !supabaseConfigError;
export const supabaseError = supabaseConfigError;