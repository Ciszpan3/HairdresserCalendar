import { z } from "zod";
export const appointmentSchema = z.object({
  title: z.string().min(1, "Podaj nazwę usługi"), client_first_name: z.string().min(1, "Podaj imię"),
  client_last_name: z.string().min(1, "Podaj nazwisko"), phone: z.string().optional(), date: z.string().min(1),
  time: z.string().min(1), duration_minutes: z.coerce.number().min(15), custom_duration: z.coerce.number().optional(),
  price: z.coerce.number().min(0, "Cena nie może być ujemna"), notes: z.string().optional(),
});
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
