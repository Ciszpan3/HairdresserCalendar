"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { deleteAppointment, listAppointments, saveAppointment } from "@/lib/appointments";
import { listClients, upsertClient } from "@/lib/clients";
import { appointmentSchema, type AppointmentFormValues } from "@/lib/schemas";
import { formatServicePrice, getServiceColor, normalizeSearch, services } from "@/lib/services";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { durationOptions, type Appointment, type Client } from "@/lib/types";

type CalendarView = "week" | "day" | "month";
type AppView = CalendarView | "history" | "legend";

const pad = (value: number) => String(value).padStart(2, "0");
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localStart = (date: string, time: string) => `${date}T${time}:00`;
const currency = (value: number) => `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value)} zł`;
const formatDate = (value: string | Date, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) =>
  new Intl.DateTimeFormat("pl-PL", options).format(new Date(value));
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("48") ? digits.slice(2) : digits;
};

const emptyForm = (date: string, time = "09:00"): AppointmentFormValues => ({
  title: "",
  client_first_name: "",
  client_last_name: "",
  phone: "",
  date,
  time,
  duration_hours: 1,
  duration_extra_minutes: 0,
  price: 0,
  notes: "",
});

export default function Home() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<AppView>("week");
  const [modal, setModal] = useState<Appointment | null | false>(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!supabase) {
        if (!cancelled) {
          setAuth(false);
          setToast("Brak konfiguracji Supabase. Uzupełnij .env.local i uruchom aplikację ponownie.");
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setAuth(false);
        return;
      }
      const [appointmentResult, clientResult] = await Promise.all([listAppointments(), listClients()]);
      if (cancelled) return;
      if (appointmentResult.error) setToast("Nie udało się pobrać wizyt z Supabase");
      if (clientResult.error) setToast("Uruchom ponownie db/supabase.sql, aby włączyć bazę klientów");
      setAppointments((appointmentResult.data as Appointment[]) ?? []);
      setClients((clientResult.data as Client[]) ?? []);
      setAuth(true);
    };
    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  if (auth === null) return <div className="grid min-h-screen place-items-center text-slate-500">Ładowanie terminarza…</div>;
  if (!auth) return <Login onLogin={() => setAuth(true)} />;

  const today = isoDate(new Date());
  const weekStart = new Date(selectedDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const dayAppointments = appointments.filter((appointment) => appointment.start_at.slice(0, 10) === isoDate(selectedDate));
  const weekAppointments = appointments.filter((appointment) => {
    const start = new Date(appointment.start_at);
    return start >= days[0] && start < new Date(days[6].getTime() + 86_400_000);
  });
  const visibleAppointments = view === "day" ? dayAppointments : view === "week" ? weekAppointments : appointments;
  const normalizedGlobalSearch = normalizeSearch(search);
  const textResults = normalizedGlobalSearch
    ? appointments.filter((appointment) => normalizeSearch(`${appointment.client_first_name} ${appointment.client_last_name} ${appointment.title} ${appointment.phone ?? ""} ${appointment.notes ?? ""}`).includes(normalizedGlobalSearch)).slice(0, 8)
    : [];

  const changePeriod = (delta: number) => {
    const next = new Date(selectedDate);
    if (view === "month") {
      next.setDate(1);
      next.setMonth(next.getMonth() + delta);
    } else {
      next.setDate(next.getDate() + delta * (view === "week" ? 7 : 1));
    }
    setSelectedDate(next);
  };

  const openNew = (date = isoDate(selectedDate), time = "09:00") => {
    setModal({
      id: "",
      title: "",
      client_first_name: "",
      client_last_name: "",
      phone: null,
      start_at: localStart(date, time),
      duration_minutes: 60,
      price: 0,
      notes: null,
    });
  };

  const persistAppointment = async (appointment: Appointment) => {
    const { error } = await saveAppointment(appointment);
    if (error) {
      setToast("Nie udało się zapisać wizyty w Supabase");
      return false;
    }
    setAppointments((current) => current.some((item) => item.id === appointment.id)
      ? current.map((item) => item.id === appointment.id ? appointment : item)
      : [...current, appointment]);
    return true;
  };

  const handleSave = async (appointment: Appointment) => {
    let clientId = appointment.client_id ?? null;
    let clientSaveFailed = false;
    const phone = normalizePhone(appointment.phone ?? "");
    if (phone && appointment.client_first_name.trim()) {
      const result = await upsertClient({
        first_name: appointment.client_first_name.trim(),
        last_name: appointment.client_last_name.trim() || null,
        phone,
      });
      if (result.error) {
        clientSaveFailed = true;
      } else if (result.data) {
        const savedClient = result.data as Client;
        clientId = savedClient.id;
        setClients((current) => [savedClient, ...current.filter((client) => client.id !== savedClient.id && client.phone !== savedClient.phone)]);
      }
    }

    const saved: Appointment = {
      ...appointment,
      id: appointment.id || crypto.randomUUID(),
      phone: phone || null,
      ...(clientId ? { client_id: clientId } : {}),
      created_at: appointment.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (await persistAppointment(saved)) {
      setModal(false);
      setToast(clientSaveFailed
        ? "Wizyta zapisana, ale klient nie trafił do bazy. Uruchom migrację 002_clients.sql."
        : "Wizyta została zapisana");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAppointment(id);
    if (error) {
      setToast("Nie udało się usunąć wizyty");
      return;
    }
    setAppointments((current) => current.filter((appointment) => appointment.id !== id));
    setModal(false);
    setToast("Wizyta została usunięta");
  };

  const handleMove = async (appointment: Appointment, startAt: string) => {
    const changed = { ...appointment, start_at: startAt, updated_at: new Date().toISOString() };
    if (await persistAppointment(changed)) setToast("Termin wizyty został zmieniony");
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#1c2026]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#665c9a] font-bold text-white">H</div>
          <div><div className="font-semibold tracking-tight">HairdresserCalendar</div><div className="-mt-0.5 text-[11px] text-slate-400">terminarz salonu</div></div>
        </div>
        <div className="relative hidden w-[min(420px,35vw)] md:block">
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj wizyty, klienta…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 outline-none focus:border-[#8d83bd]" />
          {textResults.length > 0 && <SearchDropdown results={textResults} onPick={(appointment) => { setSelectedDate(new Date(appointment.start_at)); setView("day"); setModal(appointment); setSearch(""); }} />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openNew()} className="flex h-10 items-center gap-2 rounded-xl bg-[#665c9a] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#51477f]"><Plus size={17} /><span className="hidden sm:inline">Nowa wizyta</span></button>
          <button onClick={async () => { await supabase?.auth.signOut(); setAuth(false); }} aria-label="Wyloguj" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><LogOut size={17} /></button>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-72px)]">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Workspace</div>
          <Nav active={view !== "history" && view !== "legend"} icon={<CalendarDays size={18} />} label="Kalendarz" onClick={() => setView("week")} />
          <Nav active={view === "history"} icon={<History size={18} />} label="Historia wizyt" onClick={() => setView("history")} />
          <Nav active={view === "legend"} icon={<Palette size={18} />} label="Legenda kolorów" onClick={() => setView("legend")} />
          <div className="mt-auto rounded-2xl bg-[#f0eef8] p-4"><Sparkles size={18} className="mb-3 text-[#665c9a]" /><div className="text-sm font-semibold">Dzień dobry!</div><div className="mt-1 text-xs text-slate-500">Twój terminarz jest gotowy na dziś.</div></div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1480px]">
            {view === "history" && <div className="flex items-start justify-between gap-4 p-4 pb-0 md:p-7 md:pb-0"><div><p className="text-sm text-slate-500">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-[30px]">Historia wizyt</h1></div><button onClick={() => setView("week")} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm md:hidden">Kalendarz</button></div>}
            {view === "history" ? <HistoryView appointments={appointments} onPick={setModal} /> : view === "legend" ? <ServiceLegend /> : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(39,45,58,.03)]">
                <CalendarToolbar selectedDate={selectedDate} view={view} setView={setView} go={changePeriod} onToday={() => setSelectedDate(new Date())} onNew={() => openNew()} />
                <Calendar selectedDate={selectedDate} view={view} days={days} appointments={visibleAppointments} today={today} onNew={openNew} onPick={setModal} onMove={handleMove} />
              </div>
            )}
          </div>
        </main>
      </div>
      {modal !== false && <AppointmentModal initial={modal ?? undefined} selectedDate={selectedDate} clients={clients} onClose={() => setModal(false)} onSave={handleSave} onDelete={handleDelete} />}
      {toast && <div className="fixed bottom-5 right-5 z-[70] max-w-[360px] rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase nie jest skonfigurowany. Uzupełnij .env.local i zrestartuj aplikację.");
      return;
    }
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setError("Nieprawidłowy e-mail lub hasło"); return; }
    onLogin();
  };
  return <div className="grid min-h-screen place-items-center bg-[#f6f7f9] p-4"><div className="w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(46,43,70,.08)]"><div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#665c9a] text-xl font-bold text-white">H</div><h1 className="text-2xl font-bold">HairdresserCalendar</h1><p className="mb-7 mt-2 text-slate-500">Zaloguj się do swojego terminarza.</p><form onSubmit={submit} className="space-y-4"><Field label="E-mail"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="ty@salon.pl" /></Field><Field label="Hasło"><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="••••••••" /></Field>{error && <div className="text-sm text-red-600">{error}</div>}<button className="h-11 w-full rounded-xl bg-[#665c9a] font-semibold text-white">Zaloguj się</button></form><p className="mt-6 text-center text-xs text-slate-400">Logowanie odbywa się przez Supabase Auth.</p></div></div>;
}

