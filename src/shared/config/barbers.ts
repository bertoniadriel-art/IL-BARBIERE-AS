// Configuración de barberos - Mover a DB en futuro
import type { Barber } from '../types';

export const BARBERS_CONFIG: Record<string, Barber> = {
  'Santi Ducca': {
    id: 'barber-001',
    name: 'Santi Ducca',
    auth_user_id: null,
    paymentAlias: 'santi.ducca',
    whatsappPhone: '3402503244',
  },
  'Fede Diaz': {
    id: 'barber-002',
    name: 'Fede Diaz',
    auth_user_id: null,
    paymentAlias: 'fedediaz.14',
    whatsappPhone: '3402417023',
  },
};

export const getBarberConfig = (name: string): Barber | undefined => {
  return BARBERS_CONFIG[name];
};

export const getAllBarbers = (): Barber[] => {
  return Object.values(BARBERS_CONFIG);
};