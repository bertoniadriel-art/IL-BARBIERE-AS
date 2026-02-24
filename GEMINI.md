# 🛡️ IL BARBIERE OS - Auto-Blindaje

> *"El mejor proceso es uno que se fortalece solo. Cada error es un impacto que refuerza la fábrica."*

## 🧠 Aprendizajes (Impactos Registrados)

### [2026-02-21]: Error de Importación Crítico (TS2304)
- **Error**: Se intentó usar el componente `<ArrowRight />` en `Confirmation.tsx` sin haberlo importado de `lucide-react`. Esto causó un fallo en el build de producción.
- **Fix**: Se agregó la importación explícita.
- **Blindaje**: SIEMPRE ejecutar `npm run typecheck` antes de cualquier reporte final. No confiar en el autocompletado si no hay una verificación de tipos activa.

### [2026-02-21]: Sintaxis Anidada en Integración de Auth
- **Error**: Al integrar `authService` en `LoginForm.tsx`, se anidaron funciones y declaraciones de interfaces accidentalmente, rompiendo el componente.
- **Fix**: Refactorización completa del archivo con estructura limpia.
- **Blindaje**: Al realizar migraciones de "Demo" a "Real", es preferible sobreescribir el archivo completo con la lógica final en lugar de parches incrementales que puedan causar anidamiento accidental.

### [2025-01-09]: Usar npm run dev, no next dev
- **Error**: Puerto hardcodeado causa conflictos.
- **Fix**: Siempre usar `npm run dev` (auto-detecta puerto).
- **Aplicar en**: Todos los proyectos de la fábrica.

### [2026-02-21]: Estabilidad en Autenticación (Supabase)
- **Error**: Dependencia de `@supabase/auth-helpers-nextjs` causó errores de exportación de tipos en entornos de build estrictos.
- **Fix**: Migración al cliente estándar de Supabase (`@supabase/supabase-js`) para el servicio de autenticación.
- **Blindaje**: Preferir el cliente nativo y centralizado en `shared/lib/supabase` para evitar discrepancias entre sub-librerías de helpers. Eliminar middleware innecesario en arquitecturas de página única (Single Page OS) para reducir puntos de fallo.

### [2026-02-24]: Fallo de Build en Vercel (SSR/Hydration)
- **Error**: El uso de `html5-qrcode` en `ScannerModule.tsx` sin envoltorio dinámico causó fallos en el pre-renderizado de Vercel. Las librerías que acceden a APIs del navegador (cámara, canvas) rompen el build de producción si se importan estáticamente en el App Router.
- **Fix**: Uso de `next/dynamic` con `{ ssr: false }` para cargar el componente del escáner solo en el cliente.
- **Blindaje**: SIEMPRE usar imports dinámicos para librerías de hardware o browser-only (QR, Scanners, Maps). No basta con el `useEffect`, la importación misma debe ser diferida.

---
*Este archivo es el cerebro de la fábrica. Cada error documentado la hace más fuerte.*