function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-[#f0eef8] font-semibold text-[#51477f]" : "text-slate-500 hover:bg-slate-50"}`}>{icon}{label}</button>;
}

function CalendarToolbar({ selectedDate, view, setView, go, onToday, onNew }: { selectedDate: Date; view: CalendarView; setView: (view: CalendarView) => void; go: (delta: number) => void; onToday: () => void; onNew: () => void }) {
  const mondayOffset = (selectedDate.getDay() + 6) % 7;
  const label = view === "day"
    ? formatDate(selectedDate, { day: "numeric", month: "long", year: "numeric" })
    : view === "month"
      ? formatDate(selectedDate, { month: "long", year: "numeric" })
      : `${formatDate(new Date(selectedDate.getTime() - mondayOffset * 86_400_000), { day: "numeric", month: "short" })} – ${formatDate(new Date(selectedDate.getTime() + (6 - mondayOffset) * 86_400_000), { day: "numeric", month: "short", year: "numeric" })}`;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div className="flex items-center gap-2"><button onClick={onToday} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50">Dzisiaj</button><button onClick={() => go(-1)} aria-label="Poprzedni okres" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"><ChevronLeft size={17} /></button><button onClick={() => go(1)} aria-label="Następny okres" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"><ChevronRight size={17} /></button><span className="ml-2 text-sm font-semibold capitalize">{label}</span></div><div className="flex items-center gap-2"><div className="hidden rounded-lg border border-slate-200 p-0.5 sm:flex">{(["day", "week", "month"] as CalendarView[]).map((value) => <button key={value} onClick={() => setView(value)} className={`rounded-md px-3 py-1.5 text-sm ${view === value ? "bg-[#f0eef8] font-semibold text-[#51477f]" : "text-slate-500"}`}>{value === "day" ? "Dzień" : value === "week" ? "Tydzień" : "Miesiąc"}</button>)}</div><button onClick={onNew} className="grid h-9 w-9 place-items-center rounded-lg bg-[#665c9a] text-white sm:flex sm:w-auto sm:items-center sm:px-3"><Plus size={17} /><span className="ml-1 hidden text-sm sm:block">Wizyta</span></button></div></div>;
}

function Calendar({ selectedDate, view, days, appointments, today, onNew, onPick, onMove }: { selectedDate: Date; view: CalendarView; days: Date[]; appointments: Appointment[]; today: string; onNew: (date?: string, time?: string) => void; onPick: (appointment: Appointment) => void; onMove: (appointment: Appointment, start: string) => void }) {
  if (view === "month") return <Month appointments={appointments} selectedDate={selectedDate} onPick={onPick} />;
  const visibleDays = view === "day" ? [selectedDate] : days;
  const columns = `58px repeat(${visibleDays.length}, minmax(100px, 1fr))`;
  return <div className="calendar-scroll h-[calc(100vh-145px)] min-h-[520px] overflow-auto"><div className={view === "week" ? "calendar-grid" : "min-w-[360px]"}><div className="sticky top-0 z-20 grid border-b border-slate-200 bg-white" style={{ gridTemplateColumns: columns }}><div className="h-14" />{visibleDays.map((day) => <div key={isoDate(day)} className={`h-14 border-l border-slate-100 px-2 pt-2 text-center ${isoDate(day) === today ? "bg-[#f3f1fb]" : ""}`}><div className="text-[11px] uppercase text-slate-400">{formatDate(day, { weekday: "short" })}</div><div className={`mt-0.5 text-lg font-bold ${isoDate(day) === today ? "text-[#665c9a]" : ""}`}>{day.getDate()}</div></div>)}</div><div className="grid" style={{ gridTemplateColumns: columns }}><div className="calendar-hours">{Array.from({ length: 18 }, (_, index) => <div key={index} className="-mt-2 h-[60px] pr-2 text-right text-[11px] text-slate-400">{pad(index + 5)}:00</div>)}</div>{visibleDays.map((day) => <DayColumn key={isoDate(day)} day={day} today={today} appointments={appointments.filter((appointment) => appointment.start_at.slice(0, 10) === isoDate(day))} onNew={onNew} onPick={onPick} onMove={onMove} />)}</div></div></div>;
}

type AppointmentLayout = {
  appointment: Appointment;
  column: number;
  columnCount: number;
  groupId: string;
  group: Appointment[];
};

function appointmentMinutes(appointment: Appointment) {
  const start = new Date(appointment.start_at);
  return start.getHours() * 60 + start.getMinutes();
}

function layoutOverlappingAppointments(appointments: Appointment[], date: string): AppointmentLayout[] {
  const sorted = [...appointments].sort((a, b) => appointmentMinutes(a) - appointmentMinutes(b));
  const groups: Appointment[][] = [];
  let current: Appointment[] = [];
  let latestEnd = -1;
  for (const appointment of sorted) {
    const start = appointmentMinutes(appointment);
    const end = start + appointment.duration_minutes;
    if (current.length && start >= latestEnd) {
      groups.push(current);
      current = [];
      latestEnd = -1;
    }
    current.push(appointment);
    latestEnd = Math.max(latestEnd, end);
  }
  if (current.length) groups.push(current);

  return groups.flatMap((group, groupIndex) => {
    const columnEnds: number[] = [];
    const positioned = group.map((appointment) => {
      const start = appointmentMinutes(appointment);
      const freeColumn = columnEnds.findIndex((end) => end <= start);
      const column = freeColumn === -1 ? columnEnds.length : freeColumn;
      columnEnds[column] = start + appointment.duration_minutes;
      return { appointment, column };
    });
    const columnCount = Math.max(1, columnEnds.length);
    const groupId = `${date}-${groupIndex}`;
    return positioned.map(({ appointment, column }) => ({ appointment, column, columnCount, groupId, group }));
  });
}

function DayColumn({ day, today, appointments, onNew, onPick, onMove }: { day: Date; today: string; appointments: Appointment[]; onNew: (date?: string, time?: string) => void; onPick: (appointment: Appointment) => void; onMove: (appointment: Appointment, start: string) => void }) {
  const date = isoDate(day);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 24, y: 160 });
  const layout = useMemo(() => layoutOverlappingAppointments(appointments, date), [appointments, date]);
  const active = layout.find((item) => item.groupId === activeGroup);
  const focusGroup = (groupId: string, x?: number, y?: number) => {
    setActiveGroup(groupId);
    if (x !== undefined && y !== undefined) setPanelPosition({ x, y });
  };
  return <div data-date={date} className={`day-column relative h-[1080px] border-l border-slate-100 ${date === today ? "bg-[#fcfbff]" : ""}`} onMouseMove={(event) => { const target = event.target as HTMLElement; if (target.closest(".overlap-panel")) return; const card = target.closest(".appointment"); if (!card) { setActiveGroup(null); return; } const cardIndex = Array.from(event.currentTarget.querySelectorAll(".appointment")).indexOf(card); if (activeGroup && layout[cardIndex]?.groupId !== activeGroup) setActiveGroup(null); }} onMouseLeave={() => setActiveGroup(null)} onClick={(event) => { if (event.currentTarget !== event.target) return; const rect = event.currentTarget.getBoundingClientRect(); const minutes = Math.max(0, Math.round((((event.clientY - rect.top) / 60) * 60) / 15) * 15); onNew(date, `${pad(5 + Math.floor(minutes / 60))}:${pad(minutes % 60)}`); }}>
    {layout.map((item) => <AppointmentCard key={item.appointment.id} {...item} activeGroup={activeGroup} onGroupFocus={focusGroup} onPick={onPick} onMove={onMove} />)}
    {active && active.group.length > 1 && <OverlapPanel appointments={active.group} position={panelPosition} onPick={onPick} onClose={() => setActiveGroup(null)} />}
  </div>;
}

