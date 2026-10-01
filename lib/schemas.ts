import { z } from "zod";
export const appointmentSchema = z.object({
  title: z.string().min(1, "Podaj nazwę usługi"), client_first_name: z.string().min(1, "Podaj imię"),
  client_last_name: z.string().optional(),
  phone: z.string().optional().refine((value) => !value || value.replace(/\D/g, "").length === 9, "Numer telefonu musi mieć dokładnie 9 cyfr"), date: z.string().min(1),
  time: z.string().min(1), duration_hours: z.coerce.number().int().min(0).max(12), duration_extra_minutes: z.coerce.number().int().min(0).max(59),
  price: z.coerce.number().min(0, "Cena nie może być ujemna"), notes: z.string().optional(),
}).refine((value) => value.duration_hours * 60 + value.duration_extra_minutes >= 15, {
  message: "Wizyta musi trwać co najmniej 15 minut",
  path: ["duration_extra_minutes"],
});
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
