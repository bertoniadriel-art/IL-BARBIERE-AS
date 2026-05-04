import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';

describe('BookingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useBookingStore.getState().reset();
  });

  it('should initialize with default values', () => {
    const state = useBookingStore.getState();
    
    expect(state.step).toBe(1);
    expect(state.barberId).toBeNull();
    expect(state.barberName).toBeNull();
    expect(state.serviceId).toBeNull();
    expect(state.date).toBeNull();
    expect(state.time).toBeNull();
    expect(state.isFixedWeekly).toBe(false);
  });

  it('should set barber correctly', () => {
    const { setBarber } = useBookingStore.getState();
    setBarber('barber-001', 'Santi Ducca');
    
    const state = useBookingStore.getState();
    expect(state.barberId).toBe('barber-001');
    expect(state.barberName).toBe('Santi Ducca');
    expect(state.step).toBe(2);
  });

  it('should set service correctly', () => {
    const { setService } = useBookingStore.getState();
    setService('s1');
    
    const state = useBookingStore.getState();
    expect(state.serviceId).toBe('s1');
    expect(state.step).toBe(3);
  });

  it('should set date and time correctly', () => {
    const { setDateTime } = useBookingStore.getState();
    setDateTime('2026-05-15', '14:00');
    
    const state = useBookingStore.getState();
    expect(state.date).toBe('2026-05-15');
    expect(state.time).toBe('14:00');
    expect(state.step).toBe(4);
  });

  it('should toggle fixed weekly', () => {
    const { setFixedWeekly } = useBookingStore.getState();
    
    setFixedWeekly(true);
    expect(useBookingStore.getState().isFixedWeekly).toBe(true);
    
    setFixedWeekly(false);
    expect(useBookingStore.getState().isFixedWeekly).toBe(false);
  });

  it('should reset booking', () => {
    // Set some values
    useBookingStore.setState({
      step: 3,
      barberId: 'barber-001',
      barberName: 'Santi Ducca',
      serviceId: 's1',
      date: '2026-05-15',
      time: '14:00',
      isFixedWeekly: true,
    });
    
    // Reset
    useBookingStore.getState().reset();
    
    const state = useBookingStore.getState();
    expect(state.step).toBe(1);
    expect(state.barberId).toBeNull();
    expect(state.barberName).toBeNull();
    expect(state.serviceId).toBeNull();
    expect(state.date).toBeNull();
    expect(state.time).toBeNull();
  });
});