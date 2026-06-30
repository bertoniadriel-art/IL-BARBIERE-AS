<p align="center">
  <img src="./public/assets/logo/logo-official.jpg" alt="Il Barbiere" width="200" />
</p>

<h1 align="center">IL BARBIERE OS</h1>

<p align="center">
  El Sistema Operativo de tu imagen personal.
</p>

<p align="center">
  <a href="https://il-barbiere-10-5r4p8m8l4-adrielias-projects.vercel.app/">
    <img src="https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-2-black?style=for-the-badge&logo=supabase" alt="Supabase" />
</p>

---

## 🚀 Quick Start

```bash
# Clonar el repo
git clone https://github.com/bertoniadriel-art/IL-BARBIERE-AS.git
cd IL-BARBIERE-AS

# Instalar dependencias
pnpm install

# Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Desarrollo
pnpm dev
```

---

## 📋 Tech Stack

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | TailwindCSS 3 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Estado | Zustand |
| Testing | Vitest + React Testing Library |
| Lint/Format | Biome |
| Package Manager | pnpm |
| Deploy | Vercel (auto-deploy from main) |

---

## 🗂️ Estructura del Proyecto

```
src/
├── app/                        # Páginas Next.js (App Router)
│   ├── page.tsx               # Landing page
│   ├── reservar/              # Flow de reservas (wizard)
│   ├── mi-turno/[hash]/       # Auto-cancelación de turno (cliente)
│   ├── admin/                 # Dashboard admin
│   └── layout.tsx             # Root layout
│
├── features/                  # Módulos por funcionalidad
│   ├── booking/               # Reserva de turnos
│   │   ├── components/        # Wizard, Confirmación, CancelAppointment
│   │   ├── services/          # Disponibilidad (bloquea slots y VIPs)
│   │   └── bookingStore.ts    # Estado Zustand
│   ├── admin/                 # Panel admin
│   │   ├── components/        # AgendaView, AdminLayout, DaySection
│   │   └── services/          # Servicios admin
│   └── auth/                  # Autenticación
│
├── shared/                    # Código compartido
│   ├── components/            # Componentes reutilizables
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Supabase client (server + browser)
│   └── types/                 # Tipos globales (AppointmentStatus, VipClient, etc.)
│
└── test/                      # Configuración de tests
```

---

## ⚙️ Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Iniciar producción |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm biome:check` | Lint + Format check |
| `pnpm biome:write` | Corregir lint + format |
| `pnpm test` | Ejecutar tests |
| `pnpm test:coverage` | Tests con coverage |
| `pnpm scanner:fixtures` | Generar fixtures de prueba para QR scanner |

---

## 🌿 Git Flow

```
main    ←── Producción (protegido, auto-deploy a Vercel)
  ↑
develop ←── Desarrollo
  ↑
feature/*  ←── Features nuevos
fix/*      ←── Bug fixes
```

**Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)

---

## 🔧 Environment Variables

Crear `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

---

## 📱 Funcionalidades

### Reserva Online
- ✅ Wizard de 3 pasos (Barbero → Servicio → Horario)
- ✅ Servicios y horarios cargados desde Supabase
- ✅ Validación de disponibilidad en tiempo real
- ✅ Prevención de colisiones (23505)
- ✅ QR único por turno
- ✅ Compartir por WhatsApp
- ✅ Link post-reserva para ver o cancelar el turno

### Auto-cancelación de Turno (Cliente)
- ✅ Página `/mi-turno/[hash]` accesible sin login
- ✅ Muestra datos del turno (fecha, hora, barbero, servicio)
- ✅ Botón de cancelación disponible hasta 4 horas antes del turno
- ✅ Mensaje de advertencia cuando el plazo de cancelación vence
- ✅ Identificación por QR hash — sin auth requerida

### Agenda Admin (AgendaView)
- ✅ Vista diaria colapsable por día
- ✅ Barra de disponibilidad visual con porcentaje
- ✅ Slots disponibles por día
- ✅ Corona 👑 para clientes VIP (cross-reference contra tabla `vip_clients`)
- ✅ Botones de bloqueo de slot y contacto por WhatsApp
- ✅ Estados de turno: pending, confirmed, attended, cancelled, debt, blocked
- ✅ Sidebar colapsable con navegación por íconos

### Clientes VIP
- ✅ Tabla `vip_clients` con slots reservados por día/hora
- ✅ Frecuencia semanal o quincenal
- ✅ Descuento configurable por cliente
- ✅ Bloqueo automático de slot en `blocked_slots`
- ✅ Badge de corona en AgendaView por nombre de cliente

### Dashboard Admin
- ✅ Métricas en tiempo real (flujo de caja, clientes)
- ✅ Quick actions (Confirmar/Presente)
- ✅ Estado de conexión a Supabase
- ✅ Calendario visual por barbero

### Scanner QR
- ✅ Escaneo con cámara del celular
- ✅ Validación de turno para hoy
- ✅ Expiración QR (2h después del turno)
- ✅ Prevención de reutilización
- ✅ Check-in automático

### Seguridad
- ✅ Autenticación con Supabase Auth
- ✅ RLS (Row Level Security)
- ✅ Middleware de sesión

---

## 🧪 Tests

```
124/124 tests passing
```

### Cobertura:
- Booking flow (colisiones, servicios, horarios)
- Dashboard (métricas, quick actions, conexión)
- Scanner (fixtures de prueba con QRs generados)
- Auth (login, sesión, middleware)

### Fixtures de Scanner

```bash
# Generar QRs de prueba
pnpm scanner:fixtures

# QRs generados:
# TEST-TODAY-001    → Check-in exitoso
# TEST-TOMORROW-001 → QR para otro día
# TEST-ATTENDED-001 → Ya registrado
# TEST-EXPIRED-001  → QR expirado (2h)
```

---

## 📊 Estado del Proyecto

| PR | Estado | Descripción |
|----|--------|-------------|
| PR1 | ✅ | DB Foundation (schema, RLS, migrations) |
| PR2 | ✅ | Booking Correctness (colisiones, disponibilidad) |
| PR3 | ✅ | Auth SSR (middleware, sesiones) |
| PR4 | ✅ | Dashboard Status (métricas, conexión, quick actions) |
| PR5 | ✅ | Integration Tests (124 tests) |
| PR6 | ✅ | QR Scanner con expiración 2h |
| PR7 | ✅ | AgendaView UI — 10 features (VIP, slots, colapso, barra) |
| PR8 | ✅ | VIP Clients — tabla, slots bloqueados, corona badge |
| PR9 | ✅ | Auto-cancelación de turno con cutoff de 4 horas |

---

## 🤝 Contribuir

1. Fork del repo
2. Crear branch: `git checkout -b feature/mi-nueva-feature`
3. Commit: `git commit -m 'feat: Agregar nueva feature'`
4. Push: `git push origin feature/mi-nueva-feature`
5. Abrir Pull Request

---

## 📍 Ubicación

**San Martín 345, Arroyo Seco, Santa Fe**

---

## 📄 Licencia

MIT © 2026 Il Barbiere

---

<p align="center">
  <small>Hecho por Soluciones Adriel-IA</small>
</p>
