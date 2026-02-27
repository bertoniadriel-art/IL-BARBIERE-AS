import { createClient } from "@supabase/supabase-js";
import { addDays, format } from "date-fns";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ajusta estos IDs si tus barberos/servicios tienen otros UUID
const SANTI_ID = "78c41016-d4f2-4946-a3b7-1c439cc7aedc";
const FEDE_ID = "065f5bb5-578a-4993-8bbe-275b5831b2eb";

const SERVICES = {
  CORTE_PELO: {
    id: "92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a",
    name: "Corte de Pelo",
    price: 12000,
  },
  BARBA: {
    id: "79d875c2-387e-4f3d-aa71-414e19f60863",
    name: "Barba",
    price: 8000,
  },
  CORTE_CHICOS: {
    // Ajusta si el servicio tiene otro UUID en tu tabla
    id: "00000000-0000-0000-0000-000000000004",
    name: "Corte para chicos",
    price: 10000,
  },
};

type Status = "pending" | "confirmed" | "attended";

interface QAAppointmentSeed {
  barber_id: string;
  service: keyof typeof SERVICES;
  status: Status;
  offsetDays: number;
  time: string;
  client_name: string;
  client_phone: string;
  is_fixed_weekly?: boolean;
  deposit_paid?: boolean;
}

function buildPayload(seed: QAAppointmentSeed) {
  const service = SERVICES[seed.service];
  const baseDate = new Date();
  const appointmentDate = addDays(baseDate, seed.offsetDays);
  const dateStr = format(appointmentDate, "yyyy-MM-dd");
  const qrHash = Math.random().toString(36).substring(2, 8).toUpperCase();

  const basePrice = service.price;
  const finalPrice = seed.is_fixed_weekly ? Math.round(basePrice * 0.9) : basePrice;

  return {
    barber_id: seed.barber_id,
    service_id: service.id,
    client_name: seed.client_name,
    client_phone: seed.client_phone,
    appointment_date: dateStr,
    appointment_time: seed.time,
    status: seed.status,
    qr_hash: qrHash,
    deposit_paid: seed.deposit_paid ?? (seed.status === "confirmed" || seed.status === "attended"),
    is_fixed_weekly: !!seed.is_fixed_weekly,
    final_price: finalPrice,
  };
}

async function main() {
  console.log("🚀 Iniciando Stress Test QA (20 turnos + 2 duplicados)...");

  // Semillas: 18 válidas + 2 duplicadas (mismo barber_id + date + time)
  const seeds: QAAppointmentSeed[] = [
    // Santi – este mes
    {
      barber_id: SANTI_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 1,
      time: "10:00",
      client_name: "Juan Pérez",
      client_phone: "3402500001",
      is_fixed_weekly: true,
    },
    {
      barber_id: SANTI_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 2,
      time: "11:30",
      client_name: "Carlos López",
      client_phone: "3402500002",
    },
    {
      barber_id: SANTI_ID,
      service: "CORTE_CHICOS",
      status: "pending",
      offsetDays: 3,
      time: "12:00",
      client_name: "Padre de Mateo",
      client_phone: "3402500003",
    },
    {
      barber_id: SANTI_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 4,
      time: "13:30",
      client_name: "Diego Castillo",
      client_phone: "3402500004",
      is_fixed_weekly: true,
    },
    {
      barber_id: SANTI_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 5,
      time: "16:00",
      client_name: "Nicolás Ríos",
      client_phone: "3402500005",
    },
    {
      barber_id: SANTI_ID,
      service: "CORTE_CHICOS",
      status: "pending",
      offsetDays: 6,
      time: "10:30",
      client_name: "Madre de Tomás",
      client_phone: "3402500006",
    },
    // Santi – próximo mes (simulado con más offsetDays)
    {
      barber_id: SANTI_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 32,
      time: "11:00",
      client_name: "Franco Martínez",
      client_phone: "3402500007",
    },
    {
      barber_id: SANTI_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 35,
      time: "17:30",
      client_name: "Leandro Gómez",
      client_phone: "3402500008",
      is_fixed_weekly: true,
    },
    {
      barber_id: SANTI_ID,
      service: "CORTE_CHICOS",
      status: "pending",
      offsetDays: 38,
      time: "10:00",
      client_name: "Padre de Sofía",
      client_phone: "3402500009",
    },

    // Fede – este mes (evitando explícitamente vacaciones de marzo)
    {
      barber_id: FEDE_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 1,
      time: "15:00",
      client_name: "Marcos Díaz",
      client_phone: "3402417001",
    },
    {
      barber_id: FEDE_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 7,
      time: "18:30",
      client_name: "Pablo Herrera",
      client_phone: "3402417002",
      is_fixed_weekly: true,
    },
    {
      barber_id: FEDE_ID,
      service: "CORTE_CHICOS",
      status: "pending",
      offsetDays: 9,
      time: "11:00",
      client_name: "Padre de Agustín",
      client_phone: "3402417003",
    },
    {
      barber_id: FEDE_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 12,
      time: "13:00",
      client_name: "Gastón Romero",
      client_phone: "3402417004",
    },
    {
      barber_id: FEDE_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 15,
      time: "16:30",
      client_name: "Hernán Basualdo",
      client_phone: "3402417005",
    },
    {
      barber_id: FEDE_ID,
      service: "CORTE_CHICOS",
      status: "pending",
      offsetDays: 20,
      time: "12:30",
      client_name: "Padre de Malena",
      client_phone: "3402417006",
      is_fixed_weekly: true,
    },

    // Fede – próximo mes
    {
      barber_id: FEDE_ID,
      service: "CORTE_PELO",
      status: "attended",
      offsetDays: 30,
      time: "17:00",
      client_name: "Eduardo Blanco",
      client_phone: "3402417007",
    },
    {
      barber_id: FEDE_ID,
      service: "BARBA",
      status: "confirmed",
      offsetDays: 33,
      time: "19:00",
      client_name: "Luciano Peralta",
      client_phone: "3402417008",
    },
  ];

  // 2 duplicados intencionales: mismo barbero, misma fecha y hora que los dos primeros seeds
  const duplicateSeeds: QAAppointmentSeed[] = [
    {
      ...seeds[0],
      client_name: seeds[0].client_name + " DUPLICADO",
    },
    {
      ...seeds[10],
      client_name: seeds[10].client_name + " DUPLICADO",
    },
  ];

  const allSeeds = [...seeds, ...duplicateSeeds]; // total 20

  let success = 0;
  let failed = 0;

  for (const [index, seed] of allSeeds.entries()) {
    const payload = buildPayload(seed);
    console.log(`\n▶️ Insertando turno ${index + 1}/20`, payload);

    const { error } = await supabase.from("appointments").insert(payload);

    if (error) {
      failed++;
      console.error(`❌ Error en turno ${index + 1}:`, error.message || error);
    } else {
      success++;
      console.log(`✅ Turno ${index + 1} insertado correctamente.`);
    }
  }

  console.log("\n--- RESUMEN STRESS TEST QA ---");
  console.log(`✅ Éxitos: ${success}`);
  console.log(`❌ Fallos (esperados por duplicados UNIQUE, si aplica): ${failed}`);
  console.log("--------------------------------");
}

main().catch((err) => {
  console.error("Error ejecutando stress-test-qa:", err);
});

