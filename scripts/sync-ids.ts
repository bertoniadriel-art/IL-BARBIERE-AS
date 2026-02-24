import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function sync() {
    console.log("--- SYNCING REAL IDS ---");

    const { data: barbers } = await supabase.from('barbers').select('id, name');
    console.log("BARBERS:", barbers);

    const { data: services } = await supabase.from('services').select('id, name');
    console.log("SERVICES:", services);
}

sync();
