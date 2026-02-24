import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testColumns() {
    console.log("Testing explicit columns...");
    const { data, error } = await supabase.from('barbers').select('id, name, username').limit(1);

    if (error) {
        console.error("COLUMNS ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("COLUMNS SUCCESS:", data);
    }
}

testColumns();
