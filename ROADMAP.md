---
created: 2026-06-25
updated: 2026-06-30
type: roadmap
project: IL BARBIERE-AS
version: 1.3
marca: Soluciones Adriel-IA
tags: [barbiere, roadmap, versiones, hitos, libro]
---

# IL BARBIERE-AS — Capítulos

> *El Sistema Operativo de tu imagen personal — de un repo initial a producción pulida con ~94 commits.*

```
  FEBRERO 2026    MAYO 2026       JUNIO 2026      JUNIO 2026
    │               │               │               │
    ●──── v1.0 ────●──── v1.1 ────●──── v1.2 ────●──── v1.3
  Initial         MVP Core       Dashboard +     UI Polish +
  Commit          Booking+Auth   Scanner+Tests   VIP+Cancel+PWA
  (repo base)     (PR1-PR3)      (PR4-PR5)       (PR6-PR9)
```

### Evolución del proyecto

| Fase | Fechas | Commits | Tests | Estado |
|---|---|---|---|---|
| **v1.0** Initial | 24 feb – 3 may | ~10 | — | ✅ |
| **v1.1** MVP Core | 24–25 may | ~15 | — | ✅ |
| **v1.2** Dashboard & Features | 21–25 jun | ~50 | 124 | ✅ |
| **v1.3** UI Polish + VIP + Cancel + PWA | 29–30 jun | ~17 | 151 | ✅ |

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

## Resumen del Proyecto

### Métricas al cierre (v1.3)

| Métrica | Valor |
|---|---|
| Commits totales | ~94 |
| Tests passing | 151 |
| Features principales | Booking, Dashboard, Scanner, Cancel/Move, QR, VIP, Auto-cancelación, PWA |
| Stack | Next.js 16, React 19, Supabase, Zustand, Tailwind v3, Vitest, Biome |
| Deploy | Vercel (auto-deploy from main) |
| URL producción | https://il-barbiere-10-jq4f9t7y6-adrielias-projects.vercel.app/ |
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

### Pendientes (próximas sesiones)

1. **Cargar VIPs quincenales de Fede** a Supabase: Juli Juárez (mar 12:30), Javi Orru (jue 09:00), Walter Chapista (vie 14:00) — necesita service role key
2. **Tipar CalendarView** con `Appointment[]` (deuda de AXON-L M4)
3. **Skeleton loaders** para UX de carga (M6)
4. **Notificación al barbero** cuando cliente cancela desde `/mi-turno`
5. **WhatsApp integration** — confirmación automática de turno
6. **Pagos online** — Mercado Pago / QR de cobro
7. **Foto original de la barbería sin texto** — para reemplazar la actual con blur

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
