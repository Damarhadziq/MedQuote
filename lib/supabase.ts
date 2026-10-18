import { createClient } from "@supabase/supabase-js";

const env = (typeof import.meta !== "undefined" ? import.meta.env : undefined) as
  | Record<string, string | undefined>
  | undefined;
const procEnv = (typeof process !== "undefined" ? process.env : undefined) as
  | Record<string, string | undefined>
  | undefined;

const supabaseUrl =
  env?.VITE_SUPABASE_URL ||
  env?.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv?.VITE_SUPABASE_URL ||
  procEnv?.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  env?.VITE_SUPABASE_ANON_KEY ||
  env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv?.VITE_SUPABASE_ANON_KEY ||
  procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
