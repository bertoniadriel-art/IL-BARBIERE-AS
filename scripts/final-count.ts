import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function count() {
    const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error counting:", error);
    } else {
        console.log(`TOTAL APPOINTMENTS IN DB: ${count}`);
    }
}

count();
