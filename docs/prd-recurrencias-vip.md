# PRD — Manejo de recurrencias del Club (VIP)

| Campo | Valor |
|---|---|
| Estado | Borrador para review |
| Fecha | 2026-11-26 |
| Issue de origen | [#52](https://github.com/bertoniadriel-art/IL-BARBIERE-AS/issues/52) —lotes MANUAL quincenales de clientes dados de baja del VIP siguen ocupando slots |
| Antecedente inmediato | [#49](https://github.com/bertoniadriel-art/IL-BARBIERE-AS/issues/49) (Tucco) —recurrencia VIP que no dejaba de bloquear |
| Alcance | Club VIP (recurrencias, visibilidad y baja) |
| Fuera de alcance | Precios, descuentos, generador VIP resuelto en #49/#50/#51 |

## 1. Problema: la recurrencia en la sombra

El sistema tiene **tres representaciones distintas** de la misma recurrencia VIP y ninguna sabe de las otras:

1. `vip_clients` — la declaración (cliente + barbero + día + hora + cadencia + `active`).
2. `blocked_slots` con `reason = 'vip_reserved'` — el bloqueo semanal del slot, que es lo que realmente ve el cliente en la reserva web (`src/features/booking/services/availabilityService.ts:90-107`).
3. Filas de `appointments` — la materialización concreta de las próximas semanas, hoy creada por el cron con horizonte de 15 días (`src/features/admin/services/vipAppointmentGenerator.ts:64`).

Cuando un cliente se da de baja del VIP, la baja se ejecuta —correctamente— sobre **una sola** de esas capas: se cancelan sus citas concretas. Las otras dos siguen vivas:

- `vip_clients.active` se pone en `false` y el cron deja de materializar (`vipAppointmentGenerator.ts:199-202`, `.eq('active', true)`), pero **no hay ninguna rutina que borre o desactive el bloqueo permanente** de `blocked_slots`.
- Ese bloqueo permanente no tiene fecha: aplica a **todas** las semanas de ese día (`2026-06-29_vip_clients_blocked_slots.sql:32-41`, tabla sin ventana temporal).
- El bug se agrava porque el panel permite crear lotes «MANUAL» quincenales en `appointments` **sin ningún vínculo a `vip_clients`**: son citas sueltas repetidas a mano, que la baja del VIP no alcanza a identificar como un conjunto.

Resultado observado en #52: cuatro clientes dados de baja del VIP siguen ocupando slots fijos.

| Cliente | Día | Hora |
|---|---|---|
| Micheletti | jueves | 18:00 |
| Gabi luna | jueves | 17:30 |
| Charly | miércoles | 18:00 |
| Brian | viernes | 17:30 |

La baja de datos de Micheletti (10/12 cancelada) ya fue ejecutada por el dueño del negocio: es la prueba de que **cancelar citas no libera el slot**, porque el bloqueo de `blocked_slots` es independiente.

### Consecuencias

- **Ingreso perdido**: un slot de 30 min reservado por un cliente inexistente, cada semana, indefinidamente.
- **Sin visibilidad**: el panel de staff muestra el hueco como ocupado sin decir por quién ni por qué (`src/features/admin/components/AgendaView.tsx:412`). Nadie detecta que el ocupante ya no existe hasta que el dueño lo recuerda.
- **Sin herramienta**: no hay acción de baja en bloque. La única vía es SQL manual o cancelar cita por cita, y aun así el bloqueo permanece.
- **Deuda acumulada**: cada baja del VIP deja un bloqueo huérfano permanente.

## 2. Fuente única de verdad: `vip_clients`

**Decisión de producto:** `vip_clients` (`day_of_week` + `slot_time` + `frequency` + `active`) es la **única** declaración de recurrencia del Club. Todo lo demás es derivado o materialización.

Consecuencias normativas:

| Capa | Nuevo rol |
|---|---|
| `vip_clients` | **Fuente de verdad.** Sólo acá se declara una recurrencia. |
| `blocked_slots` (`reason = 'vip_reserved'`) | Caché derivada del bloqueo semanal. No se edita a mano como fuente de recurrencia. |
| `appointments` (`qr_hash like 'VIP-%'`) | Materialización con horizonte acotado. Nunca declara una recurrencia nueva. |

**Los lotes MANUAL quincenales se descontinúan.** Un cliente recurrente entra por `vip_clients` con su cadencia real, o no entra. No hay tercera vía.

> Nota de implementación honesta: hoy **alta de un VIP requiere escribir en dos tablas a mano** — la migración original inserta en `vip_clients` (`2026-06-29_vip_clients_blocked_slots.sql:81`) y el bloqueo se siembra aparte, con un backfill desde `vip_clients` (`2026-06-29_vip_clients_blocked_slots.sql:213-215`). Esa doble escritura es precisamente la fuente del desvío. La fase 1 la convierte en una operación única (RPC o trigger), condición para que «fuente única» no sea sólo una frase.

### Migración de datos por cliente

Para cada cliente alcanzado por #52, una de dos salidas, decidida por el dueño del negocio y registrada:

- **(A) Sigue siendo del Club** → alta en `vip_clients` con barbero, `day_of_week`, `slot_time`, `frequency` real (`weekly`/`biweekly`), `service_id`, `discount_percent`, `active = true`. Se eliminan sus lotes MANUAL en `appointments` para evitar duplicación.
- **(B) Ya no es del Club** → `vip_clients.active = false`, `blocked_slots.enabled = false` para ese slot, y cancelación (`status = 'cancelled'`) de sus citas futuras. **No se borra ninguna fila.**

Criterio de verificación por cliente: el slot queda libre en la reserva web o queda respaldado por un VIP activo. En ambos casos cierra.

## 3. Visibilidad en el panel de staff

Hoy el slot ocupado es opaco. `AgendaView` calcula el conjunto de bloqueos (`src/features/admin/components/AgendaView.tsx:567`,`:572`,`:585`) y pinta la celda bloqueada con una rama genérica (`:412`) sin decir quién ocupa ni de dónde viene.

### Propuesta mínima

Un **tooltip por slot** (sin mockups, sin rediseño de la agenda) con cuatro campos: **cliente**, **origen**, **cadencia** y **vence**. El dato existe o se puede derivar sin modelo nuevo:

| Origen | Etiqueta | Dato disponible |
|---|---|---|
| Cita web | «Cita web» | `appointments` con `qr_hash` de reserva pública |
| MANUAL | «MANUAL» | `qr_hash like 'MANUAL-%'` (`src/features/admin/services/appointmentService.ts:115`) |
| VIP | «VIP semanal» / «VIP quincenal» | `appointments.is_fixed_weekly = true` (`vipAppointmentGenerator.ts:338`) o `qr_hash like 'VIP-%'` (`:327`) |
| Bloqueo | «Bloqueo personal» / «VIP reservado: <nombre>» | `blocked_slots.reason` + `label` (`2026-06-29_vip_clients_blocked_slots.sql:37-38`) |

**Gap de datos que esto expone:** MANUAL no tiene marca en la base. `createAppointment` fija `is_fixed_weekly: false` (`appointmentService.ts:119`) y sólo diferencia el origen por el prefijo del `qr_hash` (`MANUAL-` en `:115`, `VIP-` en `vipAppointmentGenerator.ts:327`). Es una convención de nombres, no un campo: cualquier cita creada a mano es indistinguible de un turno suelto salvo por ese string. Por eso la fase 2 debe agregar una columna de origen real (`appointments.origin` con `web | manual | vip` y backfill por prefijo de `qr_hash`); el tooltip no puede depender de parsear hashes.

Alternativa barata en UI: en lugar de tooltip, una **columna «Origen»** en `AgendaCompact` y el nombre del cliente como sufijo del hueco bloqueado. Ambas son aceptables; el criterio de aceptación es el mismo (ver §7.2).

Regla de producto: **ningún slot puede aparecer ocupado sin que el staff pueda saber, en un click, quién lo ocupa y por qué.** Un slot `MANUAL` es, de ahora en más, una señal visible de deuda (recurrencia en la sombra), no un estado normal.

## 4. Acción de baja en bloque

### Flujo

Desde el panel de staff, sobre un slot VIP: **«Cancelar próximas»**.

1. **Preview obligatorio** antes de cualquier escritura: lista de citas a cancelar (fecha, hora, estado actual, cliente) y lo que se desactiva (`vip_clients.active`, `blocked_slots.enabled`).
2. Confirmación explícita.
3. Ejecución.
4. Reporte: N canceladas, N bloqueos desactivados, 0 filas borradas.

### Implementación propuesta

**Un RPC, no un `UPDATE` suelto desde el cliente.** Patrón ya vigente en el repo: `cancel_appointment(p_hash)` en `src/features/database/migrations/2026-07-11_anon_hardening_surfaces.sql:97-140` —`security definer`, `set search_path`, y una guarda de negocio server-side dentro de la función. El patrón de **gates de autorización explícitos** viene de `0005-entregas.sql` (`security definer` en `:106`, `auth.uid()` en `:110`, `raise exception 'PERMISSION_DENIED…'` en `:119`, `'SIN_SESION…'` en `:123`); ese archivo vive fuera de este repo, en `~/Documents/Adriel-Core/02_PROYECTOS/BERTONI-PIZZA-worktrees/registro-entregas/openspec/changes/schema-v2-migration/design/0005-entregas.sql`, y se cita como patrón, no como dependencia.

```
cancel_vip_upcoming(
  p_barber_id   uuid,
  p_day_of_week smallint,
  p_slot_time   time,
  p_from        date default current_date,
  p_dry_run     boolean default true
) returns table(appointment_id uuid, appointment_date date, appointment_time time, client_name text)
```

Gates dentro del RPC:

1. `auth.uid()` nulo → `SIN_SESION`.
2. Sin rol admin ni propiedad del barbero → `PERMISSION_DENIED` (mismo criterio que la policy `vip_clients` de `2026-06-29_vip_clients_blocked_slots.sql:24-28`).
3. `p_dry_run = true` devuelve la lista sin escribir (el preview es la misma función, no una copia divergente).
4. Sólo transita `pending`/`confirmed` → `cancelled`; `attended` se respeta.
5. `update public.appointments set status = 'cancelled'` — **nunca `delete`**.

Sobre el borrado de histórico: cancelar libera el slot gracias al índice único parcial `appointments_unique_slot … where status != 'cancelled'` (`src/features/database/migrations/2026-06-23_partial_unique_slot.sql:14-16`). No hace falta borrar nada para liberar.

### Permisos

- `appointments`: la escritura de staff ocurre con el cliente `authenticated` del panel; el RPC `security definer` es el único camino habilitado para la baja masiva.
- `vip_clients`: ídem, `authenticated` con gate `is_admin()` o barbero dueño (`2026-06-29_vip_clients_blocked_slots.sql:24-28`).
- `blocked_slots`: reutilizar el servicio existente `toggleBlockedSlot` (`src/features/admin/services/vipService.ts:26`), ya invocado desde el panel (`src/features/admin/components/VipSlotsView.tsx:41`). **No** reimplementar el toggle inline: su invariante es `enabled`, no `delete`.

## 5. Guardas

### 5.1 Gap: `vip_clients` no tiene unicidad por barbero + día + slot

La tabla declara sólo checks de rango (`2026-06-29_vip_clients_blocked_slots.sql:6-19`: `day_of_week between 0 and 6`, `frequency in ('weekly','biweekly')`, `discount_percent between 0 and 100`). **No hay `unique`**. Contraste: `blocked_slots` sí lo tiene (`constraint blocked_slots_unique unique (barber_id, day_of_week, slot_time)` en `:41`).

Consecuencia concreta: se puede declarar dos veces el mismo slot VIP para el mismo barbero el mismo día a la misma hora, y el generador insertará dos citas... que chocan contra `appointments_unique_slot` y se descartan como `skippedExisting` (`vipAppointmentGenerator.ts:310-313`, `:347-348`) — una fila VIP queda permanentemente inútil y silenciosa.

Propuesta: índice único **parcial** sobre VIP activos, espejo del criterio ya usado en `appointments`:

```sql
create unique index if not exists vip_clients_unique_slot
  on public.vip_clients (barber_id, day_of_week, slot_time)
  where active = true;
```

Antes de crearlo hay que **auditar duplicados en producción** (consulta de conteo agrupado); el índice no se crea con datos que lo violen.

### 5.2 Horizonte de materialización

Máximo **15 días**, igual que el cron VIP (`WINDOW_DAYS = 15` en `vipAppointmentGenerator.ts:64`; ventana aplicada en `:195-197`, pre-check de idempotencia en `:274-279`). Ninguna acción nueva puede materializar más allá de ese horizonte: la baja masiva no necesita tocar el futuro lejano porque no existe.

### 5.3 Guardas de la baja

- No materializar para VIP inactivos: ya cubierto por `.eq('active', true)` (`vipAppointmentGenerator.ts:202`).
- Idempotencia de inserción: `23505` se trata como skip, nunca aborta el lote (`vipAppointmentGenerator.ts:343-348`). La baja masiva debe ser igualmente **idempotente**: correrla dos veces devuelve 0 canceladas la segunda vez.
- Fallo de cadencia desconocida: ante error de lectura, no se re-bloquea el slot (`availabilityService.ts:121-127`). Preservar ese fail-safe.

## 6. No-goals

- **No** se reescribe el generador VIP: #49, #50 y #51 ya están cerrados (cadencia biweekly anclada, off-weeks libres, guardas contra clientes inactivos).
- **No** se tocan precios ni descuentos (`discount_percent`, `final_price`, `computeFinalPrice`).
- **No** se rediseña la agenda ni el dashboard.
- **No** se elimina histórico de citas: la baja cancela, no borra.
- **No** se resuelve el alta de VIP en dos tablas fuera de la fase 1; lo demás puede lanzarse sin eso.

## 7. Criterios de aceptación

### 7.1 Fuente única de verdad

- [ ] Ningún cliente del Club tiene lotes MANUAL quincenales activos: para cada uno existe una fila en `vip_clients` (`active = true`) con su cadencia real, o no tiene citas futuras.
- [ ] Alta y baja de un VIP ocurren en una sola operación (una escritura llamable), y el bloqueo en `blocked_slots` queda consistente sin interacción manual.
- [ ] Dar de baja un VIP libera su slot semanal en la reserva web: `getBlockedSlotsForDay` ya no lo devuelve (`availabilityService.ts:84`).

### 7.2 Visibilidad

- [ ] Para todo slot ocupado, el panel muestra cliente y origen (web / MANUAL / VIP / bloqueo) en un click, sin depender de parsear `qr_hash`.
- [ ] Un slot MANUAL es visualmente distinguible de un VIP, de modo que la deuda de recurrencia en la sombra sea auditable.
- [ ] El tooltip no rompe la vista actual: los tests de `AgendaView` siguen en verde.

### 7.3 Baja en bloque

- [ ] «Cancelar próximas» muestra preview con fechas y horas antes de escribir; sin confirmación no hay escritura.
- [ ] Tras confirmar: 0 filas borradas, N citas en `status = 'cancelled'`, `vip_clients.active = false`, `blocked_slots.enabled = false`.
- [ ] Correr la acción dos veces no produce efecto adicional (idempotente).
- [ ] Un usuario `authenticated` sin permiso sobre ese barbero recibe `PERMISSION_DENIED` y ninguna fila cambia.

### 7.4 Guardas

- [ ] Existe auditoría de duplicados de `vip_clients` activos y el índice único parcial se aplica sin violaciones.
- [ ] Ninguna acción del Club materializa más de 15 días.

## 8. Plan por fases

Cada fase se lanza sola. Ninguna depende de las siguientes.

| Fase | Contenido | Depende de | Entregable |
|---|---|---|---|
| **0 — Datos (operación, sin código)** | Migración por cliente de #52: (A) alta en `vip_clients` o (B) baja + cancelación futura + `blocked_slots.enabled = false`. Auditoría de duplicados de `vip_clients`. | — | Los cuatro slots de #52 resueltos y verificados en la reserva web. |
| **1 — Fuente única (código)** | Operación única de alta/baja VIP (RPC con gates) que escribe `vip_clients` + `blocked_slots` juntas. Índice único parcial `vip_clients`. | Fase 0 (datos limpias) | Ninguna bajada de VIP vuelve a dejar bloqueo huérfano. |
| **2 — Visibilidad** | Columna de origen (`appointments.origin` + backfill por prefijo) y tooltip de slot / columna Origen en `AgendaView`/`AgendaCompact`. | Ninguna (sólo lee; el backfill es aditivo) | Deuda visible a diario. |
| **3 — Acción** | RPC `cancel_vip_upcoming` + preview + confirmación en el panel. Reutiliza `toggleBlockedSlot`. | Fase 1 (`active=false` es parte de la baja) | Baja desde el panel, con red de seguridad. |
| **4 — Guardas** | Horizonte 15 días verificado en toda acción nueva; idempotencia; tests de permiso denegado. | Fases 1 y 3 | Regresión imposible sin test rojo. |

Orden recomendado de lanzamiento: **0 → 2 → 1 → 3 → 4**. La fase 2 (visibilidad) puede ir antes que las de escritura porque es sólo lectura y hace visible el problema mientras se construye la herramienta.

## Referencias de código verificadas

| Afirmación | Referencia |
|---|---|
| Bloqueo VIP se lee de `blocked_slots` y se filtra por `reason` | `src/features/booking/services/availabilityService.ts:90-107` |
| Slot VIP expandido por duración, enriquecido desde `vip_clients` | `src/features/booking/services/availabilityService.ts:115` |
| Biweekly no re-bloquea su off-week | `src/features/booking/services/availabilityService.ts:139` |
| Fail-safe ante error de lectura de cadencia | `src/features/booking/services/availabilityService.ts:121-127` |
| Horizonte de materialización = 15 días | `src/features/admin/services/vipAppointmentGenerator.ts:64` |
| Sólo VIP activos se materializan | `src/features/admin/services/vipAppointmentGenerator.ts:199-202` |
| Idempotencia por pre-check de ventana | `src/features/admin/services/vipAppointmentGenerator.ts:274-279` |
| Inserción materializada: `is_fixed_weekly`, `VIP-` hash, `status confirmed` | `src/features/admin/services/vipAppointmentGenerator.ts:327-341` |
| `23505` tratado como skip | `src/features/admin/services/vipAppointmentGenerator.ts:343-348` |
| Panel carga bloqueos y los reduce a un `Set` sin origen | `src/features/admin/components/AgendaView.tsx:567`,`:572`,`:585` |
| Render de celda bloqueada sin cliente ni origen | `src/features/admin/components/AgendaView.tsx:412` |
| Toggle de bloqueo existente (reutilizar) | `src/features/admin/services/vipService.ts:26` + `src/features/admin/components/VipSlotsView.tsx:41` |
| Cambio simple de estado de cita | `src/features/admin/services/appointmentService.ts:6-13` |
| Alta desde el panel: `MANUAL-` + `is_fixed_weekly: false` (origen sin campo) | `src/features/admin/services/appointmentService.ts:104-121` |
| `vip_clients`: columnas, checks, sin `unique` | `src/features/database/migrations/2026-06-29_vip_clients_blocked_slots.sql:6-19` |
| Policy `authenticated` de `vip_clients` | `src/features/database/migrations/2026-06-29_vip_clients_blocked_slots.sql:24-28` |
| `blocked_slots` sin ventana temporal + unique + `label` | `src/features/database/migrations/2026-06-29_vip_clients_blocked_slots.sql:32-41` |
| Alta VIP escribe en dos tablas + backfill | `src/features/database/migrations/2026-06-29_vip_clients_blocked_slots.sql:75`,`:81`,`:213-215` |
| Índice único parcial libera el slot al cancelar | `src/features/database/migrations/2026-06-23_partial_unique_slot.sql:14-16` |
| Patrón RPC con gates en este repo | `src/features/database/migrations/2026-07-11_anon_hardening_surfaces.sql:97-140` |
| Patrón de gates `auth.uid()` / `raise exception` (repo externo) | `~/Documents/Adriel-Core/02_PROYECTOS/BERTONI-PIZZA-worktrees/registro-entregas/openspec/changes/schema-v2-migration/design/0005-entregas.sql:96,106,110,119,123` |

## Riesgos y preguntas abiertas

1. **Pertenencia a los cuatro clientes**: el PRD no decide quién sigue en el Club; eso es del dueño del negocio. La fase 0 no puede ejecutarse hasta esa decisión.
2. **Duplicados en producción**: el índice único de §5.1 puede fallar si ya hay duplicados; se resuelve con auditoría previa, no forzando el índice.
3. **Filas MANUAL ya existentes**: la descontinuación es hacia adelante; las anteriores se cancelan en fase 0, no se migran automáticamente.
4. **`label` de `blocked_slots` como nombre de cliente**: es texto libre y puede divergir del nombre en `vip_clients`. Mientras la fuente única no esté consolidada, el tooltip debe preferir `vip_clients.client_name` cuando exista.
