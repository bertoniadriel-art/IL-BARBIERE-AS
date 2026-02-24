import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safeguard for demo/review: preventing crash if variables are placeholders or missing
const isValidUrl = (url: string) => {
    try {
        if (!url) return false;
        const trimmedUrl = url.trim();
        return trimmedUrl.startsWith('http') && !trimmedUrl.includes('YOUR_SUPABASE_URL');
    } catch {
        return false;
    }
};

const isConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

export const supabase = isConfigured
    ? createClient(supabaseUrl.trim(), supabaseAnonKey.trim())
    : (null as any);

if (!supabase) {
    if (typeof window !== 'undefined') {
        console.warn("⚠️ MODO OFFLINE: Supabase no está configurado. Revisa tus variables de entorno.");
    } else {
        console.warn("⚠️ [SERVER] Supabase no configurado.");
    }
} else {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log("✅ Supabase conectado correctamente.");
    }
}
