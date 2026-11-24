---
created: 2026-06-25
updated: 2026-09-21
type: roadmap
project: IL BARBIERE-AS
version: 1.7
marca: Soluciones Adriel-IA
tags: [barbiere, roadmap, versiones, hitos, libro]
---

# IL BARBIERE-AS — Capítulos

> *El Sistema Operativo de tu imagen personal — de un repo initial a producción pulida con ~152 commits.*

> **Nota sobre versionado:** los "v1.0"–"v1.7" de este libro son capítulos narrativos, no tags de git — numeran la historia del proyecto, no releases. El primer tag de git real (`v1.1.0`, SemVer) recién se creó el 2026-09-21, con el contenido del Capítulo 8. No son la misma numeración; no correlacionar.

```
 FEB 2026   MAY 2026    JUN 2026    JUN 2026    JUL 2026      JUL 2026        JUL-AGO 2026    SEP 2026
   │           │           │           │           │             │                │               │
   ●── v1.0 ──●── v1.1 ──●── v1.2 ──●── v1.3 ──●── v1.4 ──●── v1.5 ──●── v1.6 ──●── v1.7 ──●
 Initial     MVP Core   Dashboard   UI Polish   VIP+Precios   Anon-Hardening   Reporting +     Cancel/Confirm
 Commit      Booking+   +Scanner+   +VIP+Cancel  +Agenda      Kickoff+Agenda   Closing-Time    UX + Horarios
 (repo base) Auth       Tests       +PWA         Notif.       Hardening        Fix             (tag v1.1.0)
 (PR1-PR3)   (PR4-PR5)  (PR6-PR9)   (PR10-21)   (PR22,24-28) (PR29-31 rango)  (PR14,32)
```

### Evolución del proyecto

| Fase | Fechas | Commits | Tests | Estado |
|---|---|---|---|---|
| **v1.0** Initial | 24 feb – 3 may | ~10 | — | ✅ |
| **v1.1** MVP Core | 24–25 may | ~15 | — | ✅ |
| **v1.2** Dashboard & Features | 21–25 jun | ~50 | 124 | ✅ |
| **v1.3** UI Polish + VIP + Cancel + PWA | 29–30 jun | ~17 | 151 | ✅ |
| **v1.4** VIP Pricing + Agenda Notif. | 1–7 jul | ~20 | — | ✅ |
| **v1.5** Anon-Hardening Kickoff + Agenda | 13–14 jul | ~6 | — | ✅ |
| **v1.6** Reporting Automation + Closing-Time Fix | 20 jul – 31 ago | ~10 | — | ✅ |
| **v1.7** Cancel/Confirm UX + Horario Santi | 21 sep | ~5 | 272 | ✅ |

---

## Capítulo 1: v1.0 — Initial Commit & Foundation

**Fecha:** 24 de febrero – 3 de mayo de 2026
**Commits:** ~10
**Dolor resuelto:** La barbería no tenía presencia digital ni sistema de reservas.

### Qué se hizo

Repo inicial con Next.js, landing page básica, dashboard con sidebar colapsable, y flujo de reservas protofuncional. Deploy en Vercel. Parches de seguridad y fixes de build.

### Commits clave

| Fecha | Commit | Qué hizo |
|---|---|---|
| 24 feb | `68b6dd8` | **Initial commit: IL BARBIERE OS v1 Ready** |
| 24 feb | `0b2f3ef` | Update Next.js and React to secure versions |
| 24 feb | `d805d1b` | Improved supabase initialization |
| 24 feb | `3af96db` | Parche de seguridad, cero vulnerabilidades |
| 27 feb | `2113f1b` | Enhance booking flow with barber name |
| 27 feb | `66c0325` | Sidebar colapsable y responsive |
| 27 feb | `9305f37` | Bento dashboard y reglas avanzadas |
| 3 may | `f1856d9` | Supabase client fix |

### Stack definido

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| DB/Auth | Supabase (PostgreSQL) |
| Estado | Zustand |
| Deploy | Vercel (auto-deploy from main) |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| Next.js App Router | Server Components, SSR para auth, future-proof |
| Supabase over Firebase | PostgreSQL real, RLS nativo, pricing predecible |
| Vercel deploy | Auto-deploy, preview PRs, edge functions si hace falta |
| Biome over ESLint/Prettier | Más rápido, un solo tool, zero config |

### Lecciones aprendidas

