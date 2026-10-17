# Afrodite CRM — PWA

Interface mobile (Android/iOS via PWA) do CRM para clínicas biomédicas e de estética, construída em React + Vite + Material UI, com dados no Firebase (Auth + Firestore) e deploy no Firebase Hosting.

## Rodando localmente

Pré-requisitos: Node 18+, [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`) e Java 11+ (exigido pelo emulador do Firestore).

```bash
npm install

# Terminal 1 — emuladores do Firebase (Auth + Firestore)
npm run emulators

# Uma vez (ou sempre que quiser resetar os dados de demonstração)
npm run seed

# Terminal 2 — app
npm run dev
```

- App: http://localhost:5173
- Painel dos emuladores (ver/editar dados e usuários): http://127.0.0.1:4000
- Login: `admin@afrodite.com` / `123456`

Os dados ficam salvos em `.emulator-data/` ao encerrar os emuladores (Ctrl+C) e são recarregados na próxima vez. O ambiente local usa o projeto `demo-afrodite`, que nunca acessa o Firebase real.

## Build de produção

```bash
cp .env.example .env.production   # preencha com a config do app Web do Firebase
npm run build
npm run preview
```

## Deploy no Firebase

```bash
firebase login
npm run deploy   # build + hosting + regras do Firestore
```

Antes de usar dados reais: crie os usuários no Firebase Authentication, o documento `users/{uid}` com `name` e `role`, e revise `firestore.rules` (hoje qualquer usuário autenticado lê e escreve tudo).

## Estrutura

```
scripts/seed.mjs   # dados de demonstração para os emuladores
src/
  screens/         # telas (patients/, leads/, Agenda, Financeiro, Home...)
  components/      # design system: AppScreen, ScreenHeader, ListCard, StatusChip...
  context/         # AuthContext (sessão Firebase), ToastContext (avisos)
  hooks/           # useAsync — carregamento com erro/retry
  services/        # afroditeApi.js (única camada de dados), firebase.js, dates.js
  theme/           # tema MUI, paleta e tons de status
  utils/           # formatação, máscaras, mensagens de erro
```
