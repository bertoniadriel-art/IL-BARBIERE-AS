# Baja del turno VIP recurrente de José Tucco — issue #49

**Fecha:** 2026-11-26 · **Repo:** `IL-BARBIERE-AS` · **Rama:** `fix/vip-tucco-baja-recurrente` (base `origin/main` = `36e4af6`)
**Orden N4 de Adriel (Engram #5151, textual):** «Le decís a axon-b que saque este clientes los jueves cada 15 días sigue apareciendo no es más cliente vio arma el issue y luego implementa el fix luego arma el controla de la pr hacemos el review»

Issue: [bertoniadriel-art/IL-BARBIERE-AS#49](https://github.com/bertoniadriel-art/IL-BARBIERE-AS/issues/49)

---

## 1 · Qué se cambió en el repo

Solo tests de protección (no hubo cambio de comportamiento que hacer en el generador: el
filtro `.eq('active', true)` ya existía). Se agregó un mock que **registra y aplica** los
filtros PostgREST en vez de ignorarlos, y dos tests:

| Test | Qué fija |
|---|---|
| `does not materialize appointments for a vip_clients row with active=false (José Tucco: Thursday biweekly)` | Una fila `vip_clients.active = false` no genera turnos: `created = 0`, sin `insert`, y la query debe filtrar server-side con `active = true` (un filtro client-side seguiría trayendo la fila por la red). |
| `still materializes the active rows of the same batch when an inactive row is present` | El filtro es por fila: una fila inactiva no aborta el resto del lote. |

Prueba de que el test muerde (mutación temporal, no commiteada): quitando
`.eq('active', true)` del generador, **solo** esos 2 tests fallan (10/12 preexistentes
siguen verdes); restaurando el filtro, 12/12 verdes.

## 2 · Limitación de dominio (por qué no hay guard de código adicional)

El issue pedía, como segundo criterio, «reporte legible cuando una fila activa no matchea
cliente activo del catálogo de clientes (si existe esa verificación)». **No existe ese
catálogo**: las migraciones de `src/features/database/migrations/` solo crean
`vip_clients` y `blocked_slots`; no hay tabla de clientes. La única fuente de «es
cliente» serían las propias `appointments` (histórico), que no dicen nada sobre la
vigencia del cliente. Inventar esa fuente habría creado un falso positivo: cualquier
cliente sin historial reciente se daría de baja solo. Por eso **no se agregó guard**:
la vigencia del VIP se expresa con `vip_clients.active`, y el generador ya la respeta.

## 3 · Estado del cambio de DATOS en Supabase (producción)

Proyecto: `bvfmfbybvwjuofjvngdg.supabase.co` (leído de `NEXT_PUBLIC_SUPABASE_URL`).

**No se ejecutó el `UPDATE`.** Bloqueo concreto: el service-role key no está disponible
localmente. En `.env.production.local`, `SUPABASE_SERVICE_ROLE_KEY` está definido pero
**vacío** (`SUPABASE_SERVICE_ROLE_KEY=""`, 0 caracteres de valor); `bun --env-file` y el
loader propio de los scripts del repo lo leen igual de vacío. Sin esa clave,
`supabaseAdmin` queda `null` (`supabase-admin.ts` exige `serviceRoleKey.length > 10`) y no
se puede ni leer la tabla.

Y `vip_clients` **no es legible con la anon key**: la migración
`2026-06-29_vip_clients_blocked_slots.sql:24` solo define policy para `authenticated`
(`"VipClients: authenticated full access"`), igual que documenta el comentario de
`vipAppointmentGenerator.ts:12-17`. Una consulta anon a `vip_clients` devuelve `[]`
siempre (RLS), así que **no sirve ni siquiera como SELECT de verificación**.

### Lo que SÍ se pudo leer (read-only, anon key + REST)

`blocked_slots` tiene policy pública, y expone `label` = nombre del cliente VIP. Hoy:

- `blocked_slots` con `reason = 'vip_reserved'`: **19 filas, ninguna de Tucco**
  (jueves 12:00/12:30/14:00 son Dami Yaco, Gino Ambrosis, Tomi Degano; 09:00 Javi Orru).
- `appointments` con `qr_hash like 'VIP-%'` desde 2026-11-01: **81 filas, ninguna de
  Tucco**. En el jueves 14:30 del barbero `1755f2ef-…` (el de José) los turnos
  materializados por el generador son de **Galgo** (`VIP-8C2CBE14` 27/11,
  `VIP-100552E7` 04/12).
- `appointments` de cualquier nombre `~ tucco` en la ventana: **0 materializadas por el
  VIP**. La única fila futura es **hoy 2026-11-26 14:30**:

```json
{
  "id": "f8db21a8-ae57-44de-859b-a7f87c453974",
  "client_name": "José tucco",
  "barber_id": "1755f2ef-3156-4dbe-bba1-31dea3c44be8",
  "service_id": "79d875c2-387e-4f3d-aa71-414e19f60863",
  "appointment_date": "2026-11-26",
  "appointment_time": "14:30:00",
  "status": "confirmed",
  "is_fixed_weekly": false,
  "final_price": 10000,
  "qr_hash": "MANUAL-7106E57A",
  "created_at": "2026-08-20T17:56:24.089181+00:00"
}
```

### Hallazgo que cambia el diagnóstico

Ese turno **no lo generó el cron VIP**: `is_fixed_weekly = false` y `qr_hash = MANUAL-…`,
cuando el generador escribe `is_fixed_weekly: true` y `qr_hash = VIP-XXXXXXXX`
(`vipAppointmentGenerator.ts:236-247`). Las filas de José en la agenda son un **lote de 13
citas manuales creadas el 2026-08-20 entre 17:56:19 y 17:56:24 UTC** (`MANUAL-*`,
`is_fixed_weekly = false`), programadas jueves 14:30 (con tres excepciones: 17:30 el 29/07
y 25/09, 17:00 el 25/09). La última de ese lote es **la de hoy**: después de 2026-11-26 no
queda ninguna fila futura de «tucco» con `status = 'confirmed'`.

Consecuencia: desactivar una fila de `vip_clients` **no explica ni detiene** lo que Adriel
ve en la agenda; lo que ve son citas manuales del lote de agosto, y ese lote ya se agota
hoy. Que exista o no una fila `vip_clients` de Tucco no se pudo verificar (RLS + falta de
service-role). El slot jueves 14:30 **no está bloqueado** (`blocked_slots` no tiene
`vip_reserved` de Tucco), así que tampoco hay reserva VIP que liberar.

## 4 · SQL exacto pendiente (para correrlo con service-role o desde el dashboard)

```sql
-- 1) verificación previa (identifica la fila, no la modifica)
select id, client_name, day_of_week, slot_time, frequency, active
from public.vip_clients
where client_name ilike '%tucco%';

-- 2) baja lógica (solo si el paso 1 devuelve exactamente 1 fila jueves/biweekly)
update public.vip_clients
set active = false
where id = '<id-de-la-fila>'::uuid
  and active = true;

-- 3) verificación posterior: debe devolver la fila con active = false
select id, client_name, day_of_week, slot_time, frequency, active
from public.vip_clients where id = '<id-de-la-fila>'::uuid;

-- 4) sin bloqueos VIP huérfanos
select id, barber_id, day_of_week, slot_time, label, enabled
from public.blocked_slots
where reason = 'vip_reserved' and label ilike '%tucco%';
```

Si el paso 1 devuelve 0 filas, **no hay nada que desactivar** en `vip_clients` y el
problema es exclusivamente el lote de citas manuales de agosto (sección 3).

## 5 · Pendiente de decisión (no autorizado en este encargo)

- Cancelar/borrar los turnos **ya materializados** de Tucco: requiere confirmación puntual
  de Adriel. En el lote de agosto figuran como `attended` los ya pasados y `confirmed` el
  de hoy 2026-11-26 14:30 (`f8db21a8-…`); dos se cancelaron (2026-11-05, 2026-11-12).
- Correr el `UPDATE` de la sección 4 cuando haya credencial con permiso de escritura.

## 6 · Comandos y evidencia

```bash
CI=1 pnpm exec vitest run src/features/admin/__tests__/vipAppointmentGenerator.test.ts
# 12 passed (incluye los 2 tests nuevos de #49); mutación sin el filtro: 2 failed | 10 passed
```

Scripts temporales usados (fuera del worktree, read-only salvo `apply`, no commiteados):
`/tmp/vip-tucco-issue49-20261126/tucco-vip.ts` (admin, nunca llegó a escribir) y
`/tmp/vip-tucco-issue49-20261126/tucco-anon-read.ts` (anon, solo GET).
