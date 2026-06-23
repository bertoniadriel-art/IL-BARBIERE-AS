import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { SCANNER_FIXTURES } from "./scanner-fixtures";

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
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BARBER_ID = "1755f2ef-3156-4dbe-bba1-31dea3c44be8";
const SERVICE_ID = "92b4f11d-5c7c-4b19-9d4f-0e7eb7a3db8a";

async function main() {
  console.log("🔧 Generando fixtures de Scanner...\n");

  const outDir = join(__dirname, "../public/fixtures/qr");
  mkdirSync(outDir, { recursive: true });

  for (const fixture of SCANNER_FIXTURES) {
    const { error } = await supabase.from("appointments").upsert(
      {
        id: fixture.id,
        barber_id: BARBER_ID,
        service_id: SERVICE_ID,
        client_name: fixture.client_name,
        client_phone: fixture.client_phone,
        appointment_date: fixture.appointment_date,
        appointment_time: fixture.appointment_time,
        qr_hash: fixture.qr_hash,
        status: fixture.status,
        is_fixed_weekly: false,
        final_price: 14000,
        deposit_paid: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(`  ✗ ${fixture.qr_hash} — DB error: ${error.message}`);
    } else {
      console.log(`  ✓ ${fixture.qr_hash} — inserted`);
    }

    const qrPath = join(outDir, `${fixture.qr_hash}.png`);
    await QRCode.toFile(qrPath, fixture.qr_hash, {
      width: 300,
      margin: 2,
    });
  }

  console.log(`\n📁 QRs generados en: ${outDir}`);
  console.log("\n📋 Resumen:");
  console.log("┌─────────────────────┬──────────────────────────┐");
  console.log("│ QR Hash             │ Resultado esperado       │");
  console.log("├─────────────────────┼──────────────────────────┤");
  for (const f of SCANNER_FIXTURES) {
    console.log(`│ ${f.qr_hash.padEnd(19)} │ ${f.expected.padEnd(24)} │`);
  }
  console.log("└─────────────────────┴──────────────────────────┘");
  console.log("\n✅ Listo para testing manual del ScannerModule");
}

main().catch(console.error);
