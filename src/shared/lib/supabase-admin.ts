import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client authenticated with the service-role key,
 * bypassing Row Level Security. Only for trusted server contexts (e.g. the
 * VIP appointment generator cron, src/app/api/cron/generate-vip-appointments).
 *
 * `vip_clients` has RLS enabled with a policy for `authenticated` only — no
 * `anon` policy — so the regular browser client (supabase-client.ts, which
 * uses NEXT_PUBLIC_SUPABASE_ANON_KEY) would silently return zero rows for
 * an unauthenticated cron request. This client uses SUPABASE_SERVICE_ROLE_KEY
 * instead, which must be set as a server-only env var in Vercel (never
 * exposed with a NEXT_PUBLIC_ prefix) and is never imported from client code.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const isConfigured = url.startsWith('http') && serviceRoleKey.length > 10;

export const supabaseAdmin = isConfigured
  ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  : (null as ReturnType<typeof createClient> | null);

if (!isConfigured) {
  console.warn('⚠️ [SERVER] supabase-admin no configurado (falta SUPABASE_SERVICE_ROLE_KEY).');
}
