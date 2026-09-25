import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const url = viteEnv?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = viteEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || viteEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key && !url.endsWith("/rest/v1/") && !url.endsWith("/rest/v1"));
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, key!) : null;
