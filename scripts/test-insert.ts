import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
    console.log("Testing manual insert...");
    const { data, error } = await supabase.from('appointments').insert({
        barber_id: '78c41016-d4f2-4946-a3b7-1c439cc7aedc', // Santi
        client_name: 'DEBUG USER',
        client_phone: '123456789',
        appointment_date: '2026-02-25',
        appointment_time: '10:00:00',
        status: 'pending'
    }).select();

    if (error) {
        console.error("INSERT ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("INSERT SUCCESS:", data);
    }
}

testInsert();
