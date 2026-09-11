# Afrodite CRM — PWA

Interface mobile (Android/iOS via PWA) do CRM para clínicas biomédicas, construída em React + Vite + Material UI, com deploy no Firebase Hosting.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

Login de demonstração (mock): `admin@afrodite.com` / `123456`

## Build de produção

```bash
npm run build
npm run preview
```

## Deploy no Firebase

1. Instale a CLI do Firebase (uma vez só, globalmente):
   ```bash
   npm install -g firebase-tools
   ```
2. Faça login:
   ```bash
   firebase login
   ```
3. Crie o projeto no [console do Firebase](https://console.firebase.google.com/) e copie o **Project ID**.
4. Edite o arquivo `.firebaserc` e troque `SUBSTITUA-PELO-ID-DO-SEU-PROJETO-FIREBASE` pelo ID real.
5. Rode o deploy:
   ```bash
   npm run deploy
   ```

## Estrutura

```
src/
  screens/       # SplashScreen, LoginScreen, WelcomeScreen, PlaceholderScreen
  components/    # BottomNav
  context/       # AuthContext (estado de login)
  services/      # afroditeApi.js — hoje mockado, trocar pela API real depois
  theme/         # paleta de cores e tema Material UI
```

## Próximos passos sugeridos

- Substituir `src/services/afroditeApi.js` pelas chamadas reais ao sistema Afrodite.
- Implementar as telas de Pacientes, Agenda e Perfil (hoje placeholders).
- Configurar Firebase Authentication caso o login real passe a ser via Firebase.
