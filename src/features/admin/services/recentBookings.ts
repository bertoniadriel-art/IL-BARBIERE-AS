import { supabase } from '@/shared/lib/supabase';

export type BookingOrigin = 'app' | 'manual' | 'vip';

export interface RecentBooking {
  id: string;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  qr_hash: string | null;
  created_at: string;
  services: { name: string } | null;
}

// How far back the notification center looks. A rolling window (not "since
// midnight") so a turno booked last night still shows up the next morning.
const WINDOW_MS = 24 * 60 * 60 * 1000;

export function recentBookingsSince(now: Date = new Date()): string {
  return new Date(now.getTime() - WINDOW_MS).toISOString();
}

// There is no origin column: each insert path stamps qr_hash with its own
// prefix instead — VIP generator "VIP-", barber quick-add/overbook "MANUAL-",
// and the public booking flow a bare 8-char hash. Keep this in sync if a new
// insert path is added.
export function bookingOrigin(qrHash: string | null): BookingOrigin {
  if (!qrHash) return 'manual';
  if (qrHash.startsWith('VIP-')) return 'vip';
  if (qrHash.startsWith('MANUAL-')) return 'manual';
  return 'app';
}

export async function getRecentBookings(barberId: string): Promise<RecentBooking[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('appointments')
    .select(
      'id, status, client_name, client_phone, appointment_date, appointment_time, qr_hash, created_at, services(name)'
    )
    .eq('barber_id', barberId)
    .gte('created_at', recentBookingsSince())
    .neq('status', 'blocked')
    .order('created_at', { ascending: false });
  return (data as RecentBooking[] | null) ?? [];
}
