# Friendly Frontend

Expo Router app that routes through thin screens under `app/` and keeps the bulk of UI/business logic under `src/`.

## Project layout

- `app/` – Expo Router entry points. Each route file is a light wrapper that renders a screen from `src/screens`. Tabs live in `app/(tabs)/`.
- `src/` – Actual app code:
  - `screens/` – Screen components (with barrel export). See `src/screens/README.md`.
  - `components/` – Reusable UI pieces grouped by domain (common, schedule, ui, etc.). See `src/components/README.md`.
  - `services/` – Business logic and API integration by domain. See `src/services/README.md`.
  - `types/` – Shared TypeScript types with a barrel export. See `src/types/README.md`.
  - `config/` – Environment and Firebase setup.
  - `context/`, `hooks/`, `constants/`, `lib/`, `data/` – App state, custom hooks, theme/constants, utilities, and mock data.

## Path aliases

Configured in `tsconfig.json`:

```ts
"@/*": ["./*"],
"@/src/*": ["./src/*"]
```

Use `@/src/...` for imports from `src` in both `app` routes and `src` code (e.g., `import { Button } from '@/src/components/ui/button'`).

## Getting started

```bash
npm install
npx expo start
```

## Conventions

- Keep `app/` routes thin; put logic and UI composition in `src/screens` and below.
- Prefer barrel exports for screens/services/types; import components directly by path.
- Follow feature-based grouping inside `src` and add to the relevant README when expanding structure.
