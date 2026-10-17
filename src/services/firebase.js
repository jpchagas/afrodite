// Inicialização do Firebase. Em desenvolvimento (`npm run dev`) conecta nos
// emuladores locais; em produção usa a config do app Web definida em
// .env.production (ver .env.example).

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const env = import.meta.env

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
})

export const auth = getAuth(app)
export const db = getFirestore(app)

if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  // Usa o mesmo host da página para funcionar também ao abrir pelo celular na rede local
  const host = window.location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
