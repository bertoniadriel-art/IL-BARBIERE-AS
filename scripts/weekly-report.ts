/**
 * Weekly KPI dashboard generator for IL BARBIERE OS.
 *
 * Reports the most recent completed work-week (the barbershop works Tue–Sat,
 * closed Sun+Mon). Run every Sunday via cron; it auto-computes the just-finished
 * Tue→Sat window. Override with:  bun scripts/weekly-report.ts --from 2026-07-14 --to 2026-07-18
 *
 * Data: live Supabase (anon key from .env.production.local — service role key is
 * empty locally; RLS allows read on appointments).
 * Occupancy is real: occupied 30-min slot-units (attended+confirmed, weighted by
 * service duration) over each barber's scheduled capacity from BARBERS_CONFIG.
 *
 * Output: ~/Documents/Adriel-Core/02_BARBIERE-AS/informes-semanales/
 *   - il-barbiere-semanal-<from>_a_<to>.html   (dated archive)
 *   - il-barbiere-semanal-latest.html          (stable "most recent" copy)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getAvailableTimesForBarber } from '../src/shared/config/barbers';
import { isClosureName, isClosureRow } from '../src/shared/lib/closures';

const OUT_DIR = join(homedir(), 'Documents/Adriel-Core/02_BARBIERE-AS/informes-semanales');

// 30-min slots 08:00–20:00 — same base grid the app uses.
const BASE_TIMES = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type Row = {
  appointment_date: string;
  appointment_time: string;
  status: string;
  final_price: number | null;
  client_name: string | null;
  barbers: { name: string } | null;
  services: { name: string; duration_min: number } | null;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Most recent completed Tue–Sat window relative to `run` (Sunday cron friendly). */
function resolveWindow(run: Date): { from: string; to: string } {
  const dow = run.getDay(); // 0 Sun .. 6 Sat
  const back = dow === 6 ? 7 : dow + 1; // Sun->1, Mon->2, ... , Sat->7 (use previous Sat)
  const sat = addDays(run, -back);
  const tue = addDays(sat, -4);
  return { from: iso(tue), to: iso(sat) };
}

