import { create } from 'zustand';

interface BookingState {
    step: number;
    barberId: string | null;
    barberName: string | null;
    serviceId: string | null;
    date: string | null;
    time: string | null;
    setStep: (step: number) => void;
    setBarber: (id: string, name: string) => void;
    setService: (id: string) => void;
    setDateTime: (date: string, time: string) => void;
    reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    step: 1,
    barberId: null,
    barberName: null,
    serviceId: null,
    date: null,
    time: null,
    setStep: (step) => set({ step }),
    setBarber: (barberId, barberName) => set({ barberId, barberName, step: 2 }),
    setService: (serviceId) => set({ serviceId, step: 3 }),
    setDateTime: (date, time) => set({ date, time, step: 4 }),
    reset: () => set({ step: 1, barberId: null, barberName: null, serviceId: null, date: null, time: null }),
}));
