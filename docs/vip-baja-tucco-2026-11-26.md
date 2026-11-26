# Baja del turno VIP recurrente de José Tucco — issue #49

**Fecha:** 2026-11-26 · **Repo:** `IL-BARBIERE-AS` · **Rama:** `fix/vip-tucco-baja-recurrente` (base `origin/main` = `36e4af6`)
**Orden N4 de Adriel (Engram #5151, textual):** «Le decís a axon-b que saque este clientes los jueves cada 15 días sigue apareciendo no es más cliente vio arma el issue y luego implementa el fix luego arma el controla de la pr hacemos el review»
**Segunda orden N4 de Adriel (2026-11-26, textual):** «agrega el sabdado al fix un tal fabri bustos 11:30 es cliente vip quincenal no semanal» → ver §6.

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
- Correr el `UPDATE` de la sección 4 (José Tucco) cuando haya credencial con permiso de escritura.
- Correr el `UPDATE` de la sección 6.4 (Juli/Fabri Bustos: `weekly` → `biweekly`) con la
  misma credencial, con la guarda de exactamente 1 fila.

## 6 · Fabri / Juli Bustos — sábado 11:30 pasa a quincenal

Autorización explícita N4 para cambiar esa fila: `frequency` de `'weekly'` a `'biweekly'`.
**No se ejecutó** el `UPDATE`: la service-role key no tiene valor en ningún env-file del
repo (ver §3 y §6.4), así que el cambio queda como SQL exacto abajo.

### 6.1 · Identidad del cliente (evidencia, sin asumir)

La tabla `vip_clients` no es legible con anon (RLS). Lo único legible que **espeja** esa
fila es `blocked_slots`, que la migración `2026-06-29_vip_clients_blocked_slots.sql` siembra
1:1 desde `vip_clients`. Hoy hay **una sola** reserva VIP de sábado 11:30:

```json
{
  "id": "0612b303-70cb-498e-b061-4e2228bd5e1c",
  "barber_id": "1755f2ef-3156-4dbe-bba1-31dea3c44be8",
  "day_of_week": 6,
  "slot_time": "11:30:00",
  "reason": "vip_reserved",
  "label": "Juli Bustos",
  "enabled": true
}
```

El nombre que aparece es **«Juli Bustos»** (igual que en las 17 citas históricas del slot);
Adriel lo nombró «fabri bustos». La primera cita del histórico (2026-07-04, manual) se
llama literalmente `Juli bustos sabado fijo cada 15 dias`. No hay ninguna fila de
`blocked_slots` ni cita con «Fabri Bustos». **No asumo identidad**: el UPDATE va acotado por
día + horario + `frequency` actual, con guarda de exactamente 1 fila, y el nombre real se
confirma en el SELECT previo (paso 1).

### 6.2 · Cadencia observada en la agenda (anon, solo GET)

17 citas del sábado 11:30, todas del barbero `1755f2ef-…`: 11 con `qr_hash = VIP-*`
(`is_fixed_weekly = true`) y 6 manuales. Sábados con fila:
`07-11(canc) · 07-18 · 08-01 · 08-08 · 08-15 · 08-22 · 08-29 · 09-05 · 09-19 · 09-26 ·
10-03 · 10-10 · 10-24 · 10-31 · 11-14 · 11-21`
→ en la agenda se ve **semanal** (con huecos por cancelaciones y altas manuales),
coherente con la `frequency = 'weekly'` que la orden manda corregir a quincenal.

### 6.3 · Citas futuras ≥ hoy: 0 → no hay «semanas intermedias» que cancelar

`appointments` con `client_name ilike '%bustos%'` y `appointment_date >= 2026-11-26`:
**0 filas**. La última materializada fue 2026-11-21 (atendida). Tampoco hay ninguna fila
`VIP-*` de Bustos en la ventana actual, y el próximo sábado 11:30 (2026-11-28, barbero
`b9a3c926-…`) es de otra clienta manual (Bauti alvarez, `MANUAL-8CA1DE01`).

Por eso **hoy no hay turnos de sobra que reportar ni cancelar**: el cambio de `frequency`
solo gobierna las próximas materializaciones. Con `biweekly`, `datesForRow()` corta en el
primer match de la ventana, así que el generador crea **una sola** fecha por ventana de 15
días para este slot (el manejo biweekly ya está cubierto por los tests de
`vipAppointmentGenerator.test.ts`; no se tocó el generador).

Otros «Fabri» futuros, **no relacionados y NO tocar**: Fabri Kosic viernes 10:30
(`VIP-48DB7711` 27/11, `VIP-C5A10907` 04/12) y Fabri Cresta viernes 13:30
(`VIP-36AAF8C7` 27/11, `VIP-B8DF3B92` 04/12).

### 6.4 · SQL exacto pendiente (service-role o dashboard)

```sql
-- 1) identificación (read-only). Tiene que devolver EXACTAMENTE 1 fila.
select id, client_name, client_phone, barber_id, service_id, day_of_week,
       slot_time, frequency, discount_percent, active
from public.vip_clients
where client_name ilike '%bustos%';

-- 2) cambio de cadencia, acotado por id (usar el id que devolvió 1):
update public.vip_clients
set frequency = 'biweekly'
where id = '<id-de-la-fila>'::uuid
  and frequency = 'weekly';

-- variante por clave natural, sin copiar el uuid (misma guarda de 1 fila):
-- update public.vip_clients
-- set frequency = 'biweekly'
-- where client_name ilike '%bustos%'
--   and day_of_week = 6
--   and slot_time = time '11:30'
--   and frequency = 'weekly';

-- 3) verificación posterior: la fila debe quedar en 'biweekly'
select id, client_name, day_of_week, slot_time, frequency, active
from public.vip_clients
where client_name ilike '%bustos%';

-- 4) el bloqueo VIP del slot NO cambia (sigue reservado), solo debe seguir consistente:
select id, barber_id, day_of_week, slot_time, label, enabled
from public.blocked_slots
where reason = 'vip_reserved' and day_of_week = 6 and slot_time = time '11:30';
```

Guardas: si (1) devuelve 0 filas, no hay nada que cambiar (reportar, no forzar). Si devuelve
2 o más, **PARAR** y confirmar con Adriel cuál es la de sábado 11:30. Si la fila ya está en
`biweekly`, el UPDATE afecta 0 filas y no hay nada que hacer.

## 7 · Comandos y evidencia

```bash
CI=1 pnpm exec vitest run src/features/admin/__tests__/vipAppointmentGenerator.test.ts
# 12 passed (incluye los 2 tests nuevos de #49); mutación sin el filtro: 2 failed | 10 passed
```

Scripts temporales usados (fuera del worktree, read-only salvo `apply`, no commiteados):
`/tmp/vip-tucco-issue49-20261126/tucco-vip.ts` (admin, nunca llegó a escribir),
`/tmp/vip-tucco-issue49-20261126/tucco-anon-read.ts` y
`/tmp/vip-tucco-issue49-20261126/fabri-anon-read.ts` (anon, solo GET),
y `/tmp/vip-tucco-issue49-20261126/fabri-bustos.ts` (admin con guarda; se corrió solo
`diag`/`read`, nunca llegó a escribir).

Corrida de credencial del 2026-11-26 (`bun --env-file=<archivo> … fabri-bustos.ts diag`)
con `.env.production.local`, `.env.local` y `.env` (inexistente): en las tres,
`SUPABASE_SERVICE_ROLE_KEY=missing` y `admin_client_configured: false`. Sin valores
impresos (solo nombre de archivo, `set(largo)`/`missing`).

## 8 · Issue #50 — VIP biweekly: el slot de la semana sin turno queda reservable

Síntoma reportado por Santi: el sábado 11:30 (Juli Bustos, `biweekly`) seguía trabado en la
semana en la que no hay turno — no reservable y sin cita que lo justificara.

### Causa

`blocked_slots.reason = 'vip_reserved'` se siembra 1:1 desde `vip_clients` y **no guarda
ventana de fechas**: una sola fila bloquea ese día de la semana **todas las semanas**.
`getBlockedSlotsForDay()` aplicaba ese bloqueo sin mirar `vip_clients.frequency`, así que un
cliente quincenal perdía la off-week y también (de paso) la posibilidad de cualquier otra
reserva manual en ese horario.

### Fix (código, no datos)

`src/features/booking/services/availabilityService.ts` → `getBlockedSlotsForDay()`:

- la consulta a `vip_clients` ahora trae también `frequency` en el **mismo** round-trip
  (`select('slot_time, frequency, services(duration_min)')`, sigue con el join a `services`);
- el bloqueo permanente derivado de `blocked_slots` se aplica **solo si
  `frequency === 'weekly'`** (y se expande por `services.duration_min`, como antes);
- con `frequency === 'biweekly'` el slot **no** se bloquea desde `blocked_slots`: la
  ocupación de la semana con turno la dan las citas `VIP-*` ya materializadas por el cron,
  que `getBookedSlots()` cuenta. La off-week queda libre;
- fila sin cadencia conocida (`frequency` null, columna nullable con `default 'weekly'`) se
  trata como semanal: se sigue bloqueando (fail-safe, no abre un slot sin evidencia);
- error en la consulta de `vip_clients`: se devuelven **solo** los bloqueos personales. Antes
devolvía `[...personalSlots, ...vipSlots]`, lo que re-trababa la off-week quincenal por un
error transitorio (el bug de este issue). Contrapartida aceptada y acotada a la ventana del
error: el slot de un VIP **weekly** no aparece como bloqueado por `blocked_slots`, pero en la
semana con turno igual queda ocupado por la cita `VIP-*`; si esa cita no existiera todavía,
el generador la saltearía por violación de unicidad (`23505`, §"issue #15") en vez de
duplicar el turno.

No se tocó el generador (`vipAppointmentGenerator.ts`) ni ningún dato: este fix solo cambia
lo que la UI considera **no reservable**.

### Dependencia con el cambio de datos (§6.4)

El fix es de código, pero la cadencia real de Bustos sigue siendo `weekly` en producción
hasta que se corra el `UPDATE` de **§6.4**: mientras `frequency = 'weekly'`, el slot sigue
bloqueado permanentemente (comportamiento correcto para esa cadencia). O sea: el issue #50
queda efectivamente resuelto para ese slot **solo cuando** la fila pase a `biweekly`.

```sql
-- verificación (read-only): la cadencia decide si el slot debe seguir bloqueado
select client_name, day_of_week, slot_time, frequency, active
from public.vip_clients
where day_of_week = 6 and slot_time = time '11:30';
-- esperado tras §6.4: frequency = 'biweekly' → el slot NO debe quedar bloqueado
--                       en la semana sin turno
```

### Callers verificados (contrato sin cambios)

La firma (`barberId, date → Promise<string[]>`, `"HH:MM"`) y el significado (lista de
**horarios de inicio no reservables**) no cambian; los dos callers unen ese resultado con
`getBookedSlots()`:

- `src/features/booking/components/TimeSelector.tsx:66-68` → `[...booked, ...blocked]` y
  luego `filterAvailableSlots`. Antes la off-week del VIP quincenal no aparecía en el
  selector; ahora sí.
- `src/features/admin/components/AgendaView.tsx:572` → `blockedSlots`, usado en
  `availableSlots = scheduledTimes − bookedSet − blockedSet`. `bookedSet` se arma con
  `expandSlots()` de las citas del día (incluidas las `VIP-*`), así que la semana con turno
  sigue mostrándose ocupada sin depender de `blocked_slots`.

Ningún caller interpreta el resultado como "reserva VIP activa", así que excluir la off-week
no rompe su contrato.

### Tests

`src/features/booking/__tests__/availabilityService.biweekly.test.ts` (nuevo, 7 casos):
biweekly no bloquea el slot; weekly sí (PRESERVE); expansión por duración para weekly
(PRESERVE); personales intactos y sin consultar `vip_clients` (PRESERVE); la semana con turno
la ocupa la cita materializada (contrato `booked ∪ blocked`); fila legacy sin cadencia se
trata como semanal; error de `vip_clients` → solo personales.
`src/features/booking/__tests__/availabilityService.test.ts` (existente, sin tocar) sigue en
verde: 12 tests.

## 9 · Issue #50 — anclaje quincenal del generador VIP

El fix de §8 dejó la off-week reservable, pero el generador seguía materializando el turno
en la semana equivocada: `datesForRow()` anclaba el `biweekly` a la **primera fecha del
window de 15 días desde hoy**, así que el sábado 28/11 (sin turno para Juli Bustos) se
volvía a materializar y su 05/12 no.

### Criterio (fijado por Adriel en el issue #50)

Este sábado 28/11 queda **libre**; el próximo VIP de Juli Bustos es el sábado 05/12 y de ahí
cada 14 días. Por lo tanto el ancla quincenal es la **última cita VIP materializada del
cliente**, no el borde del window: `max(appointment_date)` de sus filas con
`qr_hash like 'VIP-%'` → 21/11 → 05/12, 19/12, …

### Cómo se asocia cita ↔ cliente

`appointments` **no tiene** `vip_client_id`, y el nombre no sirve como clave: la misma
persona aparece con variantes (`Juli Bustos` en `blocked_slots` y en las citas `VIP-*`, pero
`Juli bustos sabado fijo cada 15 dias` en la primera cita manual). La identidad que el
sistema ya trata como única es el **slot**: `barber_id + day_of_week + slot_time` (la propia
tabla tiene `unique(barber_id, appointment_date, appointment_time)`).

- clave del ancla = `barber_id | weekday(appointment_date) | HH:MM(appointment_time)`, con
  el weekday leído en **hora local** (`weekdayFromIsoDate()`, no `new Date('YYYY-MM-DD')`,
  que se parsea como medianoche UTC y en UTC-3 devuelve el día anterior);
- clave de la fila = `barber_id | day_of_week | HH:MM(slot_time)`;
- fila sin `barber_id` **no se ancla** (un `null` colisionaría entre clientes distintos) y
  cae al comportamiento por window;
- la query filtra server-side `qr_hash like 'VIP-%'` **y** `barber_id in (…del lote)`: solo
  cuentan las filas que materializó el cron. Una cita manual en el mismo slot (el 28/11 de
  Bauti Alvarez) no mueve la cadencia, y un `VIP-*` de otro cliente/otro horario tampoco.
- si el cliente cambió de día, el histórico ya no matchea el slot → se ancla por window,
  que es exactamente lo que se quiere para una cadencia nueva.

### Comportamiento resultante

| Caso | Resultado |
|---|---|
| `weekly` | sin cambios: todas las fechas del window (el ancla se ignora) |
| `biweekly` con ancla | `ancla + 14k` dentro de `[windowStart, windowEnd)` — 05/12 para 21/11 |
| `biweekly` con ancla y próxima fecha ya fuera del window | **no genera nada** (el slot ya está cubierto hasta el horizonte) |
| `biweekly` sin citas previas | comportamiento actual: primera fecha del window que matchea el día |
| error de la query de anclas | fallback seguro: comportamiento actual (primera fecha del window). No se descarta al cliente — dejarlo sin turno es peor que anclarlo mal una vez |

No cambia el contrato del generador (`VipGenerationSummary` intacto, sin campo nuevo), ni
`WINDOW_DAYS = 15`, ni `skippedExisting`, ni `computeFinalPrice`, ni el manejo de `23505`, ni
`VipGenerationError`. `availabilityService.ts` (§8) no se toca.

### Tests

`src/features/admin/__tests__/vipAppointmentGenerator.test.ts` (+6 casos; el mock de
`appointments` ahora **aplica** los filtros de las dos cadenas, la del pre-check y la del
ancla, así que quitar un filtro del generador rompe un test):

- ancla 21/11 con window `[26/11, 11/12)` → **solo 05/12**, no 28/11 (caso Bustos, con el
  28/11 manual y un `VIP-*` de otro horario como distractores); verifica además que la query
  se hace con `qr_hash like 'VIP-%'` + `barber_id in (batch)`;
- `biweekly` sin citas previas → primera fecha del window (28/11);
- ancla reciente 28/11 con window `[01/12, 16/12)` → 12/12 (y no la primera del window, 05/12);
- ancla 05/12 ya materializada, window `[26/11, 11/12)` → 0 turnos (siguiente = 19/12);
- `weekly` → 3 fechas del window intactas con anclas presentes;
- error de la query de anclas → fallback a 28/11.

```bash
CI=1 pnpm exec vitest run src/features/admin/__tests__/vipAppointmentGenerator.test.ts
# RED (antes del fix): 3 failed | 15 passed  → los 3 casos de ancla
# GREEN: 18 passed
CI=1 pnpm exec vitest run src/features/booking/__tests__   # 76 passed (8 files)
pnpm typecheck   # 1 error preexistente, gitignored: scripts/fix-santi-vip-service.ts(87,19)
pnpm exec biome check <los 2 archivos tocados>   # sin hallazgos
```
