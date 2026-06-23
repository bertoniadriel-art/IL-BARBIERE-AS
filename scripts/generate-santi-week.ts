import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { mkdirSync, readFileSync } from "fs";
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

const SANTI_ID  = "1755f2ef-3156-4dbe-bba1-31dea3c44be8";
const SERVICE_ID = "92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a";

const APPOINTMENTS = [
  // Martes 2026-06-23
  { id: "c0000000-0000-0000-0000-000000000001", qr_hash: "S-0623-1030-Eloy",           client_name: "Eloy",            date: "2026-06-23", time: "10:30" },
  { id: "c0000000-0000-0000-0000-000000000002", qr_hash: "S-0623-1100-Gio",             client_name: "Gio",             date: "2026-06-23", time: "11:00" },
  { id: "c0000000-0000-0000-0000-000000000003", qr_hash: "S-0623-1200-Gustavo-Franze",  client_name: "Gustavo Franze",  date: "2026-06-23", time: "12:00" },
  { id: "c0000000-0000-0000-0000-000000000004", qr_hash: "S-0623-1400-Mama-Agustin",    client_name: "Mamá Agustín",    date: "2026-06-23", time: "14:00" },
  { id: "c0000000-0000-0000-0000-000000000005", qr_hash: "S-0623-1700-Bruno-T",         client_name: "Bruno T",         date: "2026-06-23", time: "17:00" },
  { id: "c0000000-0000-0000-0000-000000000006", qr_hash: "S-0623-1730-Tulio",           client_name: "Tulio",           date: "2026-06-23", time: "17:30" },
  { id: "c0000000-0000-0000-0000-000000000007", qr_hash: "S-0623-1800-Andy",            client_name: "Andy",            date: "2026-06-23", time: "18:00" },
  { id: "c0000000-0000-0000-0000-000000000008", qr_hash: "S-0623-1830-Franco-Vannelli", client_name: "Franco Vannelli", date: "2026-06-23", time: "18:30" },
  // Miércoles 2026-06-24
  { id: "c0000000-0000-0000-0000-000000000009", qr_hash: "S-0624-1100-Guido-Fama",      client_name: "Guido Fama",      date: "2026-06-24", time: "11:00" },
  { id: "c0000000-0000-0000-0000-000000000010", qr_hash: "S-0624-1400-Juampi-Matetti",  client_name: "Juampi Matetti",  date: "2026-06-24", time: "14:00" },
  { id: "c0000000-0000-0000-0000-000000000011", qr_hash: "S-0624-1600-Nacho-Gianini",   client_name: "Nacho Gianini",   date: "2026-06-24", time: "16:00" },
  { id: "c0000000-0000-0000-0000-000000000012", qr_hash: "S-0624-1630-Jehiel",          client_name: "Jehiel",          date: "2026-06-24", time: "16:30" },
  { id: "c0000000-0000-0000-0000-000000000013", qr_hash: "S-0624-1700-Cepi",            client_name: "Cepi",            date: "2026-06-24", time: "17:00" },
  { id: "c0000000-0000-0000-0000-000000000014", qr_hash: "S-0624-1730-Mati-Miche",      client_name: "Mati Miche",      date: "2026-06-24", time: "17:30" },
  { id: "c0000000-0000-0000-0000-000000000015", qr_hash: "S-0624-1830-Agu-Fer",         client_name: "Agu Fer",         date: "2026-06-24", time: "18:30" },
  // Jueves 2026-06-25
  { id: "c0000000-0000-0000-0000-000000000016", qr_hash: "S-0625-1100-Victor-Sala",     client_name: "Victor Sala",     date: "2026-06-25", time: "11:00" },
  { id: "c0000000-0000-0000-0000-000000000017", qr_hash: "S-0625-1200-Dami",            client_name: "Dami",            date: "2026-06-25", time: "12:00" },
  { id: "c0000000-0000-0000-0000-000000000018", qr_hash: "S-0625-1530-Nico-Giova",      client_name: "Nico Giova",      date: "2026-06-25", time: "15:30" },
  { id: "c0000000-0000-0000-0000-000000000019", qr_hash: "S-0625-1830-Victor-Sala-2",   client_name: "Victor Sala",     date: "2026-06-25", time: "18:30" },
  // Viernes 2026-06-26
  { id: "c0000000-0000-0000-0000-000000000020", qr_hash: "S-0626-1130-Ale-Bovalini",    client_name: "Ale Bovalini",    date: "2026-06-26", time: "11:30" },
  { id: "c0000000-0000-0000-0000-000000000021", qr_hash: "S-0626-1400-Tiziano",         client_name: "Tiziano",         date: "2026-06-26", time: "14:00" },
  { id: "c0000000-0000-0000-0000-000000000022", qr_hash: "S-0626-1430-Galgo",           client_name: "Galgo",           date: "2026-06-26", time: "14:30" },
  { id: "c0000000-0000-0000-0000-000000000023", qr_hash: "S-0626-1500-Leiva",           client_name: "Leiva",           date: "2026-06-26", time: "15:00" },
  { id: "c0000000-0000-0000-0000-000000000024", qr_hash: "S-0626-1630-Ivan",            client_name: "Ivan",            date: "2026-06-26", time: "16:30" },
  { id: "c0000000-0000-0000-0000-000000000025", qr_hash: "S-0626-1700-Bauti-Buffoni",   client_name: "Bauti Buffoni",   date: "2026-06-26", time: "17:00" },
];

async function main() {
  console.log("🔧 Generando turnos de Santi — semana 23-26 jun...\n");

  const outDir = join(__dirname, "../public/fixtures/qr/semana-santi");
  mkdirSync(outDir, { recursive: true });

  for (const appt of APPOINTMENTS) {
    const { error } = await supabase.from("appointments").upsert(
      {
        id: appt.id,
        barber_id: SANTI_ID,
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
      console.error(`  ✗ ${appt.qr_hash} — ${error.message}`);
    } else {
      console.log(`  ✓ ${appt.qr_hash}`);
    }

    const qrPath = join(outDir, `${appt.qr_hash}.png`);
    await QRCode.toFile(qrPath, appt.qr_hash, { width: 300, margin: 2 });
  }

  console.log(`\n✅ ${APPOINTMENTS.length} QRs generados en: ${outDir}`);
}

main().catch(console.error);
