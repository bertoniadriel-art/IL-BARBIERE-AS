import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safeguard for demo/review: preventing crash if variables are placeholders or missing
const isValidUrl = (url: string) => {
    try {
        return url.startsWith('http') && !url.includes('YOUR_SUPABASE_URL');
    } catch {
        return false;
    }
};

export const supabase = isValidUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as any); // Fallback to null to avoid fatal crash on boot

if (!supabase) {
    console.warn("⚠️ ALERTA: Supabase no está configurado correctamente. Usando modo offline para revisión.");
}
