import { supabase } from "@/lib/supabase";
import type { Client } from "@/lib/types";

export async function listClients() {
  if (!supabase) return { data: null, error: null };
  return supabase.from("clients").select("*").order("first_name", { ascending: true });
}

export async function upsertClient(input: Pick<Client, "first_name" | "last_name" | "phone">) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from("clients")
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "phone" })
    .select("*")
    .single();
}
