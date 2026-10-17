// Inicialização do Firebase. Em desenvolvimento (`npm run dev`) conecta nos
// emuladores locais; em produção usa a config do app Web definida em
// .env.production (ver .env.example).

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const env = import.meta.env

const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
})

export const app = firebaseApp
export const auth = getAuth(app)
// E-mails do Firebase (redefinição de senha etc.) em português
auth.languageCode = 'pt-BR'
export const db = getFirestore(app)
export const storage = getStorage(app)
export const usingEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true'

if (usingEmulators) {
  // Usa o mesmo host da página para funcionar também ao abrir pelo celular na rede local
  const host = window.location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
  connectStorageEmulator(storage, host, 9199)
}
