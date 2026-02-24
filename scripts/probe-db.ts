import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probe() {
    console.log("Probing 'appointments' table...");
    const { data, error } = await supabase.from('appointments').select('*').limit(1);

    if (error) {
        console.error("Error probing table:", error);
    } else {
        console.log("Probe successful. Table exists. Sample data:", data);
    }
}

probe();