function loadEnv() {
  const raw = readFileSync('.env.production.local', 'utf8');
  const env: Record<string, string> = {};
  for (const l of raw.split('\n')) {
    const t = l.trim();
    if (!t || t[0] === '#' || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const slotsFor = (durationMin: number) => Math.max(1, Math.ceil((durationMin || 30) / 30));

function datesInWindow(from: string, to: string): { iso: string; d: Date; label: string }[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const out = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    out.push({ iso: iso(d), d: new Date(d), label: `${WEEKDAYS[d.getDay()]} ${d.getDate()}` });
  }
  return out;
}

async function sbFetch(env: Record<string, string>, qs: string): Promise<any[]> {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/appointments?${qs}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const humanDate = (isoStr: string) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

async function main() {
  const win = arg('from') && arg('to') ? { from: arg('from')!, to: arg('to')! } : resolveWindow(new Date());
  const { from: FROM, to: TO } = win;
  const prevFrom = iso(addDays(new Date(FROM.split('-').map(Number)[0], FROM.split('-').map(Number)[1] - 1, FROM.split('-').map(Number)[2]), -7));
  const prevTo = iso(addDays(new Date(TO.split('-').map(Number)[0], TO.split('-').map(Number)[1] - 1, TO.split('-').map(Number)[2]), -7));

  const env = loadEnv();
  const select =
    'select=appointment_date,appointment_time,status,final_price,client_name,barbers(name),services(name,duration_min)';
  const rows: Row[] = await sbFetch(env, `${select}&appointment_date=gte.${FROM}&appointment_date=lte.${TO}`);
  const prevRows: Row[] = await sbFetch(
    env,
    `select=status,final_price&appointment_date=gte.${prevFrom}&appointment_date=lte.${prevTo}`
  );
  const hist: { client_name: string; appointment_date: string }[] = await sbFetch(
    env,
    'select=client_name,appointment_date&order=appointment_date.asc'
  );

  const firstVisit: Record<string, string> = {};
  for (const r of hist) {
    const n = (r.client_name || '').trim();
    if (isClosureName(n)) continue;
    if (n && !firstVisit[n]) firstVisit[n] = r.appointment_date;
  }

  const days = datesInWindow(FROM, TO);
  // Shop closures are booked as ordinary appointments, so status alone does not
  // separate them — see src/shared/lib/closures.ts.
  const live = rows.filter((r) => !isClosureRow(r));
  const attended = live.filter((r) => r.status === 'attended');
  const confirmed = live.filter((r) => r.status === 'confirmed');
  const cancelled = live.filter((r) => r.status === 'cancelled');
  const noShows = live.filter((r) => r.status === 'no-show' || r.status === 'no_show');
  const occupyingStatuses = new Set(['attended', 'confirmed']);

  const facturacion = attended.reduce((s, r) => s + (r.final_price || 0), 0);
  const ticket = attended.length ? facturacion / attended.length : 0;
  const cancelRate = live.length ? (cancelled.length / live.length) * 100 : 0;
  const prevFact = prevRows.filter((r) => r.status === 'attended').reduce((s, r) => s + (r.final_price || 0), 0);
  const growth = prevFact ? ((facturacion - prevFact) / prevFact) * 100 : null;

  const dayTurnos: Record<string, number> = {};
  const dayFact: Record<string, number> = {};
  for (const d of days) {
    dayTurnos[d.iso] = 0;
    dayFact[d.iso] = 0;
  }
  for (const r of live) if (dayTurnos[r.appointment_date] != null) dayTurnos[r.appointment_date]++;
  for (const r of attended) if (dayFact[r.appointment_date] != null) dayFact[r.appointment_date] += r.final_price || 0;

  const svc: Record<string, number> = {};
  for (const r of attended) {
    const n = r.services?.name || 'Otro';
    svc[n] = (svc[n] || 0) + 1;
  }
  const svcEntries = Object.entries(svc).sort((a, b) => b[1] - a[1]);

  const hours: Record<string, number> = {};
  for (const r of attended) {
    const h = (r.appointment_time || '').slice(0, 5);
    hours[h] = (hours[h] || 0) + 1;
  }
  const hourKeys = Object.keys(hours).sort();

  type B = { turnos: number; fact: number; cancel: number; svc: Record<string, number>; occupiedSlots: number; capacitySlots: number };
  const barbers: Record<string, B> = {};
  const ensure = (n: string): B =>
    (barbers[n] = barbers[n] || { turnos: 0, fact: 0, cancel: 0, svc: {}, occupiedSlots: 0, capacitySlots: 0 });
  for (const r of live) {
    const n = r.barbers?.name || 'Sin asignar';
    const b = ensure(n);
    if (r.status === 'attended') {
      b.turnos++;
      b.fact += r.final_price || 0;
      const s = r.services?.name || 'Otro';
      b.svc[s] = (b.svc[s] || 0) + 1;
    }
    if (r.status === 'cancelled') b.cancel++;
    if (occupyingStatuses.has(r.status)) b.occupiedSlots += slotsFor(r.services?.duration_min ?? 30);
  }
  for (const name of Object.keys(barbers)) {
    let cap = 0;
    for (const d of days) cap += getAvailableTimesForBarber(name, d.d, BASE_TIMES).length;
    barbers[name].capacitySlots = cap;
  }
  const barberList = Object.entries(barbers).sort((a, b) => b[1].turnos - a[1].turnos);
  const totalAttended = attended.length || 1;

  const clientVisits: Record<string, number> = {};
  for (const r of live) {
    const n = (r.client_name || '').trim();
    if (!n) continue;
    clientVisits[n] = (clientVisits[n] || 0) + 1;
  }
  const topClients = Object.entries(clientVisits).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const now = new Date();
  const genStamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const rangeLabel = `${humanDate(FROM)} – ${humanDate(TO)} ${FROM.slice(0, 4)}`;

  const html = render({
    total: live.length, attended: attended.length, confirmed: confirmed.length, cancelled: cancelled.length,
    noShows: noShows.length, facturacion, ticket, cancelRate, growth, days, dayTurnos, dayFact, svcEntries,
    hours, hourKeys, barberList, totalAttended, topClients, firstVisit, genStamp, rangeLabel,
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const dated = join(OUT_DIR, `il-barbiere-semanal-${FROM}_a_${TO}.html`);
  const latest = join(OUT_DIR, 'il-barbiere-semanal-latest.html');
  writeFileSync(dated, html);
  writeFileSync(latest, html);
  console.log(`[${new Date().toISOString()}] OK — ${rangeLabel}: ${live.length} turnos, ${money(facturacion)}`);
  console.log(`  → ${dated}`);
  console.log(`  → ${latest}`);
}

function render(d: any) {
  const dayLabels = d.days.map((x: any) => x.label);
  const dayTurnosArr = d.days.map((x: any) => d.dayTurnos[x.iso] || 0);
  const dayFactArr = d.days.map((x: any) => d.dayFact[x.iso] || 0);
  const svcLabels = d.svcEntries.map((e: any) => e[0]);
  const svcData = d.svcEntries.map((e: any) => e[1]);
  const hourData = d.hourKeys.map((h: string) => d.hours[h]);
  const barberDistLabels = d.barberList.map((b: any) => b[0]);
  const barberDistData = d.barberList.map((b: any) => b[1].turnos);
  const growthStr = d.growth == null ? '—' : (d.growth >= 0 ? '+' : '') + d.growth.toFixed(0) + '%';
  const growthColor = d.growth == null ? 'var(--text-secondary)' : d.growth >= 0 ? 'var(--neon-cyan)' : 'var(--danger)';

  const kpi = (label: string, val: any, sub: string, color: string) => `
    <div class="kpi"><div class="kpi-label">${label}</div>
      <div class="kpi-val" style="color:${color}">${val}</div>
      <div class="kpi-sub">${sub}</div></div>`;

  const barberCards = d.barberList
    .map(([name, b]: any) => {
      const star = Object.entries(b.svc).sort((x: any, y: any) => y[1] - x[1])[0]?.[0] || '—';
      const tkt = b.turnos ? b.fact / b.turnos : 0;
      const occ = b.capacitySlots ? Math.round((b.occupiedSlots / b.capacitySlots) * 100) : 0;
      return `<div class="barber">
      <h3>${name}</h3>
      <div class="row"><span>Turnos atendidos</span><b>${b.turnos}</b></div>
      <div class="row"><span>Facturación</span><b>${money(b.fact)}</b></div>
      <div class="row"><span>Ticket Promedio</span><b>${money(tkt)}</b></div>
      <div class="row"><span>Cancelados</span><b>${b.cancel}</b></div>
      <div class="row"><span>Servicio Estrella</span><b>${star}</b></div>
      <div class="occ-label">Ocupación real · ${occ}% <span class="occ-detail">(${b.occupiedSlots} de ${b.capacitySlots} slots de 30′)</span></div>
      <div class="occ"><div class="occ-fill" style="width:${Math.min(occ, 100)}%"></div></div>
    </div>`;
    })
    .join('');

  const clientRows = d.topClients
    .map(([name, v]: any) => {
      const fv = d.firstVisit[name];
      const fvStr = fv ? `${fv.slice(8, 10)}/${fv.slice(5, 7)}/${fv.slice(0, 4)}` : '—';
      const freq = v >= 4 ? ['Frecuente', 'var(--success)'] : ['Regular', 'var(--warning)'];
      return `<tr><td>${name}</td><td>${v}</td><td>${fvStr}</td>
      <td><span class="tag" style="color:${freq[1]};border-color:${freq[1]}">${freq[0]}</span></td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IL BARBIERE OS — ${d.rangeLabel}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Exo+2:wght@300;400;500;600&display=swap');
:root{--neon-cyan:#00d4ff;--neon-purple:#a855f7;--neon-pink:#ec4899;--bg-primary:#080808;--bg-card:#111;--border:#222;--text-primary:#e0e0e0;--text-secondary:#8a8a8a;--success:#22c55e;--warning:#f59e0b;--danger:#ef4444;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Exo 2',sans-serif;background:var(--bg-primary);color:var(--text-primary);min-height:100vh}
.header{background:linear-gradient(135deg,#0a0a0a,#1a0a2e 50%,#0a0a0a);border-bottom:1px solid var(--border);padding:2rem;text-align:center}
.header h1{font-family:'Rajdhani',sans-serif;font-size:2.5rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(90deg,var(--neon-cyan),var(--neon-purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.header .subtitle{color:var(--text-secondary);font-size:.95rem;margin-top:.4rem}
.header .date-range{display:inline-block;margin-top:.9rem;padding:.35rem 1rem;border:1px solid var(--neon-cyan);border-radius:20px;color:var(--neon-cyan);font-size:.85rem}
.wrap{max-width:1180px;margin:0 auto;padding:2rem 1.5rem}
.grid{display:grid;gap:1.1rem}
.kpis{grid-template-columns:repeat(4,1fr)}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.2rem;position:relative;overflow:hidden}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--neon-cyan),var(--neon-purple))}
.kpi-label{color:var(--text-secondary);font-size:.72rem;letter-spacing:1px;text-transform:uppercase}
.kpi-val{font-family:'Rajdhani',sans-serif;font-size:2rem;font-weight:700;margin:.3rem 0}
.kpi-sub{color:var(--text-secondary);font-size:.78rem}
.charts{grid-template-columns:1fr 1fr;margin-top:1.1rem}
@media(max-width:900px){.charts{grid-template-columns:1fr}}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.3rem}
.card h2{font-family:'Rajdhani',sans-serif;font-size:1.05rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;color:var(--text-primary)}
.section-title{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:2rem 0 1rem;color:var(--neon-cyan)}
.barbers{grid-template-columns:1fr 1fr}
@media(max-width:900px){.barbers{grid-template-columns:1fr}}
.barber{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.4rem}
.barber h3{font-family:'Rajdhani',sans-serif;font-size:1.2rem;letter-spacing:1px;margin-bottom:1rem;color:var(--neon-purple)}
.barber .row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #1a1a1a;font-size:.9rem}
.barber .row span{color:var(--text-secondary)}
.occ-label{color:var(--text-secondary);font-size:.75rem;margin:.9rem 0 .35rem}
.occ-detail{opacity:.7}
.occ{height:8px;background:#1a1a1a;border-radius:5px;overflow:hidden}
.occ-fill{height:100%;background:linear-gradient(90deg,var(--neon-cyan),var(--neon-purple))}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th{text-align:left;color:var(--text-secondary);font-size:.72rem;letter-spacing:1px;text-transform:uppercase;padding:.7rem;border-bottom:1px solid var(--border)}
td{padding:.7rem;border-bottom:1px solid #161616}
.tag{border:1px solid;border-radius:12px;padding:.15rem .6rem;font-size:.72rem}
.foot{text-align:center;color:var(--text-secondary);font-size:.8rem;padding:2rem;border-top:1px solid var(--border);margin-top:2rem}
.foot b{background:linear-gradient(90deg,var(--neon-cyan),var(--neon-purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
canvas{max-height:280px}
</style></head><body>
<div class="header">
  <h1>Il Barbiere OS</h1>
  <div class="subtitle">Dashboard de KPIs — Informe semanal para Santi &amp; Fede</div>
  <div class="date-range">Semana ${d.rangeLabel} (Mar–Sáb) · generado ${d.genStamp}</div>
</div>
<div class="wrap">
  <div class="grid kpis">
    ${kpi('Turnos totales', d.total, `${d.attended} atendidos · ${d.confirmed} confirmados`, 'var(--neon-cyan)')}
    ${kpi('Facturación', money(d.facturacion), `${d.attended} turnos cobrados`, 'var(--success)')}
    ${kpi('Ticket promedio', money(d.ticket), 'por turno atendido', 'var(--neon-purple)')}
    ${kpi('Tasa cancelación', d.cancelRate.toFixed(1) + '%', `${d.cancelled} de ${d.total} turnos`, 'var(--warning)')}
  </div>
  <div class="grid kpis" style="grid-template-columns:repeat(2,1fr);margin-top:1.1rem">
    ${kpi('No-shows', d.noShows, 'turnos perdidos', 'var(--success)')}
    ${kpi('Crecimiento', growthStr, 'facturación vs semana previa', growthColor)}
  </div>

  <div class="grid charts">
    <div class="card"><h2>📈 Evolución diaria</h2><canvas id="evo"></canvas></div>
    <div class="card"><h2>✂️ Servicios más pedidos</h2><canvas id="svc"></canvas></div>
  </div>
  <div class="grid charts">
    <div class="card"><h2>⏰ Horarios pico</h2><canvas id="hrs"></canvas></div>
    <div class="card"><h2>💈 Distribución por barbero</h2><canvas id="brb"></canvas></div>
  </div>

  <div class="section-title">Rendimiento por barbero</div>
  <div class="grid barbers">${barberCards}</div>

  <div class="section-title">Clientes frecuentes</div>
  <div class="card"><table>
    <thead><tr><th>Cliente</th><th>Visitas (semana)</th><th>Primera visita</th><th>Frecuencia</th></tr></thead>
    <tbody>${clientRows}</tbody></table></div>
</div>
<div class="foot">
  Generado por <b>Soluciones Adriel-IA</b> · Consultoría de IA para PyMEs<br>
  Datos en tiempo real desde Supabase · Ocupación = slots ocupados / capacidad horaria real · Actualizado: ${d.genStamp}
</div>
<script>
const CY='#00d4ff',PU='#a855f7',PK='#ec4899',GR='#22c55e';
const gopt={plugins:{legend:{labels:{color:'#8a8a8a',font:{family:'Exo 2'}}}},scales:{x:{ticks:{color:'#8a8a8a'},grid:{color:'#1a1a1a'}},y:{ticks:{color:'#8a8a8a'},grid:{color:'#1a1a1a'}}}};
new Chart(evo,{type:'bar',data:{labels:${JSON.stringify(dayLabels)},datasets:[
  {label:'Turnos',data:${JSON.stringify(dayTurnosArr)},backgroundColor:CY+'cc',yAxisID:'y'},
  {label:'Facturación ($)',data:${JSON.stringify(dayFactArr)},type:'line',borderColor:PU,backgroundColor:PU,tension:.35,yAxisID:'y1'}]},
  options:{...gopt,scales:{...gopt.scales,y1:{position:'right',ticks:{color:'#8a8a8a'},grid:{drawOnChartArea:false}}}}});
new Chart(svc,{type:'doughnut',data:{labels:${JSON.stringify(svcLabels)},datasets:[{data:${JSON.stringify(svcData)},backgroundColor:[CY,PU,PK,GR,'#f59e0b']}]},options:{plugins:{legend:{position:'right',labels:{color:'#8a8a8a'}}}}});
new Chart(hrs,{type:'bar',data:{labels:${JSON.stringify(d.hourKeys)},datasets:[{label:'Turnos',data:${JSON.stringify(hourData)},backgroundColor:PK+'cc'}]},options:gopt});
new Chart(brb,{type:'doughnut',data:{labels:${JSON.stringify(barberDistLabels)},datasets:[{data:${JSON.stringify(barberDistData)},backgroundColor:[CY,PU,PK,GR]}]},options:{plugins:{legend:{position:'right',labels:{color:'#8a8a8a'}}}}});
</script>
</body></html>`;
}

main().catch((e) => {
  console.error(`[${new Date().toISOString()}] ERR`, e.message);
  process.exit(1);
});
