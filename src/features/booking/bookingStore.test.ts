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

  // T3.1/T7.1 — expanded shape tests

  describe('setService (T3.1/T7.1)', () => {
    it('should store service id, name, and price, and advance to step 3', () => {
      const { setService } = useBookingStore.getState();
      setService('uuid-real-1', 'Corte de Pelo', 12000);

      const state = useBookingStore.getState();
      expect(state.serviceId).toBe('uuid-real-1');
      expect(state.serviceName).toBe('Corte de Pelo');
      expect(state.servicePrice).toBe(12000);
      expect(state.step).toBe(3);
    });

    it('should store a different service correctly', () => {
      const { setService } = useBookingStore.getState();
      setService('uuid-real-2', 'Barba', 8000);

      const state = useBookingStore.getState();
      expect(state.serviceId).toBe('uuid-real-2');
      expect(state.serviceName).toBe('Barba');
      expect(state.servicePrice).toBe(8000);
    });
  });

  describe('setClient (T7.1)', () => {
    it('should initialize clientName and clientPhone as empty strings', () => {
      const state = useBookingStore.getState();
      expect(state.clientName).toBe('');
      expect(state.clientPhone).toBe('');
    });

    it('should set clientName and clientPhone via setClient', () => {
      const { setClient } = useBookingStore.getState();
      setClient('Juan Perez', '1155551234');

      const state = useBookingStore.getState();
      expect(state.clientName).toBe('Juan Perez');
      expect(state.clientPhone).toBe('1155551234');
    });

    it('should update clientName only when phone is unchanged', () => {
      const { setClient } = useBookingStore.getState();
      setClient('Juan', '1155551234');
      setClient('Juan Perez', '1155551234');

      expect(useBookingStore.getState().clientName).toBe('Juan Perez');
      expect(useBookingStore.getState().clientPhone).toBe('1155551234');
    });
  });

  describe('slotConflictError (T3.1)', () => {
    it('should initialize slotConflictError as null', () => {
      expect(useBookingStore.getState().slotConflictError).toBeNull();
    });

    it('should set and clear slot conflict error', () => {
      const { setSlotConflictError } = useBookingStore.getState();
      setSlotConflictError('Este turno acaba de ser tomado.');
      expect(useBookingStore.getState().slotConflictError).toBe('Este turno acaba de ser tomado.');
      setSlotConflictError(null);
      expect(useBookingStore.getState().slotConflictError).toBeNull();
    });
  });

  describe('reset (T7.1 — clears all new fields)', () => {
    it('should reset clientName, clientPhone, serviceName, servicePrice, slotConflictError', () => {
      const { setService, setClient, setSlotConflictError } = useBookingStore.getState();
      setService('uuid-real-1', 'Corte de Pelo', 12000);
      setClient('Juan', '1155551234');
      setSlotConflictError('conflict!');

      useBookingStore.getState().reset();
      const state = useBookingStore.getState();

      expect(state.serviceId).toBeNull();
      expect(state.serviceName).toBeNull();
      expect(state.servicePrice).toBeNull();
      expect(state.clientName).toBe('');
      expect(state.clientPhone).toBe('');
      expect(state.slotConflictError).toBeNull();
    });
  });
});
