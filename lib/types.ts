export type Appointment = {
  id: string; title: string; client_first_name: string; client_last_name: string;
  phone?: string | null; start_at: string; duration_minutes: number; price: number;
  notes?: string | null; client_id?: string | null; employee_name?: string | null;
  created_at?: string; updated_at?: string;
};
export type Client = {
  id: string; first_name: string; last_name?: string | null; phone: string;
  created_at?: string; updated_at?: string;
};
export const durationOptions = [
  { label: "15 min", value: 15 }, { label: "30 min", value: 30 }, { label: "45 min", value: 45 },
  { label: "1 h", value: 60 }, { label: "1 h 15 min", value: 75 }, { label: "1 h 30 min", value: 90 },
  { label: "2 h", value: 120 }, { label: "2 h 30 min", value: 150 }, { label: "3 h", value: 180 },
];