- Vercel falla si `package-lock.json` y `bun.lock` coexisten — elegir uno
- Dynamic import para ScannerModule evita errores de build en Vercel
- Supabase client initialization requiere cuidado con Server/Client components

### Memoria Engram

- Sin sesiones AXON-R en esta fase (desarrollo inicial manual)

---

## Capítulo 2: v1.1 — MVP Core (PR1-PR3)

**Fecha:** 24–25 de mayo de 2026
**Commits:** ~15
**Dolor resuelto:** El booking no funcionaba bien — colisiones, sin auth real, DB sin schema formal.

### Qué se hizo

Tres PRs en 2 días que construyeron el MVP funcional:

**PR1 — DB Foundation:** Schema completo con migraciones, RLS (Row Level Security), unique constraints, barber-scoped access.

**PR2 — Booking Correctness:** Colisiones detectadas y prevenidas (error 23505), servicios cargados desde DB (no hardcoded), time slots con disponibilidad real, validación Zod, UUID real.

**PR3 — Auth SSR:** Supabase Auth reemplaza credenciales plaintext, middleware de sesión, Server-Side Rendering para admin.

### Commits clave

| Fecha | Commit | Qué hizo |
|---|---|---|
| 25 may | `be62190` | **Migration for MVP core schema** — columns, dedup, unique constraint, barber-scoped RLS |
| 25 may | `c3535df` | **Auth: Supabase Auth** reemplaza credenciales plaintext |
| 25 may | `9a495fa` | **availabilityService.getBookedSlots** — slot collision pre-filter |
| 25 may | `81c404c` | **TimeSelector** fetches booked slots + filterAvailableSlots |
| 25 may | `4e3c0f5` | **ServiceSelector async from DB** — real UUID, no hardcoded array |
| 25 may | `c49a9c2` | **Confirmation** — real UUID, final_price, 23505 handling, Zod validation |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| RLS barber-scoped | Cada barbero solo ve sus turnos — seguridad desde el schema |
| Error 23505 handling | PostgreSQL unique constraint violation → mensaje amigable al usuario |
| Servicios desde DB | No hardcoded — el dueño puede cambiar precios y servicios sin tocar código |
| Zod para validación | Type safety + runtime validation en un solo paso |
| UUID real | No más IDs incrementales — previene enumeración |

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/features/booking/services/availabilityService.ts` | getBookedSlots, filterAvailableSlots |
| `src/features/booking/components/Confirmation.tsx` | UUID real, 23505 handling |
| `src/features/booking/components/ServiceSelector.tsx` | Async from DB |
| `src/features/booking/components/TimeSelector.tsx` | Slot collision pre-filter |
| `src/features/booking/bookingStore.ts` | Zustand store expandido |
| `src/middleware.ts` | Auth middleware |
| Supabase migrations | Schema completo |

### Lecciones aprendidas

- El error 23505 de PostgreSQL es tu amigo — previene datos duplicados si lo manejas bien
- RLS es poderoso pero requiere planning desde el inicio
- Slot race condition: dos usuarios pueden tomar el último slot al mismo tiempo → need optimistic locking o double-check

### Memoria Engram

- Sin sesiones AXON-R documentadas (desarrollo con agente AXON-B)

---

## Capítulo 3: v1.2 — Dashboard, Scanner & Features

**Fecha:** 21–25 de junio de 2026
**Commits:** ~50
**Dolor resuelto:** El dashboard no mostraba métricas reales, no había forma de escanear QR, y faltaban acciones operativas.

### Qué se hizo

La fase más activa: PR4 (Dashboard Status), PR5 (124 integration tests), Scanner QR completo, y una ráfaga de features que transformaron el MVP en un sistema operativo para la barbería.

### Sub-capítulos

#### PR4 — Dashboard Status (21–22 jun)

- Dashboard con métricas en tiempo real (flujo de caja, clientes únicos)
- Resumen del día, quick actions (Confirmar/Presente)
- Estado de conexión a Supabase
- Calendario visual por barbero
- Kanban board como tab default
- Ruta `/gestion-personal`

#### PR5 — Integration Tests (22–23 jun)

- 124 tests passing (booking, dashboard, scanner, auth)
- Cobertura: colisiones, servicios, horarios, métricas, QR fixtures
- Vitest + React Testing Library

#### Scanner QR (22–25 jun)

- Escaneo con cámara del celular
- Scan-from-image fallback (file input)
- Validación de turno para hoy
- Expiración QR (2h después del turno)
- Prevención de reutilización
- Check-in automático
- Fixtures de prueba: `pnpm scanner:fixtures`

#### Admin Features (23–25 jun)

- **Cancel/Move appointments** con manejo de race conditions
- **Agenda compacta** por barbero (Santi)
- **QR viewer** + move modal por row
- **Quick-add FAB** + Nuevo Turno modal
- **Payment actions** (Cobrar/Fiar) por appointment
- **Live notification ticker**
- **14-day availability calendar** colapsable
- **Shareable HTML pages** para clientes y barbers ("saca-tu-turno")

#### Quality & CI (23 jun)

- Biome formatter aplicado a todo el codebase
- CI fixes: esbuild/sharp/biome postinstall scripts para pnpm 10.x en Vercel
- Exclusión de .claude worktrees de Biome

#### Judgment Day (23 jun)

- Auditoría adversarial: 6 issues críticos detectados y corregidos
- overbook modal close, UTC date fix, slot exclusion, cancel race, barber_id ownership, row count check

### Decisiones clave

| Decisión | Por qué |
|---|---|
| Kanban como default tab | Los barberos necesitan ver turnos rápido al entrar |
| Scan-from-image fallback | No todos tienen cámara funcional o prefieren subir foto |
| QR expira a 2h | Seguridad: no se puede reusar un turno viejo |
| Cancel con race condition handling | Si dos personas cancelan al mismo tiempo, no perder datos |
| Partial unique index | Slots cancelados se liberan para rebooking |
| Shareable HTML pages | Clientes y barbers pueden ver disponibilidad sin login |

### Archivos clave

| Archivo | Función |
|---|---|
| `src/features/admin/components/DashboardBento.tsx` | Dashboard principal |
| `src/features/admin/components/CalendarView.tsx` | Calendario por barbero |
| `src/features/admin/components/KanbanBoard.tsx` | Kanban de turnos |
| `src/features/admin/components/GestionPersonal.tsx` | Gestión + quick-add |
| `src/features/booking/components/Confirmation.tsx` | QR generation |
| `src/features/booking/components/ScannerModule.tsx` | QR scanner |
| `src/shared/hooks/useDashboardMetrics.ts` | Métricas compartidas |
| `src/shared/components/ErrorBoundary.tsx` | Error handling global |

### Lecciones aprendidas

- **CalendarView estaba lleno de `any[]`** — AXON-L flaggeó esto, se tipó con `Appointment[]`
- **Mock chain de Supabase** era frágil — `createChainableQuery` necesitaba resolver correctamente
- **Duplicación de hooks** (DashboardBento + CalendarView) — se extrajo `useDashboardMetrics`
- **`Math.random()` para QR** era inseguro — reemplazado por `crypto.randomUUID()`
- **UTC date bugs**: `date('now')` en SQLite + new Date() en JS crean desync timezone
- **Race conditions en cancel/move**: el estado cambia entre el read y el write

### Próximas mejoras (de AXON-L)

| Mejora | Esfuerzo | Estado |
|---|---|---|
| M1: Fix test dashboardBento | 1h | Pendiente |
| M2: Extraer useDashboardMetrics | 2h | ✅ Hecho |
| M3: Error Boundary global | 1h | ✅ Hecho |
| M4: Tipar CalendarView | 1h | Pendiente |
| M5: crypto.randomUUID() | 15min | ✅ Hecho |
| M6: Skeleton loaders | 3h | Pendiente |
| M10: Conflict check overbook | 2h | Pendiente |

### Memoria Engram

- [[#obs-64740c947ae2986c]] — Axon-L analysis
- [[#obs-720]] — Learnings

---

---

## Capítulo 4: v1.3 — UI Polish, VIP, Auto-cancelación & PWA

**Fecha:** 29–30 de junio de 2026
**Commits:** ~17
**Tests:** 124 → 151 passing
**Dolor resuelto:** La app era funcional pero no estaba pulida para compartir con clientes. Faltaba identidad visual consistente, gestión de VIPs, y que los clientes pudieran cancelar solos.

### Qué se hizo

#### AgendaView UI Batch — 10 features (PR6 equivalente)

- Barra de disponibilidad clickeable con porcentaje visual
- Colapso de días en la agenda
- Slots disponibles por día visibles
- Botones de bloqueo de slot y contacto WhatsApp
- Corona 👑 para clientes VIP (cross-reference `vip_clients` por `client_name`)
- Estados: `blocked` agregado a `AppointmentStatus`
- Fix sidebar: `w-0 overflow-hidden` en lugar de `opacity-0` (el span ocupaba espacio)

#### VIP Clients (PR7)

- Tabla `vip_clients` en Supabase con `frequency: weekly | biweekly`
- `blocked_slots` para reservar slots fijos
- Clientes VIP confirmados por Fede: Bruno Vannelli (vie 16:00), Mariano Narducci (vie 18:00)
- `ALTER TABLE appointments` para agregar `blocked` al check constraint (DDL vía SQL Editor)
- Clientes quincenal Fede: Juli Juárez (mar 12:30), Javi Orru (jue 09:00), Walter Chapista (vie 14:00) — pendiente cargar a Supabase

#### Auto-cancelación de turno (PR8)

- Ruta `/mi-turno/[hash]` sin login
- Muestra datos del turno: fecha, hora, barbero, servicio
- Botón de cancelación habilitado hasta 4 horas antes (`CANCEL_CUTOFF_HOURS = 4`)
- Identificación por QR hash (`qr_hash` en tabla `appointments`)
- Supabase join quirk: `.select('barbers(name)')` devuelve array → normalizar con `Array.isArray()`
- Post-booking link en `Confirmation.tsx` → "Ver / cancelar mi turno"

#### UI Polish & Identidad Visual (PR9)

| Cambio | Detalle |
|---|---|
| Logo navbar | Circular con pulso neon cyan (`border border-neon-cyan animate-pulse`) |
| Logo duplicado | Removido del lado derecho de la navbar (desktop y mobile) |
| Favicon | `logo-official.jpg` en lugar del PNG genérico |
| PWA icons | 192px, 512px y apple-touch-icon generados con ImageMagick desde el logo real |
| `manifest.json` | `start_url` corregido de `/admin` a `/` |
| OG image | 1200×630 con ImageMagick — logo + texto — para previews en WhatsApp/Telegram |
| Hero background | Foto de la barbería `position:fixed`, `opacity:0.18`, `filter:blur(12px)` full-page |
| `/mi-turno` | Logo circular neon en lugar del ícono de tijeras |

#### CI & Tests Fix

- `pnpm test --run` → `pnpm exec vitest run` (pnpm interceptaba el flag `--run`)
- `barbers.schedule.test.ts`: Santi cierra 18:30, no 19:00 — assertions actualizadas
- `timeSelector.logic.test.ts`: Fede 09:00–19:00 no 09:00–20:00
- `calendarView.test.tsx`: toggle Agenda/Calendario removido — tests reemplazados
- `AppointmentCard.test.tsx`: firma de `moveAppointment` tiene `barber_id` como 2do arg

#### Marketing Assets (locales)

| Archivo | Contenido |
|---|---|
| `~/il-barbiere-acceso.html` | Logo neon + botón reservar — acceso directo |
| `~/il-barbiere-turno.html` | 5 pasos "cómo sacar tu turno" + CTA |
| `~/il-barbiere-landing.html` | Landing completa: hero, mockup, features grid, QR embebido |

QR generado con `qrencode` (brew): `qrencode -o qr.png -s 8 -m 2 --level=H "URL"` → base64 → `<img>` embebido.

### Commits clave

| Commit | Descripción |
|---|---|
| `c60a5e0` | feat(agenda): 10 features batch — barra, colapso, slots, block/WhatsApp |
| `f97bbb0` | feat(agenda): crown badge desde tabla vip_clients |
| `1917da7` | feat(booking): página auto-cancelación con cutoff 4 horas |
| `7877143` | fix(types): blocked en AppointmentStatus, implicit any en vipNames |
| `fbe0081` | fix(sidebar): w-0 overflow-hidden — fix alineación al colapsar |
| `ca2b099` | feat(ui): logo circular neon, sin duplicado, fondo barbería |
| `b59b2fd` | fix(ui): blur 12px para ocultar texto baked-in en la foto |
| `fe77117` | fix(pwa): start_url → "/", íconos reales desde logo |
| `912a11e` | feat(seo): OG image 1200×630 + meta tags openGraph/twitter |
| `e079bc1` | fix(ci): pnpm exec vitest run |
| `20ab5e4` | fix(tests): schedules, CalendarView toggle, AppointmentCard firma |
| `78208a9` | fix(mi-turno): logo circular en página de cancelación |
| `25ca283` | docs(readme): PR7/PR8/PR9 + features completas documentadas |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| `position:fixed` para el fondo | `background-attachment:fixed` no funciona en iOS Safari |
| `blur(12px) + scale(1.05)` | Oculta texto baked-in del JPEG — no había foto original limpia |
| `pnpm exec vitest run` en CI | `pnpm test --run` pasa `--run` a pnpm, no a vitest |
| QR hash para auto-cancelación | Permite acceso sin auth — el hash único es la autorización |
| Supabase join → normalizar array | `.select('barbers(name)')` retorna `[]` no objeto → `Array.isArray()` check |

### Lecciones aprendidas

- **Texto baked-in en JPEGs** de Instagram stories → blur CSS como workaround sin Photoshop
- **PWA start_url en /admin** hacía que clientes que instalaban la app arrancaran en el panel
- **OG image** requiere URL absoluta en `metadata.openGraph.images` de Next.js
- **`manifest.json` icons** — ImageMagick: `convert logo.jpg -resize 192x192 icon-192.png`
- **`qrencode`** (brew): genera QR como PNG que se puede base64 y embeber en HTML self-contained

---

## Capítulo 5: v1.4 — VIP Pricing, Sobreturnos & Agenda Notifications

**Fecha:** 1–7 de julio de 2026
**Commits:** ~20
**Dolor resuelto:** Los descuentos VIP eran inconsistentes (redondeo, casos manuales), los servicios combinados pisaban el slot siguiente, y la agenda no avisaba de turnos nuevos ni facilitaba el contacto por WhatsApp.

### Qué se hizo

- **Pricing VIP:** 10% de descuento para clientes Coronita (`fix(pricing)`), aplicado también a turnos agregados a mano (`#13`), con re-chequeo de la condición VIP antes de guardar y redondeo al centenar más cercano (mismo día, fix de seguimiento).
- **Duración de servicios combinados:** bloqueo del slot completo para reservas VIP con servicios combinados, tanto en el booking público (`#11`) como en la lista de horarios libres de la agenda (`#21`).
- **Ayuda tab:** FAQ para preguntas frecuentes del día a día (`#12`) + entrada específica sobre sobreturnos.
- **VIP recurrentes automáticos:** cron semanal que auto-genera los turnos fijos de clientes VIP (`#16`) — la misma pieza que hoy interviene en el issue #30 (Fede quiere sacar su turno fijo de los viernes).
- **Agenda con feedback de turnos nuevos:** contador de pendientes + links `wa.me` válidos (`#17`), beep de notificación (`#18`), inbox "sin confirmar" fijado arriba (`#19`), aviso al cliente por WhatsApp cuando el barbero cancela o mueve un turno (`#20`).
- Extras del mismo rango: persistencia del estado de confirmación/pago en `/mi-turno`, notificación WhatsApp al cliente cuando el barbero confirma, fix de "esta semana" en finanzas cruzando límite de mes, sync de `schema.sql` con el índice `appointments_unique_slot`.

