// Tipos para IL BARBIERE AS

export interface DayWindow {
  from: string; // "HH:MM"
  to: string; // "HH:MM"
}

// Index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (matches Date.getDay())
export type WeeklySchedule = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DayWindow>>;

export interface VacationBlock {
  monthZeroBased: number; // 0–11
  dayFrom: number;
  dayTo: number;
}

export interface Barber {
  id: string;
  name: string;
  auth_user_id: string | null;
  paymentAlias: string;
  whatsappPhone: string;
  schedule: WeeklySchedule;
  vacations: VacationBlock[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutos
  description: string;
  color: string;
}

export interface Appointment {
  id?: string;
  barber_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  qr_hash: string;
  status: AppointmentStatus;
  is_fixed_weekly: boolean;
  final_price: number | null;
  deposit_paid: boolean;
  created_at?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'attended'
  | 'cancelled'
  | 'debt'
  | 'blocked';

export interface BookingState {
  step: number;
  barberId: string | null;
  barberName: string | null;
  serviceId: string | null;
  date: string | null;
  time: string | null;
  isFixedWeekly: boolean;
  clientName: string;
  clientPhone: string;
  setStep: (step: number) => void;
  setBarber: (id: string, name: string) => void;
  setService: (id: string) => void;
  setDateTime: (date: string, time: string) => void;
  setFixedWeekly: (value: boolean) => void;
  setClient: (name: string, phone: string) => void;
  reset: () => void;
}

export interface BlockedSlot {
  id: string;
  barber_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  slot_time: string; // "HH:MM"
  reason: 'personal' | 'vip_reserved';
  label: string | null;
  enabled: boolean;
  created_at?: string;
}

export interface VipClient {
  id: string;
  client_name: string;
  client_phone: string | null;
  barber_id: string | null;
  service_id: string | null;
  day_of_week: (0 | 1 | 2 | 3 | 4 | 5 | 6) | null;
  slot_time: string | null; // "HH:MM"
  frequency: 'weekly' | 'biweekly';
  discount_percent: number;
  notes: string | null;
  active: boolean;
  created_at?: string;
}

export interface DashboardStats {
  monthlyCashFlow: number;
  pendingDeposits: number;
  totalAppointments: number;
  attendedAppointments: number;
  cancelledAppointments: number;
}
