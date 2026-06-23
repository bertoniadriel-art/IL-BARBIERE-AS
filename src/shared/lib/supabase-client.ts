'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isConfigured =
  url.startsWith('http') &&
  !url.includes('YOUR_SUPABASE_URL') &&
  key.length > 10 &&
  !key.includes('YOUR_SUPABASE_ANON_KEY');

export const supabase = isConfigured
  ? createBrowserClient(url, key)
  : (null as ReturnType<typeof createBrowserClient> | null);

if (!isConfigured) {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ MODO OFFLINE: Supabase no está configurado. Revisa tus variables de entorno.');
  } else {
    console.warn('⚠️ [SERVER] Supabase no configurado.');
  }
} else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('✅ Supabase (browser) conectado correctamente.');
}
