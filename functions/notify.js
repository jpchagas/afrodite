// Envio de notificações: grava em users/{uid}/notifications (central do app)
// e dispara push via Firebase Cloud Messaging para os aparelhos do usuário.

import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'

if (!getApps().length) initializeApp()

export const db = getFirestore()

// Endereço público do app — usado no link ao tocar na notificação push
const APP_URL = 'https://afrodite-62a56.web.app'

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
])

async function sendPush(uids, { title, body, link }) {
  // No emulador não há FCM: a central de notificações já basta para testar
  if (process.env.FUNCTIONS_EMULATOR === 'true') return

  const deviceSnaps = await Promise.all(uids.map((uid) => db.collection(`users/${uid}/devices`).get()))
  const devices = deviceSnaps.flatMap((snap) => snap.docs)
  if (!devices.length) return

  const response = await getMessaging().sendEachForMulticast({
    tokens: devices.map((d) => d.id),
    notification: { title, body },
    webpush: {
      notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', lang: 'pt-BR' },
      fcmOptions: { link: `${APP_URL}/#${link}` }
    }
  })

  // Remove tokens de aparelhos que desinstalaram o app ou revogaram a permissão
  const stale = response.responses
    .map((r, i) => (!r.success && INVALID_TOKEN_CODES.has(r.error?.code) ? devices[i].ref : null))
    .filter(Boolean)
  await Promise.all(stale.map((ref) => ref.delete()))
  logger.info('push enviado', { success: response.successCount, failure: response.failureCount, removed: stale.length })
}

/**
 * Notifica toda a equipe (todos os documentos em `users`), exceto `exclude`
 * — normalmente quem realizou a ação.
 * type: 'lead' | 'mensagem' | 'agendamento' | 'lembrete'
 */
export async function notifyStaff({ type, title, body, link, exclude = null }) {
  const users = await db.collection('users').get()
  const uids = users.docs.map((d) => d.id).filter((uid) => uid !== exclude)
  if (!uids.length) return

  const batch = db.batch()
  for (const uid of uids) {
    batch.set(db.collection(`users/${uid}/notifications`).doc(), {
      type,
      title,
      body,
      link,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  }
  await batch.commit()

  try {
    await sendPush(uids, { title, body, link })
  } catch (err) {
    // Falha no push não deve impedir a notificação no app
    logger.error('falha no push', err)
  }
}

export function formatDateKey(key) {
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}

export function truncate(text = '', max = 110) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