function AppointmentCard({ appointment, column, columnCount, groupId, group, activeGroup, onGroupFocus, onPick, onMove }: AppointmentLayout & { activeGroup: string | null; onGroupFocus: (groupId: string, x?: number, y?: number) => void; onPick: (appointment: Appointment) => void; onMove: (appointment: Appointment, start: string) => void }) {
  const start = new Date(appointment.start_at);
  const top = (start.getHours() - 5) * 60 + start.getMinutes();
  const dimmed = activeGroup !== null && activeGroup !== groupId;
  return <div draggable onMouseEnter={(event) => group.length > 1 && onGroupFocus(groupId, event.clientX, event.clientY)} onDragEnd={(event) => { const dayColumn = event.currentTarget.parentElement; if (!dayColumn) return; const rect = dayColumn.getBoundingClientRect(); const minutes = Math.max(0, Math.round((((event.clientY - rect.top) / 60) * 60) / 15) * 15); const date = dayColumn.getAttribute("data-date"); if (date) onMove(appointment, localStart(date, `${pad(5 + Math.floor(minutes / 60))}:${pad(minutes % 60)}`)); }} onClick={(event) => { event.stopPropagation(); if (group.length > 1 && window.matchMedia("(hover: none)").matches) { onGroupFocus(groupId); return; } onPick(appointment); }} className={`appointment absolute cursor-pointer overflow-hidden rounded-lg px-2 py-1.5 text-white ${dimmed ? "opacity-35" : "opacity-100"}`} style={{ top: `${top}px`, height: `${Math.max(28, appointment.duration_minutes)}px`, left: `calc(${(column / columnCount) * 100}% + 3px)`, width: `calc(${100 / columnCount}% - 6px)`, background: getServiceColor(appointment.title) }}><div className="truncate text-[12px] font-bold">{appointment.client_first_name} {appointment.client_last_name}</div><div className="truncate text-[11px] opacity-90">{appointment.title}</div>{appointment.duration_minutes >= 60 && <div className="text-[11px] opacity-90">{currency(appointment.price)}</div>}{group.length > 1 && column === 0 && <span className="absolute bottom-1 right-1 rounded bg-black/25 px-1 text-[9px]">+{group.length} równoczesne</span>}</div>;
}

