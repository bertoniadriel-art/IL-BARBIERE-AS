<p align="center">
  <img src="./public/assets/logo.svg" alt="Il Barbiere" width="200" />
</p>

<h1 align="center">IL BARBIERE - Sistema de Gestión de Turnos</h1>

<p align="center">
  App de gestión de turnos para barbería con reservas online, dashboard admin y scanner QR.
</p>

<p align="center">
  <a href="https://il-barbiere-10-cwt5rfcub-adrielias-projects.vercel.app/">
    <img src="https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-3-black?style=for-the-badge&logo=supabase" alt="Supabase" />
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
| Lenguaje | TypeScript |
| Estilos | TailwindCSS 3 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Estado | Zustand |
| Testing | Vitest + React Testing Library |
| Lint/Format | Biome |
| Package Manager | pnpm |

---

## 🗂️ Estructura del Proyecto

```
src/
├── app/                      # Páginas Next.js (App Router)
│   ├── page.tsx             # Landing page
│   ├── reservar/            # Flow de reservas
│   ├── admin/               # Dashboard admin
│   └── layout.tsx           # Root layout
│
├── features/                # Módulos por funcionalidad
│   ├── booking/             # Reserva de turnos
│   │   ├── components/      # Componentes del wizard
│   │   └── bookingStore.ts  # Estado Zustand
│   ├── admin/               # Panel admin
│   │   └── components/      # Componentes admin
│   └── auth/                # Autenticación
│
├── shared/                  # Código compartido
│   ├── components/          # Componentes reutilizables
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   └── supabase.ts      # Cliente Supabase
│   └── types/               # Tipos globales
│
└── test/                    # Configuración de tests
```

---

## ⚙️ Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Iniciar producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm biome:check` | Lint + Format check |
| `pnpm biome:write` | Corregir lint + format |
| `pnpm test` | Ejecutar tests |
| `pnpm test:coverage` | Tests con coverage |

---

## 🌿 Git Flow

```
main    ←── Producción (protegido)
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

- ✅ Reserva de turnos online
- ✅ Selector de servicio, barbero y horario
- ✅ Dashboard admin con métricas
- ✅ Scanner QR para confirmar turnos
- ✅ Sistema de login admin
- ✅ Diseño responsive mobile-first

---

## 🤝 Contribuir

1. Fork del repo
2. Crear branch: `git checkout -b feature/mi-nueva-feature`
3. Commit: `git commit -m 'feat: Agregar nueva feature'`
4. Push: `git push origin feature/mi-nueva-feature`
5. Abrir Pull Request

---

## 📄 Licencia

MIT © 2026 Il Barbiere