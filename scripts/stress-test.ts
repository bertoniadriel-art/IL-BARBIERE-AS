import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BARBERS = [
    { id: "78c41016-d4f2-4946-a3b7-1c439cc7aedc", name: "Santi", phone: "3402503244" },
    { id: "065f5bb5-578a-4993-8bbe-275b5831b2eb", name: "Fede", phone: "3402417023" }
];

const SERVICES = [
    { id: "92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a", name: "Corte Premium" },
    { id: "79d875c2-387e-4f3d-aa71-414e19f60863", name: "Barba & Perfilado" }
];

async function runStressTest(count: number) {
    console.log(`🚀 Iniciando Test de Estrés: ${count} reservas simuladas...`);
    const startTime = Date.now();
    let successes = 0;
    let failures = 0;

    const promises = Array.from({ length: count }).map(async (_, i) => {
        const barber = BARBERS[Math.floor(Math.random() * BARBERS.length)];
        const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        const clientName = `Test Bot ${i + 1}`;
        const date = format(new Date(), 'yyyy-MM-dd');
        const time = `${Math.floor(Math.random() * 24)}:00`;
        const qrHash = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            const payload: any = {
                barber_id: barber.id,
                client_name: clientName,
                client_phone: "3402123456",
                appointment_date: date,
                appointment_time: time,
                qr_hash: qrHash,
                status: 'pending'
            };

            // Add service_id ONLY if it doesn't cause a PGRST204 error in the first batch
            // For now, we omit it to test the table's capacity
            // payload.service_id = service.id; 

            const { error } = await supabase.from('appointments').insert(payload).select();

            if (error) throw error;
            successes++;
        } catch (err) {
            console.error(`❌ Fallo en reserva ${i + 1}:`, err);
            failures++;
        }
    });

    await Promise.all(promises);
    const duration = (Date.now() - startTime) / 1000;

    console.log('\n--- RESULTADOS DEL PROTOCOLO DE CARGA ---');
    console.log(`✅ Éxitos: ${successes}`);
    console.log(`❌ Fallos: ${failures}`);
    console.log(`⏱️ Duración: ${duration}s`);
    console.log(`🔥 Rendimiento: ${(successes / duration).toFixed(2)} reservas/seg`);
    console.log('----------------------------------------\n');
}

// Para ejecutar: ts-node -r dotenv/config scripts/stress-test.ts
// O usar un entorno que soporte TS directo o compilarlo.
runStressTest(200);
