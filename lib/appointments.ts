import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/lib/types";

export async function listAppointments() {
  if (!supabase) return { data: null, error: null };
  return supabase.from("appointments").select("*").order("start_at", { ascending: true });
}

export async function saveAppointment(appointment: Appointment) {
  if (!supabase) return { error: null };
  const basePayload = {
    id: appointment.id,
    title: appointment.title,
    client_first_name: appointment.client_first_name,
    client_last_name: appointment.client_last_name,
    phone: appointment.phone ?? null,
    start_at: appointment.start_at,
    duration_minutes: appointment.duration_minutes,
    price: appointment.price,
    notes: appointment.notes ?? null,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at,
  };
  const payload = appointment.client_id
    ? { ...basePayload, client_id: appointment.client_id }
    : basePayload;
  let { error } = await supabase.from("appointments").upsert(payload);
  if (error && appointment.client_id && /client_id/i.test(error.message)) {
    ({ error } = await supabase.from("appointments").upsert(basePayload));
  }
  if (error) console.error("Supabase appointment save failed", error);
  return { error };
}

export async function deleteAppointment(id: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  return { error };
}
