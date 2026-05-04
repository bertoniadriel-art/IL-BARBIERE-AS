# Agent Instructions

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript check |
| `pnpm biome:check` | Lint + format check (Biome) |
| `pnpm biome:write` | Fix lint + format issues |
| `pnpm test` | Run tests |
| `pnpm test:coverage` | Run tests with coverage |

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Supabase** (Auth + DB)
- **Zustand** (State management)
- **TailwindCSS 3**
- **Biome** (Lint/Format)
- **Vitest** (Testing)
- **pnpm**

## Important Notes

1. **Linting** — Usa Biome, no ESLint/Prettier. Ejecutá `pnpm biome:write` antes de commit.
2. **Commits** — Conventional commits obligatorios (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Husky lo valida.
3. **Testing** — Agregar tests para componentes nuevos en `src/test/`.
4. **Types** — Todos los archivos `.ts`/`.tsx` deben tener tipos. No usar `any`.
5. **Client Components** — Agregar `"use client"` al inicio si usa hooks de React.
6. **Supabase** — Cliente en `src/shared/lib/supabase.ts`.

## Structure

```
src/
├── app/           # Next.js App Router pages
├── features/      # Feature modules (booking, admin, auth)
├── shared/       # Shared components, lib, types
└── test/         # Test setup and utils
```

## Environment

Variables requeridas en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Branching

- `main` — producción (protegido)
- `develop` — desarrollo
- `feature/*` — features nuevos
- `fix/*` — bug fixes