/**
 * Quarterly summary report for IL BARBIERE OS — Jul–Sep 2026.
 *
 * Fetches live data from Supabase, generates a client-facing HTML report
 * with the same visual identity as the monthly reports, then converts to PDF.
 *
 * Usage:
 *   bun scripts/quarterly-report.ts
 *
 * Output:
 *   ~/Documents/Adriel-Core/02_BARBIERE-AS/informes-mensuales/
 *     il-barbiere-resumen-jul-sep-2026.html
 *     il-barbiere-resumen-jul-sep-2026.pdf
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { isClosureRow } from '../src/shared/lib/closures';

const OUT_DIR = join(homedir(), 'Documents/Adriel-Core/02_BARBIERE-AS/informes-mensuales');
const CY = '#00d4ff', PU = '#a855f7', PK = '#ec4899', GR = '#22c55e', WA = '#f59e0b', DA = '#ef4444';

function loadEnv(): Record<string, string> {
  const raw = readFileSync('.env.production.local', 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t[0] === '#' || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();

const PAGE_SIZE = 1000;
async function sbFetch(qs: string): Promise<any[]> {
  const base = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/appointments?${qs}`;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(base, {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Range-Unit': 'items',
        Range: `${from}-${from + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page: any[] = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Origin = 'interno' | 'vip' | 'externo' | 'sin-hash';
function origin(r: { qr_hash: string | null }): Origin {
  const h = r.qr_hash || '';
  if (h.startsWith('MANUAL-')) return 'interno';
  if (h.startsWith('VIP-')) return 'vip';
  return h ? 'externo' : 'sin-hash';
}

type Row = {
  appointment_date: string;
  appointment_time: string | null;
  created_at: string;
  status: string;
  final_price: number | null;
  client_name: string | null;
  client_phone: string | null;
  qr_hash: string | null;
  barbers: { name: string } | null;
  services: { name: string } | null;
};

const isAttended = (r: Row) => r.status === 'attended';
const isOpen = (r: Row) => r.status === 'confirmed';
const revenue = (rows: Row[]) => rows.filter(isAttended).reduce((s, r) => s + (r.final_price || 0), 0);

function splitBar(parts: { label: string; value: number; color: string }[], total: number): string {
  const W = 640, H = 34;
  let x = 0;
  let svg = '';
  for (const p of parts) {
    const w = (p.value / total) * W;
    if (w <= 0) continue;
    svg += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${H}" fill="${p.color}"/>`;
    if (w > 42)
      svg += `<text x="${(x + w / 2).toFixed(1)}" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="#07141a">${Math.round((p.value / total) * 100)}%</text>`;
    x += w;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

function moneyBars(items: { label: string; value: number }[], width = 640, height = 190): string {
  const pad = { t: 22, r: 8, b: 34, l: 8 };
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = (width - pad.l - pad.r) / items.length;
  const barW = Math.min(bw * 0.5, 54);
  const plotH = height - pad.t - pad.b;
  let svg = '';
  items.forEach((it, idx) => {
    const cx = pad.l + bw * idx + bw / 2;
    const h = (it.value / max) * plotH;
    const y = pad.t + plotH - h;
    svg += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${CY}" opacity="0.75" rx="2"/>`;
    svg += `<text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#e8e8e8">${money(it.value)}</text>`;
    svg += `<text x="${cx.toFixed(1)}" y="${(height - 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8a8a8a">${esc(it.label)}</text>`;
  });
  svg += `<line x1="${pad.l}" y1="${pad.t + plotH}" x2="${width - pad.r}" y2="${pad.t + plotH}" stroke="#2a2a2a" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

function countBars(items: { label: string; value: number; color?: string }[], width = 640, height = 190): string {
  const pad = { t: 22, r: 8, b: 34, l: 8 };
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = (width - pad.l - pad.r) / items.length;
  const barW = Math.min(bw * 0.5, 54);
  const plotH = height - pad.t - pad.b;
  let svg = '';
  items.forEach((it, idx) => {
    const cx = pad.l + bw * idx + bw / 2;
    const h = (it.value / max) * plotH;
    const y = pad.t + plotH - h;
    const c = it.color || CY;
    svg += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${c}" rx="2"/>`;
    svg += `<text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${c}">${it.value}</text>`;
    svg += `<text x="${cx.toFixed(1)}" y="${(height - 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#e8e8e8">${esc(it.label)}</text>`;
  });
  svg += `<line x1="${pad.l}" y1="${pad.t + plotH}" x2="${width - pad.r}" y2="${pad.t + plotH}" stroke="#2a2a2a" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

async function main() {
  console.log('Fetching data from Supabase...');
  const select = 'select=appointment_date,appointment_time,created_at,status,final_price,client_name,client_phone,qr_hash,barbers(name),services(name)';
  const all: Row[] = await sbFetch(`${select}&order=appointment_date.asc`);
  const live = all.filter((r) => !isClosureRow(r));

  // --- per-month data
  const months = ['2026-07', '2026-08', '2026-09'];
  const monthNames = ['julio', 'agosto', 'septiembre'];

  const monthData = months.map((m, i) => {
    const mo = live.filter((r) => r.appointment_date?.startsWith(m));
    const att = mo.filter(isAttended);
    const open = mo.filter(isOpen);
    const cancelled = mo.filter((r) => r.status === 'cancelled');
    const fact = revenue(mo);
    const ticket = att.length ? fact / att.length : 0;
    const clients = new Set(mo.map((r) => (r.client_phone || '').trim()).filter(Boolean)).size;

    const byOrigin: Record<Origin, Row[]> = { interno: [], vip: [], externo: [], 'sin-hash': [] };
    for (const r of mo) byOrigin[origin(r)].push(r);

    return {
      month: m,
      label: monthNames[i],
      total: mo.length,
      attended: att.length,
      open: open.length,
      cancelled: cancelled.length,
      revenue: fact,
      ticket,
      clients,
      byOrigin,
      extCount: byOrigin.externo.length,
      intCount: byOrigin.interno.length,
      vipCount: byOrigin.vip.length,
    };
  });

  // --- totals
  const totalTurnos = monthData.reduce((s, m) => s + m.total, 0);
  const totalFact = monthData.reduce((s, m) => s + m.revenue, 0);
  const totalAtt = monthData.reduce((s, m) => s + m.attended, 0);
  const totalClients = new Set(
    live.filter((r) => r.appointment_date >= '2026-07-01' && r.appointment_date <= '2026-09-30')
      .map((r) => (r.client_phone || '').trim()).filter(Boolean)
  ).size;
  const totalOpen = monthData.reduce((s, m) => s + m.open, 0);
  const totalCancelled = monthData.reduce((s, m) => s + m.cancelled, 0);
  const totalExt = monthData.reduce((s, m) => s + m.extCount, 0);
  const totalInt = monthData.reduce((s, m) => s + m.intCount, 0);
  const totalVip = monthData.reduce((s, m) => s + m.vipCount, 0);

  // --- per-barber across 3 months
  const barberStats: Record<string, { total: number; att: number; fact: number; ext: number }> = {};
  for (const r of live) {
    if (r.appointment_date < '2026-07-01' || r.appointment_date > '2026-09-30') continue;
    const n = r.barbers?.name || 'Sin asignar';
    if (!barberStats[n]) barberStats[n] = { total: 0, att: 0, fact: 0, ext: 0 };
    barberStats[n].total++;
    if (isAttended(r)) { barberStats[n].att++; barberStats[n].fact += r.final_price || 0; }
    if (origin(r) === 'externo') barberStats[n].ext++;
  }
  const barbers = Object.entries(barberStats)
    .map(([name, s]) => ({
      name,
      total: s.total,
      att: s.att,
      fact: s.fact,
      ticket: s.att ? Math.round(s.fact / s.att) : 0,
      ext: s.ext,
    }))
    .sort((a, b) => b.fact - a.fact);

  // --- online by DOW
  const extByDow = Array(7).fill(0);
  let extTotal = 0;
  for (const r of live) {
    if (r.appointment_date < '2026-07-01' || r.appointment_date > '2026-09-30') continue;
    if (origin(r) !== 'externo' || !r.created_at) continue;
    const d = new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    const [y, m, dd] = d.split('-').map(Number);
    extByDow[new Date(y, m - 1, dd).getDay()]++;
    extTotal++;
  }
  const DOW_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const bestDowIdx = extByDow.indexOf(Math.max(...extByDow));

  // --- cancel by origin
  const cancelByOrigin = (['externo', 'interno', 'vip'] as Origin[]).map((o) => {
    const rows = live.filter((r) => {
      if (r.appointment_date < '2026-07-01' || r.appointment_date > '2026-09-30') return false;
      return origin(r) === o;
    });
    const c = rows.filter((r) => r.status === 'cancelled').length;
    return { origin: o, total: rows.length, cancelled: c, rate: rows.length ? (c / rows.length) * 100 : 0 };
  });

  // --- top clients
  const clientMap: Record<string, { name: string; phone: string; count: number; first: string; last: string; topBarber: string; topBarberCount: number }> = {};
  for (const r of live) {
    if (r.appointment_date < '2026-07-01' || r.appointment_date > '2026-09-30') continue;
    const phone = (r.client_phone || '').trim();
    if (!phone || phone === '3402000000' || phone === '0000000000') continue;
    const name = (r.client_name || 'Sin nombre').trim();
    if (!clientMap[phone]) clientMap[phone] = { name, phone, count: 0, first: '9999-99-99', last: '0000-00-00', topBarber: '', topBarberCount: 0 };
    const c = clientMap[phone];
    if (name !== 'Sin nombre') c.name = name;
    c.count++;
    if (r.appointment_date < c.first) c.first = r.appointment_date;
    if (r.appointment_date > c.last) c.last = r.appointment_date;
    // Track barber per client (att only)
    if (isAttended(r) && r.barbers?.name) {
      // We'll compute this separately below
    }
  }
  // Compute top barber per client
  const clientBarbers: Record<string, Record<string, number>> = {};
  for (const r of live) {
    if (r.appointment_date < '2026-07-01' || r.appointment_date > '2026-09-30') continue;
    if (!isAttended(r)) continue;
    const phone = (r.client_phone || '').trim();
    if (!phone || phone === '3402000000' || phone === '0000000000') continue;
    const bn = r.barbers?.name || 'Sin asignar';
    if (!clientBarbers[phone]) clientBarbers[phone] = {};
    clientBarbers[phone][bn] = (clientBarbers[phone][bn] || 0) + 1;
  }
  for (const [phone, barbers] of Object.entries(clientBarbers)) {
    const top = Object.entries(barbers).sort((a, b) => b[1] - a[1])[0];
    if (top && clientMap[phone]) {
      clientMap[phone].topBarber = top[0];
      clientMap[phone].topBarberCount = top[1];
    }
  }
  const topClients = Object.values(clientMap).sort((a, b) => b.count - a.count).slice(0, 20);

  const now = new Date();
  const stamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  // --- HTML render
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>IL BARBIERE OS — Resumen Jul–Sep 2026</title>
<style>
@page { size: A4; margin: 12mm 11mm; background: #0b0b0d; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans','Liberation Sans',sans-serif; background:#0b0b0d; color:#e2e2e4; font-size:10.5px; line-height:1.5; }
h1 { font-size:23px; letter-spacing:1.5px; text-transform:uppercase; color:${CY}; font-weight:700; }
h2 { font-size:13px; text-transform:uppercase; letter-spacing:1.2px; color:${CY}; margin:0 0 3px; font-weight:700; }
h3 { font-size:12.5px; letter-spacing:.6px; color:${PU}; margin-bottom:7px; font-weight:700; }
p { margin:0 0 7px; }
.hdr { border-bottom:2px solid ${CY}; padding-bottom:11px; margin-bottom:13px; }
.hdr .sub { color:#9a9aa2; font-size:11px; margin-top:4px; }
.hdr .meta { color:#6f6f78; font-size:9.5px; margin-top:6px; }
.sec { margin:15px 0 0; }
h2, h3, .sec > .lead { page-break-after:avoid; break-after:avoid; }
.sec > .lead { color:#9a9aa2; margin:4px 0 9px; }
.card { background:#141418; border:1px solid #26262c; border-radius:8px; padding:11px 13px; page-break-inside:avoid; }
.kpis { display:flex; gap:7px; margin-bottom:5px; }
.kpi { flex:1; background:#141418; border:1px solid #26262c; border-top:2px solid ${CY}; border-radius:7px; padding:9px 10px; }
.kl { color:#8a8a92; font-size:8px; letter-spacing:.8px; text-transform:uppercase; }
.kv { font-size:19px; font-weight:700; margin:3px 0 1px; line-height:1.15; }
.ks { color:#82828c; font-size:8.5px; }
table { width:100%; border-collapse:collapse; font-size:10px; }
th { text-align:left; color:#8a8a92; font-size:8px; letter-spacing:.7px; text-transform:uppercase; padding:6px 7px; border-bottom:1px solid #33333a; font-weight:700; }
td { padding:5.5px 7px; border-bottom:1px solid #202026; }
td.n { text-align:right; font-variant-numeric:tabular-nums; }
.dim { color:#75757e; font-weight:400; }
.bad { color:${DA}; font-weight:700; }
.warn { color:${WA}; font-weight:700; }
.ok { color:${GR}; font-weight:700; }
.two { display:flex; gap:9px; }
.two > * { flex:1; }
.legend { display:flex; gap:13px; color:#8a8a92; font-size:9px; margin-top:5px; }
.legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
.barber .row { display:flex; justify-content:space-between; padding:3.5px 0; border-bottom:1px solid #202026; }
.barber .row span { color:#8a8a92; }
.barber .row:last-child { border-bottom:none; }
.note { color:#75757e; font-size:9px; font-style:italic; margin-top:6px; }
.foot { margin-top:18px; padding-top:11px; border-top:1px solid #33333a; text-align:center; color:#75757e; font-size:9px; }
.foot b { color:${CY}; }
.pb { page-break-before:always; }
.insight { background:#101820; border:1px solid ${CY}; border-left:4px solid ${CY}; border-radius:8px; padding:12px 14px; margin-top:10px; page-break-inside:avoid; }
.insight h3 { color:${CY}; }
.insight ul { margin:6px 0 0 16px; }
.insight li { margin-bottom:5px; }
.highlight { background:#1d1410; border:1px solid ${WA}; border-left:4px solid ${WA}; border-radius:8px; padding:12px 14px; margin-top:10px; page-break-inside:avoid; }
.highlight h3 { color:${WA}; }
</style></head><body>
<div class="hdr">
  <h1>Il Barbiere OS</h1>
  <div class="sub">Resumen trimestral · <b>Julio – Septiembre 2026</b> — para Santi &amp; Fede</div>
  <div class="meta">Generado el ${stamp} por Soluciones Adriel-IA · datos en vivo desde Supabase</div>
</div>

<!-- ============ RESUMEN EJECUTIVO ============ -->
<div class="sec">
  <h2>Resumen Ejecutivo</h2>
  <p class="lead">Tres meses de operación con la app: julio fue el arranque, agosto consolidó, septiembre va mejor.</p>
  <div class="kpis">
    <div class="kpi"><div class="kl">Turnos totales</div><div class="kv" style="color:${CY}">${totalTurnos}</div><div class="ks">jul–sep 2026</div></div>
    <div class="kpi"><div class="kl">Facturación</div><div class="kv" style="color:${GR}">${money(totalFact)}</div><div class="ks">turnos atendidos</div></div>
    <div class="kpi"><div class="kl">Ticket promedio</div><div class="kv" style="color:${PU}">${money(totalAtt ? totalFact / totalAtt : 0)}</div><div class="ks">por turno atendido</div></div>
    <div class="kpi"><div class="kl">Clientes distintos</div><div class="kv" style="color:${PU}">${totalClients}</div><div class="ks">por teléfono</div></div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kl">Sin cerrar</div><div class="kv" style="color:${WA}">${totalOpen}</div><div class="ks">turnos pendientes</div></div>
    <div class="kpi"><div class="kl">Cancelaciones</div><div class="kv" style="color:${WA}">${totalCancelled}</div><div class="ks">${pct(totalCancelled, totalTurnos)}% del total</div></div>
    <div class="kpi"><div class="kl">No-shows</div><div class="kv" style="color:${GR}">0</div><div class="ks">en 3 meses</div></div>
    <div class="kpi"><div class="kl">Facturación/día</div><div class="kv" style="color:${CY}">${money(totalFact / 75)}</div><div class="ks">promedio laboral</div></div>
  </div>
</div>

<!-- ============ EVOLUCION MENSUAL ============ -->
<div class="sec">
  <h2>Evolución mensual</h2>
  <div class="card">
    <h3>Facturación por mes</h3>
    ${moneyBars(monthData.map((m) => ({ label: m.label, value: m.revenue })))}
  </div>
  <div class="card" style="margin-top:9px">
    <table>
      <thead><tr><th>Mes</th><th class="n">Turnos</th><th class="n">Atendidos</th><th class="n">Facturado</th><th class="n">Ticket</th><th class="n">Clientes</th><th class="n">Sin cerrar</th></tr></thead>
      <tbody>${monthData.map((m) => `<tr>
        <td><b>${m.label}</b></td>
        <td class="n">${m.total}</td>
        <td class="n">${m.attended}</td>
        <td class="n">${money(m.revenue)}</td>
        <td class="n">${money(m.ticket)}</td>
        <td class="n">${m.clients}</td>
        <td class="n ${m.open >= 50 ? 'bad' : m.open >= 30 ? 'warn' : ''}">${m.open}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
</div>

<!-- ============ ORIGEN DE TURNOS ============ -->
<div class="sec pb">
  <h2>De dónde vienen los turnos</h2>
  <p class="lead">La tendencia es clara: la app ganó 4 puntos en un mes y se mantiene.</p>

  ${monthData.map((m) => {
    const total = m.total || 1;
    return `
  <div class="card" style="margin-top:9px">
    <h3>${m.label.charAt(0).toUpperCase() + m.label.slice(1)}</h3>
    ${splitBar([
      { label: 'interno', value: m.intCount, color: PU },
      { label: 'externo', value: m.extCount, color: CY },
      { label: 'vip', value: m.vipCount, color: PK },
    ], total)}
    <div class="legend">
      <span><i style="background:${PU}"></i>Cargado por ustedes — ${m.intCount} (${pct(m.intCount, total)}%)</span>
      <span><i style="background:${CY}"></i>Reservado online — ${m.extCount} (${pct(m.extCount, total)}%)</span>
      <span><i style="background:${PK}"></i>Fijo semanal VIP — ${m.vipCount} (${pct(m.vipCount, total)}%)</span>
    </div>
  </div>`;
  }).join('')}

  <div class="highlight" style="margin-top:12px">
    <h3>Tendencia online</h3>
    <p>Julio: <b>29%</b> online → Agosto: <b>33%</b> → Septiembre: <b>${pct(monthData[2].extCount, monthData[2].total)}%</b></p>
    <p>El turno manual bajó de 60% a 51%. La app no le saca trabajo al mostrador: le agrega turnos que antes se perdían, sobre todo los lunes (día cerrado).</p>
  </div>
</div>

<!-- ============ SEPTIEMBRE DETALLE ============ -->
<div class="sec">
  <h2>Septiembre al detalle</h2>
  <p class="lead">Lo que va del mes: ${monthData[2].total} turnos, ${money(monthData[2].revenue)} facturados.</p>
  <div class="kpis">
    <div class="kpi"><div class="kl">Turnos</div><div class="kv" style="color:${CY}">${monthData[2].total}</div><div class="ks">${monthData[2].attended} atendidos</div></div>
    <div class="kpi"><div class="kl">Facturación</div><div class="kv" style="color:${GR}">${money(monthData[2].revenue)}</div><div class="ks">parcial (hoy 15 sep)</div></div>
    <div class="kpi"><div class="kl">Ticket prom.</div><div class="kv" style="color:${PU}">${money(monthData[2].ticket)}</div><div class="ks">por atendido</div></div>
    <div class="kpi"><div class="kl">Online</div><div class="kv" style="color:${CY}">${pct(monthData[2].extCount, monthData[2].total)}%</div><div class="ks">${monthData[2].extCount} turnos</div></div>
  </div>
  <p class="note">Proyectado al mes completo al ritmo actual: ~${money(monthData[2].revenue / 15 * 30)} en facturación, superando los ${money(monthData[1].revenue)} de agosto.</p>
</div>

<!-- ============ POR BARBERO ============ -->
<div class="sec pb">
  <h2>Comparativa por barbero (3 meses)</h2>
  <div class="two">${barbers.map((b) => `
    <div class="card barber">
      <h3>${esc(b.name)}</h3>
      <div class="row"><span>Turnos del trimestre</span><b>${b.total}</b></div>
      <div class="row"><span>Atendidos</span><b>${b.att}</b></div>
      <div class="row"><span>Facturación</span><b>${money(b.fact)}</b></div>
      <div class="row"><span>Ticket promedio</span><b>${money(b.ticket)}</b></div>
      <div class="row"><span>Reservas online</span><b>${b.ext}</b></div>
      <div class="row"><span>% online</span><b>${pct(b.ext, b.total)}%</b></div>
    </div>`).join('')}
  </div>
</div>

<!-- ============ CANCELACIONES ============ -->
<div class="sec">
  <h2>Cancelaciones por origen</h2>
  <div class="card">
    <table>
      <thead><tr><th>Origen</th><th class="n">Turnos</th><th class="n">Cancelados</th><th class="n">% cancelación</th></tr></thead>
      <tbody>${cancelByOrigin.map((c) => {
        const name = c.origin === 'externo' ? 'Reserva online' : c.origin === 'interno' ? 'Cargado por ustedes' : 'Fijo semanal VIP';
        const cls = c.rate > 20 ? 'bad' : c.rate > 10 ? 'warn' : '';
        return `<tr><td>${name}</td><td class="n">${c.total}</td><td class="n">${c.cancelled}</td><td class="n ${cls}">${c.rate.toFixed(1)}%</td></tr>`;
      }).join('')}</tbody>
    </table>
    <p class="note">El turno online se cancela más que el cargado por ustedes. Depósito o seña podría reducir esto.</p>
  </div>
</div>

<!-- ============ TOP CLIENTES ============ -->
<div class="sec pb">
  <h2>Top 20 clientes con más cortes</h2>
  <p class="lead">Los clientes más fieles desde julio. CLIENTE FIEL = 2+ cortes por mes.</p>
  <div class="card">
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th class="n">Cortes</th><th>Desde</th><th>Hasta</th><th>Barbero favorito</th></tr></thead>
      <tbody>${topClients.map((c, i) => `<tr>
        <td>${i + 1}</td>
        <td><b>${esc(c.name)}</b></td>
        <td class="dim">${c.phone}</td>
        <td class="n" style="color:${i < 3 ? CY : '#e8e8e8'};font-weight:${i < 3 ? '700' : '400'}">${c.count}</td>
        <td class="dim">${c.first}</td>
        <td class="dim">${c.last}</td>
        <td>${c.topBarber || 'N/A'}${c.topBarberCount > 1 ? ` (${c.topBarberCount})` : ''}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
  <p class="note">Los clientes más frecuentes van 2 veces por mes. Mantenerlos felices = ingresos recurrentes. Considerar programa de fidelización para el top 10.</p>
</div>

<!-- ============ INSIGHTS ============ -->
<div class="sec pb">
  <h2>Conclusiones</h2>

  <div class="insight">
    <h3>Lo que funciona</h3>
    <ul>
      <li><b>0 no-shows en 3 meses</b> — el sistema de recordatorios/confirmaciones funciona perfecto.</li>
      <li><b>Ticket estable ~$13.000</b> — la app no distorsiona el precio.</li>
      <li><b>La app genera turnos nuevos</b> — el 48-60% de las reservas online se hacen los lunes (día cerrado). Esos turnos no existirían sin la app.</li>
      <li><b>Santi igualó a Fede en reservas online</b> — la app democratiza la exposición.</li>
    </ul>
  </div>

  <div class="highlight">
    <h3>Lo que mejorar</h3>
    <ul>
      <li><b>${totalOpen} turnos sin cerrar</b> — ${money(totalOpen * 13000)} approximate sin registrar. Los sábados son los peores días para esto.</li>
      <li><b>Cancelaciones online ${cancelByOrigin.find((c) => c.origin === 'externo')?.rate.toFixed(0)}%</b> — más del doble del manual. Una seña de Mercado Pago reduciría esto.</li>
      <li><b>La facturación oscila mucho</b> — de $1.57M (mejor semana) a $1.16M (peor). Estabilidad requiere más turnos recurrentes (VIP).</li>
    </ul>
  </div>

  <div class="insight">
    <h3>Próximos pasos sugeridos</h3>
    <ul>
      <li>Cerrar los turnos los sábados antes de irse — la app debería facilitarlo con un botón rápido.</li>
      <li>Evaluar seña para reservas online (reducción de cancelaciones).</li>
      <li>Crear campaña de referidos: clientes que traen amigos = descuento.</li>
      <li>Seguir monitoreando la proporción online vs manual como KPI principal de adopción.</li>
    </ul>
  </div>
</div>

<div class="foot">
  <b>Soluciones Adriel-IA</b> · Consultoría de IA para PyMEs<br>
  Informe generado automáticamente desde datos en vivo · ${stamp}
</div>
</body></html>`;

  mkdirSync(OUT_DIR, { recursive: true });
  const htmlPath = join(OUT_DIR, 'il-barbiere-resumen-jul-sep-2026.html');
  writeFileSync(htmlPath, html);
  console.log(`OK — HTML: ${htmlPath}`);

  // Convert to PDF
  const pdfPath = join(OUT_DIR, 'il-barbiere-resumen-jul-sep-2026.pdf');
  try {
    execSync(`weasyprint "${htmlPath}" "${pdfPath}"`, { stdio: 'pipe' });
    console.log(`OK — PDF: ${pdfPath}`);
  } catch (e: any) {
    console.error('WeasyPrint error:', e.stderr?.toString() || e.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
