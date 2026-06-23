import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const envPath = join(__dirname, "../.env.local");
  const env = readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    vars[key.trim()] = rest.join("=").trim();
  }
  return vars;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Fede's barber_id + default service_id (corte)
const BARBER_ID = "b9a3c926-6764-4296-bf95-fe10f8a989d3";
const SERVICE_ID = "92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a";

const APPOINTMENTS = [
  // Martes 2026-06-23
  { id: "b0000000-0000-0000-0000-000000000001", qr_hash: "0623-1000-Elian-gordito",     client_name: "Elian",            date: "2026-06-23", time: "10:00" },
  { id: "b0000000-0000-0000-0000-000000000002", qr_hash: "0623-1030-Seba-Cordobez",     client_name: "Seba Cordobez",    date: "2026-06-23", time: "10:30" },
  { id: "b0000000-0000-0000-0000-000000000003", qr_hash: "0623-1200-Gabriel-Scarpecci", client_name: "Gabriel Scarpecci",date: "2026-06-23", time: "12:00" },
  { id: "b0000000-0000-0000-0000-000000000004", qr_hash: "0623-1530-Diego-Prefectura",  client_name: "Diego Prefectura", date: "2026-06-23", time: "15:30" },
  { id: "b0000000-0000-0000-0000-000000000005", qr_hash: "0623-1600-Sepu",              client_name: "Sepu",             date: "2026-06-23", time: "16:00" },
  // Jueves 2026-06-25
  { id: "b0000000-0000-0000-0000-000000000006", qr_hash: "0625-0930-Fede-Dabarno",      client_name: "Fede Dabarno",     date: "2026-06-25", time: "09:30" },
  { id: "b0000000-0000-0000-0000-000000000007", qr_hash: "0625-1200-Juan-Gabriel",      client_name: "Juan Gabriel",     date: "2026-06-25", time: "12:00" },
  { id: "b0000000-0000-0000-0000-000000000008", qr_hash: "0625-1800-Tete-Spina",        client_name: "Tete Spina",       date: "2026-06-25", time: "18:00" },
  { id: "b0000000-0000-0000-0000-000000000009", qr_hash: "0625-1900-Matias-Sempio",     client_name: "Matias Sempio",    date: "2026-06-25", time: "19:00" },
];

async function main() {
  console.log("🔧 Generando turnos de Fede — semana 23-26 jun...\n");

  const outDir = join(__dirname, "../public/fixtures/qr/semana-fede");
  mkdirSync(outDir, { recursive: true });

  for (const appt of APPOINTMENTS) {
    const { error } = await supabase.from("appointments").upsert(
      {
        id: appt.id,
        barber_id: BARBER_ID,
        service_id: SERVICE_ID,
        client_name: appt.client_name,
        client_phone: "3402000000",
        appointment_date: appt.date,
        appointment_time: appt.time,
        qr_hash: appt.qr_hash,
        status: "confirmed",
        is_fixed_weekly: false,
        final_price: 14000,
        deposit_paid: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(`  ✗ ${appt.qr_hash} — DB error: ${error.message}`);
    } else {
      console.log(`  ✓ ${appt.qr_hash}`);
    }

    const qrPath = join(outDir, `${appt.qr_hash}.png`);
    await QRCode.toFile(qrPath, appt.qr_hash, { width: 300, margin: 2 });
  }

  console.log(`\n✅ ${APPOINTMENTS.length} QRs generados en: ${outDir}`);
}

main().catch(console.error);
