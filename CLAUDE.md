# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Afrodite CRM — a mobile-first PWA (React 18 + Vite 5 + Material UI 6) for biomedical/aesthetic clinics, deployed to Firebase Hosting (project `afrodite-62a56`). The UI copy, route paths, comments, and error messages are in **Brazilian Portuguese**; keep new code consistent with that.

## Commands

```bash
npm install
npm run emulators # terminal 1: Firebase Auth + Firestore emulators (needs firebase-tools + Java); UI at http://127.0.0.1:4000
npm run seed      # once (or to reset): wipes and reloads demo data into the emulators
npm run dev       # terminal 2: Vite dev server on http://localhost:5173 (talks to the emulators)
npm run build     # production build to dist/
npm run preview   # serve the built dist/
npm run deploy    # build + firebase deploy --only hosting,firestore (needs `firebase login` and .env.production)
```

There is no linter, formatter, or test suite configured.

Local login (seeded into the Auth emulator): `admin@afrodite.com` / `123456`.

## Architecture

- **Routing** (`src/App.jsx`): uses `HashRouter` (URLs look like `/#/pacientes/p1`). Every authenticated screen is wrapped in `PrivateRoute`, which redirects to `/login` when `useAuth().user` is null. New screens must be registered here.
- **Firebase** (`src/services/firebase.js`): initializes Auth + Firestore from `VITE_FIREBASE_*` env vars. `.env.development` sets `VITE_USE_FIREBASE_EMULATORS=true` and project `demo-afrodite` (the `demo-` prefix guarantees no real project is touched). Production config goes in `.env.production` (template: `.env.example`).
- **Auth** (`src/context/AuthContext.jsx`): driven by `afroditeApi.onAuthChange` (Firebase `onAuthStateChanged`). `user === undefined` while the session restores → `initializing`, and `AppRoutes` shows `FullScreenLoader` until then. "Manter conectada" on login chooses local vs. session persistence. Profile (`name`, `role`) lives in `users/{uid}`. Sign-up (`/criar-conta`, `afroditeApi.register`) creates the Auth user + `users/{uid}` with role `convidado`; `/esqueci-senha` uses `requestPasswordReset` (always shows the same confirmation, so it doesn't reveal which emails exist). Both share `AuthLayout` + `PasswordField` with the login screen.
- **Data layer** (`src/services/afroditeApi.js`): the single data boundary — screens import only `* as afroditeApi`, never Firebase directly. Return shapes are what screens consume: calendar dates are stored as `'YYYY-MM-DD'` strings (local time, helpers in `services/dates.js`) and returned formatted `DD/MM/YYYY` (raw value kept in `dateKey` / `*Date`); instants (`leads.createdAt`, messages) are Timestamps. Derived numbers (dashboard, finance summary, commission values, durations) are computed here, not stored. `getAgendaDayTabs` is the one synchronous function. Errors without `code` are already Portuguese; Firebase errors are translated by `utils/errors.js#friendlyMessage`.
- **Firestore model**: `users`, `patients` (+ subcollections `anamnese/main`, `procedures`, `photos`, `prescriptions`), `appointments` (denormalized patient name/age/CPF, `status` Agendado → Em atendimento → Concluído), `leads` (+ `messages`), `payments` (launches = paid payments), `commissions`. Rules (`firestore.rules`): `users/{uid}` is writable only by its owner, created only with role `convidado`, and the role can't be changed from the client (set higher roles via the console); every other collection is read/write for any signed-in user — since sign-up is open, tighten by role before real patient data. Seed data lives in `scripts/seed.mjs` (dates relative to today).
- **Screen pattern**: fetch with `useAsync(() => afroditeApi.x(id), [id])` (`src/hooks/useAsync.js`) → `{ data, error, loading, reload, setData }`; it ignores stale responses. Render `ListSkeleton`/`Skeleton` while loading, `ErrorState` (with retry) on error, `EmptyState` when empty. After a write, update locally with `setData` and confirm with `useToast()` (`src/context/ToastContext.jsx`). There is no global data store.
- **Layout & design system**: wrap screens in `AppScreen` (`header`, `nav` → renders the floating `BottomNav` and the bottom padding for it; content max-width 560). Headers use `ScreenHeader` (`large` serif title for tab roots; `back` for nested) or `PatientHeader`. Shared pieces in `src/components/`: `ListCard`, `StatusChip` (tones mapped in `theme/status.js` — add new statuses there), `PersonAvatar`, `PillTabs` (filters), `SectionTabs` (profile sections), `MetricCard`, `InsightCard`, `SectionTitle`, `InfoField`, `BottomSheet` (forms/actions), `StateViews`. Formatting helpers in `utils/format.js` (currency, initials, masks). `BottomNav` matches tabs by path prefix; `/financeiro` highlights "Mais".
- **Theme** (`src/theme/theme.js`): MUI theme + `brand` colors (wine `#6a3b4f`, rose, blush, gold, cream, ink, muted, line), `gradients`, `shadows`, `fonts`. Typography: Cormorant Garamond (h1–h5, display titles) + Inter Variable (body), self-hosted via `@fontsource` in `main.jsx`. Most card/button/input styling comes from theme overrides — prefer them over per-screen `sx`. Use `env(safe-area-inset-*)` for top/bottom spacing. The PWA manifest colors in `vite.config.js` mirror `brand.wine`.
- **Feature folders**: `src/screens/patients/` (list + `partials/NewPatientSheet`, profile with tabs, editable anamnese, prescriptions, `partials/`) and `src/screens/leads/` (list + `NewLeadSheet`, detail with funnel, WhatsApp chat that persists messages). Actions not built yet show an "em breve" toast.

## PWA / Hosting

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`; icons live in `public/icons/`. Fonts (`woff2`) are precached. Vendor code is split into `react`, `mui`, `firebase` chunks (`build.rollupOptions.output.manualChunks`).
- `firebase.json` serves `dist/`, rewrites all paths to `/index.html`, and sets `Cache-Control: no-cache` on `/sw.js` so service-worker updates propagate.
