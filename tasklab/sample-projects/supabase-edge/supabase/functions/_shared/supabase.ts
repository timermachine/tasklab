import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// For Edge Functions, Supabase injects these at runtime.
const supabaseUrl = requiredEnv('SUPABASE_URL');
const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
