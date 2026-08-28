import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
    if (process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
      return import.meta.env.VITE_SUPABASE_URL;
    }
  } catch {}
  return 'https://zmgchehdwvycngptkqnd.supabase.co';
}

function getSupabaseKey(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_PUBLISHABLE_KEY) return process.env.SUPABASE_PUBLISHABLE_KEY;
    if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
    if (process.env.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
    if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY) return process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch {}
  return '';
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

let wsTransport: any = undefined;
if (typeof window === 'undefined') {
  try {
    const wsMod = 'ws';
    wsTransport = require(wsMod);
  } catch {}
}

export const supabase = supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
    })
  : null;

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('nexus_vectors').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
