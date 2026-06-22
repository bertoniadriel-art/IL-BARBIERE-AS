import { create } from 'zustand';

interface BookingState {
  // Navigation
  step: number;

  // Barber selection
  barberId: string | null;
  barberName: string | null;

  // Service selection (T3.1/T7.1: real UUID + name + price from DB)
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: number | null;

  // Date/time
  date: string | null;
  time: string | null;

  // Options
  isFixedWeekly: boolean;

  // Client info (T7.1: lifted from Confirmation local state)
  clientName: string;
  clientPhone: string;

  // Slot conflict error (T3.1)
  slotConflictError: string | null;

  // Actions
  setStep: (step: number) => void;
  setBarber: (id: string, name: string) => void;
  setService: (id: string, name: string, price: number) => void;
  setDateTime: (date: string, time: string) => void;
  setFixedWeekly: (value: boolean) => void;
  setClient: (name: string, phone: string) => void;
  setSlotConflictError: (msg: string | null) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  barberId: null,
  barberName: null,
  serviceId: null,
  serviceName: null,
  servicePrice: null,
  date: null,
  time: null,
  isFixedWeekly: false,
  clientName: '',
  clientPhone: '',
  slotConflictError: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setBarber: (barberId, barberName) => set({ barberId, barberName, step: 2 }),
  setService: (serviceId, serviceName, servicePrice) =>
    set({ serviceId, serviceName, servicePrice, step: 3 }),
  setDateTime: (date, time) => set({ date, time, step: 4 }),
  setFixedWeekly: (isFixedWeekly) => set({ isFixedWeekly }),
  setClient: (clientName, clientPhone) => set({ clientName, clientPhone }),
  setSlotConflictError: (slotConflictError) => set({ slotConflictError }),
  reset: () => set({ ...initialState }),
}));
