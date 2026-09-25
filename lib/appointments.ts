import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/lib/types";

export async function listAppointments() {
  if (!supabase) return { data: null, error: null };
  return supabase.from("appointments").select("*").order("start_at", { ascending: true });
}

export async function saveAppointment(appointment: Appointment) {
  if (!supabase) return { error: null };
  const { error } = await supabase.from("appointments").upsert(appointment);
  return { error };
}

export async function deleteAppointment(id: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  return { error };
}
