/**
 * Thin in-memory mock of @supabase/supabase-js query builder.
 * Only implements chainable methods the app actually uses.
 *
 * Usage:
 *   import { createSupabaseMock } from '@/test/mocks/supabase';
 *   const mock = createSupabaseMock({ barbers: [...], services: [...] });
 *   // mock.client is the supabase-compatible object
 *   // mock.appointmentsDB gives direct access to the appointments table
 */
import { vi } from 'vitest';

export interface AppointmentRow {
  barber_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  client_name: string;
  client_phone: string;
  final_price: number;
  is_fixed_weekly: boolean;
  qr_hash: string;
  deposit_paid: boolean;
}

interface SeedData {
  barbers?: any[];
  services?: any[];
  appointments?: AppointmentRow[];
}

interface SupabaseMock {
  client: {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
    from: (table: string) => any;
  };
  appointmentsDB: AppointmentRow[];
  insertShouldFail: boolean;
}

export function createSupabaseMock(seed: SeedData = {}): SupabaseMock {
  const appointmentsDB: AppointmentRow[] = [...(seed.appointments ?? [])];
  let _insertShouldFail = false;

  const tables: Record<string, any[]> = {
    barbers: seed.barbers ?? [],
    services: seed.services ?? [],
    appointments: appointmentsDB,
  };

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: (table: string) => {
      const api: Record<string, (...args: any[]) => any> = {};

      api.select = (_cols?: string) => {
        const filterApi: Record<string, (...args: any[]) => any> = {};
        let filtered: any[] = [...(tables[table] ?? [])];

        filterApi.eq = (col: string, val: string) => {
          filtered = filtered.filter((r: any) => r[col] === val);
          return filterApi;
        };

        filterApi.in = (col: string, vals: string[]) => {
          filtered = filtered.filter((r: any) => vals.includes(r[col]));
          return filterApi;
        };

        filterApi.gte = (col: string, val: string) => {
          filtered = filtered.filter((r: any) => r[col] >= val);
          return filterApi;
        };

        filterApi.lte = (col: string, val: string) => {
          filtered = filtered.filter((r: any) => r[col] <= val);
          return filterApi;
        };

        filterApi.order = (_col: string, _opts?: any) => filterApi;

        filterApi.single = () =>
          Promise.resolve({
            data: filtered.length > 0 ? filtered[0] : null,
            error: null,
          });

        filterApi.then = (resolve: any, reject?: any) =>
          Promise.resolve({ data: filtered, error: null }).then(resolve, reject);

        return filterApi;
      };

      api.insert = (row: any) => {
        if (table === 'appointments') {
          if (_insertShouldFail) {
            return Promise.resolve({
              error: {
                code: '23505',
                message:
                  'duplicate key value violates unique constraint "appointments_unique_slot"',
              },
            });
          }
          const collision = appointmentsDB.find(
            (a) =>
              a.barber_id === row.barber_id &&
              a.appointment_date === row.appointment_date &&
              a.appointment_time === row.appointment_time &&
              a.status !== 'cancelled'
          );
          if (collision) {
            return Promise.resolve({
              error: {
                code: '23505',
                message:
                  'duplicate key value violates unique constraint "appointments_unique_slot"',
              },
            });
          }
          appointmentsDB.push(row);
        }
        return Promise.resolve({ data: null, error: null });
      };

      api.update = (_data: any) => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      });

      return api;
    },
  };

  return {
    client,
    appointmentsDB,
    get insertShouldFail() {
      return _insertShouldFail;
    },
    set insertShouldFail(v: boolean) {
      _insertShouldFail = v;
    },
  };
}
