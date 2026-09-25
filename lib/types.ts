export type Appointment = {
  id: string; title: string; client_first_name: string; client_last_name: string;
  phone?: string | null; start_at: string; duration_minutes: number; price: number;
  notes?: string | null; created_at?: string; updated_at?: string;
};
export const durationOptions = [
  { label: "15 min", value: 15 }, { label: "30 min", value: 30 }, { label: "45 min", value: 45 },
  { label: "1 h", value: 60 }, { label: "1 h 15 min", value: 75 }, { label: "1 h 30 min", value: 90 },
  { label: "2 h", value: 120 }, { label: "2 h 30 min", value: 150 }, { label: "3 h", value: 180 },
];
export const serviceColors: Record<string, string> = {
  Koloryzacja: "#6f4b8b", Balayage: "#a46b45", "Strzyżenie damskie": "#3b7280",
  "Strzyżenie męskie": "#415a77", Modelowanie: "#8b6f47", default: "#665c9a",
};
