import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listColumns() {
    console.log("Listing columns for 'barbers'...");
    const { data, error } = await supabase.rpc('get_table_columns', { t_name: 'barbers' });

    // If RPC is not available, we can try to select * and see keys
    if (error) {
        console.log("RPC failed, trying select *...");
        const { data: selectData, error: selectError } = await supabase.from('barbers').select('*').limit(1);
        if (selectError) {
            console.error("Select error:", selectError);
        } else {
            console.log("Available columns (from select *):", Object.keys(selectData?.[0] || {}));
        }
    } else {
        console.log("Columns from RPC:", data);
    }
}

listColumns();
