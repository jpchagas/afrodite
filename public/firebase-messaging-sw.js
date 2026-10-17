/* Service worker do Firebase Cloud Messaging: recebe push com o app fechado.
 * A config pública do Firebase chega pela URL de registro (ver
 * enablePushNotifications em src/services/afroditeApi.js). Notificações com
 * `notification` no payload são exibidas automaticamente pelo SDK, e o toque
 * abre o link definido em `webpush.fcmOptions.link`. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId')
})
firebase.messaging()
