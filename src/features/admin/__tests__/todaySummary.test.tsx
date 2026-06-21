import { render, screen } from '@testing-library/react';
/**
 * TodaySummary — unit tests
 * REQ-PR4.2: Today's summary shows appointment count by status
 */
import { describe, expect, it } from 'vitest';
import { TodaySummary } from '../components/TodaySummary';

function createAppointment(
  overrides: Partial<{
    id: string;
    status: string;
    client_name: string;
    appointment_date: string;
    appointment_time: string;
  }> = {}
) {
  return {
    id: overrides.id || 'apt-1',
    status: overrides.status || 'pending',
    client_name: overrides.client_name || 'Test Client',
    appointment_date: overrides.appointment_date || new Date().toISOString().split('T')[0],
    appointment_time: overrides.appointment_time || '10:00',
  };
}

describe('TodaySummary (REQ-PR4.2)', () => {
  it('renders zero when no appointments', () => {
    render(<TodaySummary appointments={[]} />);

    expect(screen.getByText('0 turnos')).toBeInTheDocument();
    expect(screen.getByText('Sin turnos programados para hoy.')).toBeInTheDocument();
  });

  it('renders appointment count', () => {
    const appointments = [
      createAppointment({ id: 'apt-1', status: 'pending' }),
      createAppointment({ id: 'apt-2', status: 'confirmed' }),
    ];

    render(<TodaySummary appointments={appointments} />);

    expect(screen.getByText('2 turnos')).toBeInTheDocument();
  });

  it('shows pending count', () => {
    const appointments = [
      createAppointment({ id: 'apt-1', status: 'pending' }),
      createAppointment({ id: 'apt-2', status: 'pending' }),
    ];

    render(<TodaySummary appointments={appointments} />);

    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows confirmed count', () => {
    const appointments = [createAppointment({ id: 'apt-1', status: 'confirmed' })];

    render(<TodaySummary appointments={appointments} />);

    expect(screen.getByText('Confirmados')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows attended count', () => {
    const appointments = [createAppointment({ id: 'apt-1', status: 'attended' })];

    render(<TodaySummary appointments={appointments} />);

    expect(screen.getByText('Atendidos')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('filters out appointments from other days', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const appointments = [
      createAppointment({ id: 'apt-1', status: 'pending', appointment_date: today }),
      createAppointment({ id: 'apt-2', status: 'pending', appointment_date: yesterday }),
    ];

    render(<TodaySummary appointments={appointments} />);

    expect(screen.getByText('1 turno')).toBeInTheDocument();
  });
});
