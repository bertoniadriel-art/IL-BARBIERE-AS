/**
 * seed-test-qr.js
 *
 * Inserts a test appointment for TODAY in Supabase with a known qr_hash,
 * then generates the QR PNG at public/fixtures/qr/SEED-TODAY.png.
 *
 * Usage:
 *   node scripts/seed-test-qr.js
 *   node scripts/seed-test-qr.js --barber fede
 *   node scripts/seed-test-qr.js --time 15:00
 *   node scripts/seed-test-qr.js --status confirmed
 */

const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// --- Config from .env.local ---
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

// --- CLI args ---
function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

async function main() {
  const env = loadEnv();
  const url = env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // 1. Resolve barber
  const barberArg = getArg('barber', 'santi').toLowerCase();
  const { data: barbers, error: barberErr } = await supabase
    .from('barbers')
    .select('id, name')
    .ilike('name', `%${barberArg}%`)
    .limit(1);

  if (barberErr || !barbers?.length) {
    console.error('❌ Barber not found. Try --barber santi or --barber fede');
    process.exit(1);
  }
  const barber = barbers[0];

  // 2. Build appointment data
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const timeArg = getArg('time', '10:00');
  const statusArg = getArg('status', 'confirmed');
  const qrHash = `SEED-TEST-${Date.now()}`;

  const appointment = {
    barber_id: barber.id,
    client_name: 'Cliente Test QR',
    client_phone: '3400000000',
    appointment_date: dateStr,
    appointment_time: `${timeArg}:00`,
    status: statusArg,
    qr_hash: qrHash,
    deposit_paid: true,
    final_price: 12000,
    is_fixed_weekly: false,
  };

  // 3. Insert (upsert on qr_hash to allow re-runs)
  const { data: inserted, error: insertErr } = await supabase
    .from('appointments')
    .upsert(appointment, { onConflict: 'qr_hash' })
    .select()
    .single();

  if (insertErr) {
    console.error('❌ Insert failed:', insertErr.message);
    process.exit(1);
  }

  // 4. Generate QR PNG
  const outputDir = path.resolve(__dirname, '../public/fixtures/qr');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'SEED-TODAY.png');

  await QRCode.toFile(outputPath, qrHash, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  console.log('\n✅ Test appointment seeded!\n');
  console.log(`  Barber:   ${barber.name}`);
  console.log(`  Date:     ${dateStr}`);
  console.log(`  Time:     ${timeArg}`);
  console.log(`  Status:   ${statusArg}`);
  console.log(`  QR Hash:  ${qrHash}`);
  console.log(`  QR PNG:   public/fixtures/qr/SEED-TODAY.png\n`);
  console.log('Next steps:');
  console.log('  1. Open the scanner tab in /gestion-personal');
  console.log('  2. Click the file upload option in the scanner UI');
  console.log('  3. Upload: public/fixtures/qr/SEED-TODAY.png');
  console.log('  4. Should show "Check-in Exitoso" ✅\n');
  console.log(`  Or open the PNG at: file://${outputPath}\n`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
