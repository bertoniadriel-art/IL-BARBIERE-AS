const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testConnection() {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const lines = envContent.split('\n');
    let url = '';
    let key = '';
    
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            url = line.split('=')[1].trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            key = line.split('=')[1].trim();
        }
    });

    console.log('--- Testing Supabase Connection ---');
    console.log('URL:', url);
    console.log('Key length:', key.length);

    if (!url || !key) {
        console.error('❌ Error: Supabase URL or Key missing in .env.local');
        return;
    }

    const supabase = createClient(url, key);

    try {
        const { data, error } = await supabase.from('appointments').select('*').limit(1);
        
        if (error) {
            console.error('❌ Connection Error:', error.message);
        } else {
            console.log('✅ Connection Successful!');
            console.log('Data sample:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testConnection();
