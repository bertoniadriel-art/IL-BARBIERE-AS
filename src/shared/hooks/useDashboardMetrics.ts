import { useMemo } from 'react';

interface AppointmentRow {
  status: string;
  final_price: number | null;
  client_name: string | null;
  client_phone: string | null;
}

interface DashboardMetrics {
  monthlyCashFlow: number;
  topClients: { name: string; count: number }[];
  uniqueClients: number;
  currencyFormatter: Intl.NumberFormat;
}

export function useDashboardMetrics(rows: AppointmentRow[]): DashboardMetrics {
  const monthlyCashFlow = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'attended' || r.status === 'confirmed')
        .reduce((acc, r) => acc + (r.final_price ?? 0), 0),
    [rows]
  );

  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const r of rows) {
      const key = r.client_phone || r.client_name || 'N/D';
      const current = map.get(key);
      if (current) {
        current.count += 1;
      } else {
        map.set(key, {
          name: r.client_name || key,
          count: 1,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [rows]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const key = r.client_phone || r.client_name || 'N/D';
      set.add(key);
    }
    return set.size;
  }, [rows]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }),
    []
  );

  return { monthlyCashFlow, topClients, uniqueClients, currencyFormatter };
}
