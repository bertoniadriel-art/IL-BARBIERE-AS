const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createRandomAppointments() {
    const barbers = [
        '78c41016-d4f2-4946-a3b7-1c439cc7aedc', // Santi Ducca
        '065f5bb5-578a-4993-8bbe-275b5831b2eb'  // Fede Diaz
    ];

    const services = [
        '92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a', // Corte Premium
        '79d875c2-387e-4f3d-aa71-414e19f60863', // Barba & Perfilado
        '5d1ebae1-7d5f-4668-a1d8-c725c8c9c274'  // Corte + Barba
    ];

    const names = ['Juan Perez', 'Maria Garcia', 'Carlos Ruiz', 'Ana Lopez', 'Luis Rodriguez', 'Elena Martinez', 'Pedro Sanchez', 'Laura Diaz', 'Diego Torres', 'Sofia Gomez'];
    const times = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];

    console.log('🚀 Starting Stress Test: Creating 20 random appointments...');

    for (let i = 0; i < 20; i++) {
        const barberId = barbers[Math.floor(Math.random() * barbers.length)];
        const serviceId = services[Math.floor(Math.random() * services.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const time = times[Math.floor(Math.random() * times.length)];

        // Random date in next 7 days
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
        const dateStr = date.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('appointments')
            .insert([
                {
                    barber_id: barberId,
                    service_id: serviceId !== 'corte-id-placeholder' ? serviceId : null,
                    client_name: `${name} (TEST ${i + 1})`,
                    client_phone: '123456789',
                    appointment_date: dateStr,
                    appointment_time: time,
                    status: 'confirmed'
                }
            ]);

        if (error) {
            console.error(`❌ Error creating appointment ${i + 1}:`, error.message);
        } else {
            console.log(`✅ Appointment ${i + 1} created: ${name} on ${dateStr} at ${time}`);
        }
    }

    console.log('🎯 Stress Test Complete!');
}

createRandomAppointments();