function OverlapPanel({ appointments, position, onPick, onClose }: { appointments: Appointment[]; position: { x: number; y: number }; onPick: (appointment: Appointment) => void; onClose: () => void }) {
  const placeOnLeft = typeof window !== "undefined" && position.x > window.innerWidth - 330;
  return <div className="overlap-panel fixed z-50 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" style={{ top: Math.max(84, position.y - 36), left: placeOnLeft ? Math.max(12, position.x - 312) : position.x + 12 }} onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><div><div className="text-sm font-bold">Równoczesne wizyty</div><div className="text-[11px] text-slate-500">Liczba wizyt: {appointments.length}</div></div><button type="button" aria-label="Zamknij panel" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X size={15} /></button></div><div className="max-h-72 overflow-y-auto p-1.5">{appointments.map((appointment) => { const start = new Date(appointment.start_at); const end = new Date(start.getTime() + appointment.duration_minutes * 60_000); return <button type="button" key={appointment.id} onClick={() => onPick(appointment)} className="block w-full rounded-lg p-2.5 text-left hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{appointment.client_first_name} {appointment.client_last_name}</div><div className="truncate text-xs text-slate-600">{appointment.title}</div></div><div className="shrink-0 text-right"><div className="text-xs font-semibold">{start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}–{end.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</div><div className="mt-1 text-xs text-slate-500">{currency(appointment.price)}</div></div></div></button>; })}</div></div>;
}

function Month({ appointments, selectedDate, onPick }: { appointments: Appointment[]; selectedDate: Date; onPick: (appointment: Appointment) => void }) {
  const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return <div className="calendar-scroll h-[calc(100vh-145px)] overflow-auto"><div className="grid min-w-[720px] grid-cols-7 gap-px bg-slate-100 p-3">{["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"].map((label) => <div key={label} className="bg-white p-2 text-xs font-bold text-slate-400">{label}</div>)}{Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); const items = appointments.filter((appointment) => appointment.start_at.slice(0, 10) === isoDate(day)); return <div key={isoDate(day)} className={`min-h-[112px] bg-white p-2 ${day.getMonth() !== selectedDate.getMonth() ? "opacity-40" : ""}`}><div className="text-sm font-semibold">{day.getDate()}</div>{items.map((appointment) => <button onClick={() => onPick(appointment)} key={appointment.id} className="mt-1 block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] text-white" style={{ background: getServiceColor(appointment.title) }}>{new Date(appointment.start_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} {appointment.client_first_name}</button>)}</div>; })}</div></div>;
}

function SearchDropdown({ results, onPick }: { results: Appointment[]; onPick: (appointment: Appointment) => void }) {
  return <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{results.map((appointment) => <button key={appointment.id} onClick={() => onPick(appointment)} className="block w-full rounded-lg p-2 text-left hover:bg-slate-50"><div className="text-sm font-semibold">{appointment.client_first_name} {appointment.client_last_name}</div><div className="text-xs text-slate-500">{appointment.title} · {formatDate(appointment.start_at)} · {currency(appointment.price)}</div></button>)}</div>;
}

function HistoryView({ appointments, onPick }: { appointments: Appointment[]; onPick: (appointment: Appointment) => void }) {
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sort, setSort] = useState("new");
  const rows = useMemo(() => appointments.filter((appointment) => {
    const match = normalizeSearch(`${appointment.client_first_name} ${appointment.client_last_name} ${appointment.title} ${appointment.phone ?? ""} ${appointment.notes ?? ""}`).includes(normalizeSearch(query));
    const past = new Date(appointment.start_at) < new Date();
    return match && (timeFilter === "all" || (timeFilter === "past" ? past : !past));
  }).sort((a, b) => sort === "priceUp" ? a.price - b.price : sort === "priceDown" ? b.price - a.price : sort === "old" ? new Date(a.start_at).getTime() - new Date(b.start_at).getTime() : new Date(b.start_at).getTime() - new Date(a.start_at).getTime()), [appointments, query, timeFilter, sort]);
  return <div className="m-4 overflow-hidden rounded-2xl border border-slate-200 bg-white md:m-7"><div className="flex flex-wrap gap-2 border-b border-slate-200 p-4"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po kliencie, usłudze, telefonie…" /></div><select className="select" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}><option value="all">Wszystkie wizyty</option><option value="past">Tylko przeszłe</option><option value="future">Tylko przyszłe</option></select><select className="select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="new">Najnowsze</option><option value="old">Najstarsze</option><option value="priceUp">Cena rosnąco</option><option value="priceDown">Cena malejąco</option></select></div><div className="divide-y divide-slate-100">{rows.length ? rows.map((appointment) => <button key={appointment.id} onClick={() => onPick(appointment)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"><div><div className="font-semibold">{appointment.client_first_name} {appointment.client_last_name}</div><div className="mt-1 text-sm text-slate-500">{appointment.title} · {formatDate(appointment.start_at)} o {new Date(appointment.start_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</div></div><div className="font-semibold">{currency(appointment.price)}</div></button>) : <div className="p-10 text-center text-slate-500">Brak wyników.</div>}</div></div>;
}

function ServiceLegend() {
  const groups = Array.from(new Set(services.map((service) => service.group)));
  return <div className="p-4 md:p-7"><div className="mb-5"><p className="text-sm text-slate-500">Katalog usług</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-[30px]">Legenda kolorów</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Kolory w kalendarzu odpowiadają rodzajom usług. Starsze, podobnie nazwane wizyty są dopasowywane automatycznie tylko wtedy, gdy wynik jest jednoznaczny.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groups.map((group) => { const groupServices = services.filter((service) => service.group === group); const color = groupServices[0].color; return <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(39,45,58,.03)]"><div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3"><span className="h-4 w-4 rounded-full shadow-sm" style={{ background: color }} /><h2 className="font-bold">{group}</h2><span className="ml-auto text-xs text-slate-400">{groupServices.length} {groupServices.length === 1 ? "usługa" : "usługi"}</span></div><div className="divide-y divide-slate-100">{groupServices.map((service) => <div key={service.id} className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><span className="mr-2 text-xs font-semibold text-slate-300">{service.id}.</span><span className="text-sm font-medium text-slate-700">{service.title}</span></div><span className="shrink-0 text-sm font-semibold text-slate-600">{formatServicePrice(service)}</span></div>)}</div></section>; })}</div></div>;
}

function AppointmentModal({ initial, selectedDate, clients, onClose, onSave, onDelete }: { initial?: Appointment; selectedDate: Date; clients: Client[]; onClose: () => void; onSave: (appointment: Appointment) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const isEdit = Boolean(initial?.id);
  const start = initial?.start_at ? new Date(initial.start_at) : new Date();
  const totalDuration = initial?.duration_minutes ?? 60;
  const [serviceOpen, setServiceOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: initial ? {
      title: initial.title,
      client_first_name: initial.client_first_name,
      client_last_name: initial.client_last_name,
      phone: normalizePhone(initial.phone ?? "").slice(0, 9),
      date: isoDate(start),
      time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      duration_hours: Math.floor(totalDuration / 60),
      duration_extra_minutes: totalDuration % 60,
      price: initial.price,
      notes: initial.notes ?? "",
    } : emptyForm(isoDate(selectedDate)),
  });
  useLayoutEffect(() => {
    if (isEdit && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [isEdit]);
  const [title = "", firstName = "", lastName = "", phone = "", durationHours = 0, durationExtraMinutes = 0] = useWatch({
    control,
    name: ["title", "client_first_name", "client_last_name", "phone", "duration_hours", "duration_extra_minutes"],
  });
  const hours = Number(durationHours || 0);
  const extraMinutes = Number(durationExtraMinutes || 0);
  const minutesTotal = hours * 60 + extraMinutes;
  const serviceQuery = normalizeSearch(title);
  const serviceMatches = services.filter((service) => !serviceQuery || normalizeSearch(service.title).includes(serviceQuery)).slice(0, 8);
  const clientQuery = normalizeSearch(`${firstName} ${lastName} ${phone}`);
  const phoneQuery = normalizePhone(phone);
  const existingClient = clients.find((client) => normalizePhone(client.phone) === phoneQuery);
  const clientMatches = clients.filter((client) => !clientQuery || normalizeSearch(`${client.first_name} ${client.last_name ?? ""} ${client.phone}`).includes(clientQuery) || (phoneQuery && normalizePhone(client.phone).includes(phoneQuery))).slice(0, 8);
  const titleField = register("title");
  const firstNameField = register("client_first_name");
  const lastNameField = register("client_last_name");
  const phoneField = register("phone");

  const requestClose = () => {
    if (!isDirty || confirm("Masz niezapisane zmiany. Czy na pewno zamknąć formularz?")) onClose();
  };
  const chooseService = (service: (typeof services)[number]) => {
    setValue("title", service.title, { shouldDirty: true, shouldValidate: true });
    setValue("price", service.minPrice, { shouldDirty: true, shouldValidate: true });
    setServiceOpen(false);
  };
  const chooseClient = (client: Client) => {
    setValue("client_first_name", client.first_name, { shouldDirty: true, shouldValidate: true });
    setValue("client_last_name", client.last_name ?? "", { shouldDirty: true });
    setValue("phone", normalizePhone(client.phone).slice(0, 9), { shouldDirty: true, shouldValidate: true });
    setClientOpen(false);
  };
  const applyPreset = (value: string) => {
    if (value === "custom") return;
    const minutes = Number(value);
    setValue("duration_hours", Math.floor(minutes / 60), { shouldDirty: true, shouldValidate: true });
    setValue("duration_extra_minutes", minutes % 60, { shouldDirty: true, shouldValidate: true });
  };
  const submit = (values: AppointmentFormValues) => onSave({
    id: initial?.id ?? "",
    title: values.title.trim(),
    client_first_name: values.client_first_name.trim(),
    client_last_name: values.client_last_name?.trim() ?? "",
    phone: normalizePhone(values.phone ?? "") || null,
    start_at: localStart(values.date, values.time),
    duration_minutes: Number(values.duration_hours) * 60 + Number(values.duration_extra_minutes),
    price: Number(values.price),
    notes: values.notes?.trim() || null,
    client_id: existingClient?.id ?? (normalizePhone(initial?.phone ?? "") === phoneQuery ? initial?.client_id ?? null : null),
    created_at: initial?.created_at,
  });

  return <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-3"><div className="max-h-[calc(100vh-24px)] w-full max-w-[620px] overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6"><div><h2 className="text-lg font-bold">{isEdit ? "Edytuj wizytę" : "Nowa wizyta"}</h2><p className="mt-1 text-sm text-slate-500">Szczegóły usługi i klienta</p></div><button type="button" onClick={requestClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div><form onSubmit={handleSubmit(submit)} className="min-w-0 space-y-4 p-4 sm:p-5 md:p-6"><div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]"><Field label="Usługa" error={errors.title?.message}><div className="relative min-w-0"><input autoFocus {...titleField} onFocus={() => setServiceOpen(true)} onBlur={() => setTimeout(() => setServiceOpen(false), 120)} onChange={(event) => { titleField.onChange(event); setServiceOpen(true); }} className="input pr-10" placeholder="Zacznij wpisywać nazwę…" /><Search size={16} className="absolute right-3 top-3 text-slate-400" />{serviceOpen && serviceMatches.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{serviceMatches.map((service) => <button key={service.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseService(service)} className="flex w-full min-w-0 items-center gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: service.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{service.title}</span><span className="text-xs text-slate-500">{service.group}</span></span><span className="shrink-0 text-sm font-semibold">{formatServicePrice(service)}</span></button>)}</div>}</div></Field><Field label="Cena (PLN)" error={errors.price?.message}><input type="number" step="0.01" min="0" {...register("price")} className="input" placeholder="0" /></Field></div><div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-1"><span className="text-xs font-semibold text-slate-600">Klient</span>{clients.length > 0 && <span className="text-[11px] text-slate-400">Wyszukaj imieniem, nazwiskiem lub telefonem</span>}</div><div className="relative min-w-0"><div className="grid min-w-0 gap-3 sm:grid-cols-2"><Field label="Imię" error={errors.client_first_name?.message}><input {...firstNameField} onFocus={() => setClientOpen(true)} onBlur={() => setTimeout(() => setClientOpen(false), 120)} onChange={(event) => { firstNameField.onChange(event); setClientOpen(true); }} className="input bg-white" placeholder="Anna" /></Field><Field label="Nazwisko"><input {...lastNameField} onFocus={() => setClientOpen(true)} onBlur={() => setTimeout(() => setClientOpen(false), 120)} onChange={(event) => { lastNameField.onChange(event); setClientOpen(true); }} className="input bg-white" placeholder="Opcjonalnie" /></Field><Field label="Telefon" error={errors.phone?.message}><input {...phoneField} inputMode="numeric" maxLength={9} onFocus={() => setClientOpen(true)} onBlur={() => setTimeout(() => setClientOpen(false), 120)} onChange={(event) => { setValue("phone", normalizePhone(event.target.value).slice(0, 9), { shouldDirty: true, shouldValidate: true }); setClientOpen(true); }} className="input bg-white" placeholder="9 cyfr" /></Field></div>{clientOpen && clientMatches.length > 0 && (firstName || lastName || phone) && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{clientMatches.map((client) => <button key={client.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseClient(client)} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{client.first_name} {client.last_name}</span><span className="text-xs text-slate-500">{client.phone}</span></span><span className="shrink-0 text-xs font-medium text-[#665c9a]">Wybierz</span></button>)}</div>}</div>{phoneQuery.length === 9 && firstName && !existingClient && <p className="mt-2 text-[11px] text-slate-500">Nowy klient zostanie zapamiętany po zapisaniu wizyty.</p>}</div><div className="grid min-w-0 gap-3 sm:grid-cols-2"><Field label="Data"><input type="date" {...register("date")} className="input" /></Field><Field label="Godzina rozpoczęcia"><input type="time" {...register("time")} className="input" /></Field></div><div className="min-w-0 rounded-xl border border-slate-200 p-3"><div className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_90px_90px]"><Field label="Szybki wybór"><select value={durationOptions.some((option) => option.value === minutesTotal) ? String(minutesTotal) : "custom"} onChange={(event) => applyPreset(event.target.value)} className="select"><option value="custom">Własny czas</option>{durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Godziny"><input type="number" min="0" max="12" {...register("duration_hours")} className="input" /></Field><Field label="Minuty" error={errors.duration_extra_minutes?.message}><input type="number" min="0" max="59" {...register("duration_extra_minutes")} className="input" /></Field></div><p className="mt-2 text-xs text-slate-500">Łącznie: <span className="font-semibold text-slate-700">{hours > 0 ? `${hours} godz. ` : ""}{extraMinutes} min</span></p></div><Field label="Notatka"><textarea {...register("notes")} className="input min-h-[76px] resize-none" placeholder="Opcjonalna notatka do wizyty…" /></Field><div className="flex flex-wrap items-center justify-between gap-3 pt-2">{isEdit ? <button type="button" onClick={() => confirm("Czy na pewno usunąć tę wizytę?") && onDelete(initial!.id)} className="flex items-center gap-2 text-sm font-semibold text-red-600"><Trash2 size={16} /> Usuń wizytę</button> : <span />}<div className="ml-auto flex gap-2"><button type="button" onClick={requestClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm">Anuluj</button><button disabled={isSubmitting} className="h-10 rounded-lg bg-[#665c9a] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Zapisz wizytę"}</button></div></div></form></div></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