### Commits clave

| PR/Commit | Qué hizo |
|---|---|
| `bf6da92` | fix(pricing): 10% VIP discount para clientes Coronita |
| `0592260` (#11) | fix(booking): bloquear duración completa para servicios combinados VIP |
| `eb9cea0` (#12) | feat(admin): tab "Ayuda" con FAQ |
| `85a308f` | feat(admin): entrada de FAQ sobre sobreturnos |
| `ce9556c` (#13) | fix(admin): aplicar descuento VIP a turnos agregados manualmente |
| `3ff21e7` | fix(admin): re-chequear descuento VIP antes de guardar, redondear al centenar |
| `9de8f48` (#16) | feat(admin): auto-generar turnos VIP recurrentes vía cron |
| `a2d5d00` (#17) | fix(admin): contador de pendientes + links wa.me válidos |
| `a8ff36f` (#18) | feat(admin): beep en notificación de turno nuevo |
| `683b4ce` (#19) | feat(admin): inbox "sin confirmar" fijado arriba de la agenda |
| `bd3ad55` (#20) | feat(admin): avisar por WhatsApp al cliente si se cancela/mueve el turno |
| `28eae29` (#21) | fix(admin): bloquear duración completa de servicios combinados en la agenda |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| Redondeo al centenar en descuentos VIP | Evitar precios como $12.320 — números feos para cobrar en efectivo |
| Cron para VIP recurrentes, no carga manual | Menos trabajo operativo para Santi/Fede cada semana |
| Contador + beep + inbox fijo en agenda | Los barberos no revisaban la agenda seguido — necesitaban señal activa |

### Lecciones aprendidas

- El descuento VIP necesitaba re-chequearse justo antes de guardar — un lookup async que no resolvía a tiempo dejaba pasar el precio sin descuento (race condition, corregida el mismo día).
- Automatizar turnos recurrentes vía cron resuelve el problema de "cargar todas las semanas", pero crea un problema nuevo: sacar a un cliente puntual del cron no es trivial (ver Capítulo 8 / issue #30).

---

## Capítulo 6: v1.5 — Anon-Hardening Kickoff & Agenda Hardening

**Fecha:** 13–14 de julio de 2026
**Commits:** ~6
**Dolor resuelto:** La agenda tenía huecos de render, faltaba un hook de pre-commit, y el acceso público (`/mi-turno`) dependía de queries directas sin capa de seguridad adicional.

### Qué se hizo

- **Agenda:** renderiza días laborables sin turnos en vez de omitirlos (`#24`).
- **Tooling:** se agregó el hook de pre-commit de Husky que faltaba, así `lint-staged` corre de verdad (`#25`); script `close-day` para cierres parciales puntuales (`#26`).
- **WhatsApp:** validación de teléfono acepta todos los formatos argentinos válidos, sin romper el link del cliente (`#27`).
- **Anon-hardening (Unit 1/4 y 2/4):** superficie aditiva en DB — vista `booked_slots` + 3 RPCs para que el acceso anónimo no dependa de leer la tabla `appointments` directamente (`#22`), y los consumidores de la app (booking público) repuntados a esa superficie nueva (`#28`). Primer paso de un trabajo de seguridad que se termina de cerrar recién en el Capítulo 8.

### Commits clave

| PR | Qué hizo |
|---|---|
| `ca8e438` (#24) | fix(admin): renderizar días laborables sin turnos |
| `a2eb596` (#25) | chore(husky): agregar el pre-commit hook que faltaba |
| `1643f05` (#26) | chore(scripts): close-day para cierres parciales |
| `2685cf4` (#27) | fix(booking): aceptar todo número argentino válido en WhatsApp |
| `14f1932` (#22) | feat(db): superficie anon-hardening aditiva (booked_slots + 3 RPCs) |
| `00d9bc9` (#28) | feat(booking): repuntar consumidores de la app a anon-hardening |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| Superficie aditiva (vista + RPCs) en vez de tocar RLS de `appointments` directo | Migración sin downtime — los consumidores viejos siguen andando mientras se repuntan de a uno |
| Repuntar consumidores en un PR separado del que crea la superficie | Permite revertir el consumo sin tocar el schema si algo sale mal |

---

## Capítulo 7: v1.6 — Reporting Automation & El Fix del Horario de Cierre

**Fecha:** 20 de julio – 31 de agosto de 2026
**Commits:** ~10
**Dolor resuelto:** No había visibilidad automática de KPIs para Santi y Fede, y un bug de larga data hacía que el horario de cierre se tratara como "último turno reservable" en vez de "hora en que debe terminar el servicio" — causando solapamientos de 60 minutos reportados por Fede.

### Qué se hizo

- **Reporting automatizado:** generador de informe semanal por cron (`8fe484b`), informe mensual en PDF (`665d1f7`), detección de cierres de local unificada en un solo predicado (`6bbb84b`).
- **Fix de URLs muertas:** los links de producción en docs/landing apuntaban a un deployment de Vercel específico que devolvía 410 Gone — se cambiaron a la URL estable del proyecto (`a084f63`).
- **El bug de solapamiento (reportado por Fede):** la duración del servicio nunca viajaba del paso "servicio" al paso "horario" — el sistema calculaba disponibilidad solo por el slot de inicio, no por cuánto duraba el turno. Fix en dos pasos: primero dimensionar la disponibilidad por duración real del servicio (`7d0b8a0`/`419b025`), después corregir la semántica de "hora de cierre" — es la hora en que el turno debe *terminar*, no la última hora en que puede *empezar* (`a751587`/`385dbd4`). Esta segunda corrección es la misma lógica que hoy protege el fix del horario de Santi (Capítulo 8, issue #29).
- **Bug del informe mensual:** truncado silencioso de PostgREST — el informe de agosto mostraba la mitad de los turnos reales (266 vs. 532) porque la query no paginaba. Corregido paginando la consulta (`dd666cf`).

### Commits clave

| Commit | Qué hizo |
|---|---|
| `3f108ce` | fix(agenda): usar AGENDA_DAYS_AHEAD en vez de ventana hardcodeada |
| `2da3505` | fix(scripts): asegurar que un servicio de bloqueo dure 30min antes de cerrar el día |
| `8fe484b` | feat(scripts): generador de informe semanal KPI automatizado |
| `6bbb84b` | feat(lib): detectar cierres de local con un solo predicado |
| `665d1f7` | feat(scripts): informe mensual en PDF para la barbería |
| `a084f63` | fix(docs): apuntar links de producción a la URL estable del proyecto |
| `7d0b8a0`/`419b025` | fix(booking): dimensionar disponibilidad por duración del servicio, no solo por slot de inicio |
| `a751587`/`385dbd4` | fix(booking): tratar el fin del horario como hora de cierre, no como último slot |
| `dd666cf` | fix(scripts): paginar la query del informe mensual |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| `window.to` = hora en que el servicio debe terminar | Único modelo correcto para servicios de duración variable — evita que un corte de 60min empiece 30min antes del cierre |
| Paginar la query de PostgREST en vez de confiar en el límite por defecto | El truncado silencioso (sin error) es peor que un error explícito — hay que pedir explícitamente todas las páginas |

### Lecciones aprendidas

- Un bug de "solapamiento" reportado como anecdótico por un barbero resultó ser un problema de una sola línea (la duración nunca viajaba entre pasos del wizard) — pero tardó dos PRs en corregirse completamente porque la primera corrección fue conservadora y la semántica real de "cierre" se terminó de confirmar después con Adriel.
- Un reporte con "menos turnos de los esperados" sin error visible es la señal clásica de un límite de paginación silencioso en PostgREST — nunca asumir que la respuesta trajo todo.

---

## Capítulo 8: v1.7 — Cancel/Confirm UX, Cierre de Anon-Hardening & Horario de Santi

**Fecha:** 21 de septiembre de 2026
**Commits:** ~5
**Tag de git:** `v1.1.0` (primer tag SemVer real del proyecto)
**Dolor resuelto:** El flujo de cancelación/confirmación necesitaba pulido, el trabajo de anon-hardening iniciado en el Capítulo 6 quedaba sin cerrar, el descuento VIP en quick-add seguía teniendo una race condition de redondeo, y Santi reportaba que el sistema no ofrecía su último turno real (18:30) porque su horario configurado había quedado desactualizado.

### Qué se hizo

- **Cancel/Confirm UX + cierre de anon-hardening:** mejoras al flujo de cancelación y confirmación de turnos, mergeadas junto con el cierre del trabajo de anon-hardening iniciado en julio — push directo a `main`, tagueado como `v1.1.0`.
- **VIP quick-add (PR #14):** re-chequeo del descuento VIP justo antes de guardar (evita que un lookup async lento deje pasar el precio sin descuento) + redondeo consistente al centenar, usando el mismo helper que ya usaba el booking público.
- **Horario de Santi (PR #32, cierra issue #29):** Santi cerraba a las 18:30 Mar-Vie, así que el sistema ofrecía correctamente 18:00 como último turno (termina justo al cierre) — pero Santi ahora trabaja hasta las 19:00, igual que Fede, y quería que el sistema lo reflejara. No era un bug de lógica: era el horario configurado el que había quedado atrás de la realidad. TDD completo: test actualizado primero (RED), después el cambio de configuración (GREEN). 272/272 tests, typecheck y biome limpios.

### Commits clave

| PR | Qué hizo |
|---|---|
| `acf2d18` | fix(booking): mejoras al flujo de cancelación y confirmación |
| `d568e05` (#14) | fix(admin): re-chequear descuento VIP antes de guardar, redondear al centenar |
| `c4f2c34` | fix(booking): mejoras a cancelación + cierre de anon-hardening (push directo, tag v1.1.0) |
| `49afaab` (#32) | fix(booking): extender el horario de cierre de Santi a las 19:00 |

### Decisiones clave

| Decisión | Por qué |
|---|---|
| Extender el horario de Santi (19:00) en vez de "aclarar la UI" | El horario real de trabajo de Santi cambió — la solución correcta es que el dato refleje la realidad, no maquillar el síntoma |
| Verificar antes de mergear los cambios directos a `main` (cancel/confirm + anon-hardening) | Un push directo a una rama protegida con auto-deploy a producción necesita el mismo nivel de chequeo que un PR, aunque haya llegado por otro canal |

### Lecciones aprendidas

- No todo "el sistema me da mal el horario" es un bug de código — acá la lógica de disponibilidad era matemáticamente correcta para el horario *configurado*; lo que estaba mal era el dato, no la función.
- Cuando dos sesiones/agentes trabajan sobre el mismo working directory en paralelo, un `git checkout` de uno mueve la rama activa bajo el otro — real, pasó en esta misma sesión. Vale la pena worktrees separados si va a haber concurrencia.

---

## Resumen del Proyecto

### Métricas al cierre (v1.7)

| Métrica | Valor |
|---|---|
| Commits totales | ~152 |
| Tests passing | 272 (13 skipped) |
| Features principales | Booking, Dashboard, Scanner, Cancel/Move, QR, VIP (pricing + recurrentes por cron), Auto-cancelación, PWA, Anon-hardening, Reportes automáticos (semanal/mensual) |
| Stack | Next.js 16, React 19, Supabase, Zustand, Tailwind v3, Vitest, Biome |
| Deploy | Vercel (auto-deploy from main) |
| Tag actual | `v1.1.0` (2026-09-21) |
| URL producción | https://il-barbiere-10-adrielias-projects.vercel.app/ |
| Ubicación | San Martín 345, Arroyo Seco, Santa Fe |

### PRs completados

| PR | Nombre | Estado |
|---|---|---|
| PR1 | DB Foundation | ✅ |
| PR2 | Booking Correctness | ✅ |
| PR3 | Auth SSR | ✅ |
| PR4 | Dashboard Status | ✅ |
| PR5 | Integration Tests | ✅ |
| PR6 | QR Scanner + AgendaView Batch | ✅ |
| PR7 | VIP Clients — tabla, slots, corona badge | ✅ |
| PR8 | Auto-cancelación cliente con cutoff 4h | ✅ |
| PR9 | UI Polish — logo, favicon, OG, PWA, fondo | ✅ |
| PR10-13, 21 | Pricing VIP + duración de servicios combinados | ✅ |
| PR12 | Ayuda tab + FAQ sobreturnos | ✅ |
| PR16 | Cron de turnos VIP recurrentes | ✅ |
| PR17-20 | Notificaciones de agenda (contador, beep, inbox, WhatsApp) | ✅ |
| PR22, 28 | Anon-hardening — superficie DB + consumidores repunteados | ✅ |
| PR24-27 | Agenda hardening + validación WhatsApp + tooling | ✅ |
| — | Reporting automatizado (semanal, mensual) + fix de solapamiento por duración/cierre | ✅ |
| PR14 | VIP quick-add — race condition + redondeo | ✅ |
| — | Cancel/Confirm UX + cierre de anon-hardening (tag v1.1.0) | ✅ |
| PR32 | Horario de Santi 18:30→19:00 (issue #29) | ✅ |

### Pendientes (próximas sesiones)

1. **Cargar VIPs quincenales de Fede** a Supabase: Juli Juárez (mar 12:30), Javi Orru (jue 09:00), Walter Chapista (vie 14:00) — necesita service role key *(sin verificar si ya se cargó)*
2. **Tipar CalendarView** con `Appointment[]` (deuda de AXON-L M4)
3. **Skeleton loaders** para UX de carga (M6)
4. **Notificación al barbero** cuando cliente cancela desde `/mi-turno` (distinto de la notificación al cliente ya implementada en PR #20)
5. **Issue #31** — mensaje de confirmación automática al cliente al reservar
6. **Issue #30** — sacar el turno fijo recurrente de Fede los viernes 12:00 del cron de VIP (Capítulo 5) — decisión de negocio de Santi
7. **Issue #7** — quick booking desde slots libres + botón de cancelar + fotos nuevas de barberos (el pendiente más viejo, desde el 30/06)
8. **Pagos online** — Mercado Pago / QR de cobro
9. **Foto original de la barbería sin texto** — para reemplazar la actual con blur

---

## Referencias

| Documento | Ubicación |
|---|---|
| AXON-L Mejoras | `02_PROYECTOS/IL-BARBIERE-AS/AXON-L-MEJORAS-2026-06-10.md` |
| README | `02_PROYECTOS/IL-BARBIERE-AS/README.md` |
| Marketing | `03_NEGOCIO/IL-BARBIERE/marketing/` |
| Portfolio | `02_PROYECTOS/Soluciones-Adriel-IA/portfolio/PORTFOLIO.md` |

---

*Siguiente libro: [[03_NEGOCIO/Distribuidora/ROADMAP.md|Rosita OS — Capítulos]] (completado)*
