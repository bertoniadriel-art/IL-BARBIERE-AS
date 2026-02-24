import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function audit() {
    console.log("--- STARTING DATA AUDIT ---");

    const { data: barbers, error: bError } = await supabase.from('barbers').select('*');
    if (bError) console.error("Barbers error:", bError);
    else console.log("BARBERS FOUND:", barbers?.length || 0, barbers);

    const { data: services, error: sError } = await supabase.from('services').select('*');
    if (sError) console.error("Services error:", sError);
    else console.log("SERVICES FOUND:", services?.length || 0, services);

    const { data: appts, error: aError } = await supabase.from('appointments').select('*').limit(5);
    if (aError) console.error("Appts error:", aError);
    else console.log("APPOINTMENTS FOUND (First 5):", appts?.length || 0, appts);
}

audit();
