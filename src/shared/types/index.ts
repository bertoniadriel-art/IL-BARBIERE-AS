// Tipos para IL BARBIERE AS

export interface Barber {
  id: string;
  name: string;
  paymentAlias: string;
  whatsappPhone: string;
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
  final_price: number;
  deposit_paid: boolean;
  created_at?: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'attended' | 'cancelled';

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

export interface DashboardStats {
  monthlyCashFlow: number;
  pendingDeposits: number;
  totalAppointments: number;
  attendedAppointments: number;
  cancelledAppointments: number;
}