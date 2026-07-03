import { generateVipAppointments } from '@/features/admin/services/vipAppointmentGenerator';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron entry point for GitHub issue #15 — automatically generates
 * upcoming VIP ("Coronita") fixed recurring appointments.
 *
 * Schedule: "0 3 * * 6" (see vercel.json), registered as weekly (every
 * Saturday) even though the underlying VIP cadence is "every 15 days".
 * This is intentional, not a mismatch:
 *
 * - The generator (generateVipAppointments) is idempotent and window-based:
 *   every run computes the next 15 days from "today" and only creates
 *   appointments that don't already exist. Running it weekly instead of
 *   exactly every 15 days does not create duplicates or drift — it just
 *   re-confirms/refills the same rolling window.
 * - Running more often than strictly necessary is therefore safe, and it
 *   buys reliability: if a given Saturday's run fails, or a deploy/outage
 *   takes Vercel Cron down that day, the following Saturday's run
 *   automatically catches up and fills in whatever 15-day window is still
 *   missing, instead of silently losing an entire cycle.
 * - Vercel Cron schedules are always evaluated in UTC. "0 3 * * 6" is
 *   Saturday 03:00 UTC, which is Friday ~24:00 / early Saturday in
 *   Argentina (UTC-3) — matching the intended "sábado a la noche" cadence.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await generateVipAppointments();
    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
