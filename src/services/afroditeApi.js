// Camada de acesso ao sistema Afrodite — a única fronteira de dados do app.
// As telas importam apenas `* as afroditeApi`. Os dados vêm do Firebase
// (Auth + Firestore); em desenvolvimento, dos emuladores locais.
//
// Os formatos de retorno são os mesmos que as telas já consomem; datas de
// calendário saem formatadas ('DD/MM/YYYY') e o valor bruto fica em campos
// `*Date` / `dateKey` quando necessário.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { app, auth, db, storage, usingEmulators } from './firebase.js'
import {
  toDateKey,
  todayKey,
  parseDateKey,
  addDays,
  formatDateKey,
  formatTime,
  formatRelativeLabel,
  monthPrefix,
  monthName,
  addMinutesToTime
} from './dates.js'

// ---- Helpers ----

function withId(snap) {
  return { id: snap.id, ...snap.data() }
}

async function list(q) {
  const snap = await getDocs(q)
  return snap.docs.map(withId)
}

async function getOrThrow(ref, notFoundMessage) {
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error(notFoundMessage)
  return withId(snap)
}

function toDate(value) {
  return value instanceof Timestamp ? value.toDate() : value || null
}

function currentUid() {
  return auth.currentUser?.uid || null
}

// ---- Autenticação ----

const AUTH_ERRORS = {
  'auth/invalid-credential': 'E-mail ou senha inválidos',
  'auth/invalid-email': 'E-mail inválido',
  'auth/user-not-found': 'E-mail ou senha inválidos',
  'auth/wrong-password': 'E-mail ou senha inválidos',
  'auth/user-disabled': 'Este usuário está desativado',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique sua internet.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/missing-email': 'Informe o e-mail.'
}

async function loadProfile(fbUser) {
  const fallback = {
    email: fbUser.email,
    name: fbUser.displayName || fbUser.email,
    role: null
  }
  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid))
    return snap.exists() ? { ...fallback, ...snap.data() } : fallback
  } catch {
    return fallback
  }
}

export async function login({ email, password, remember = false }) {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    const [token, user] = await Promise.all([cred.user.getIdToken(), loadProfile(cred.user)])
    return { token, user }
  } catch (err) {
    throw new Error(AUTH_ERRORS[err.code] || 'Não foi possível entrar. Tente novamente.')
  }
}

// Contas criadas pelo app entram como 'convidado' (as regras do Firestore
// não permitem escolher outro papel no cadastro).
export async function register({ name, email, password }) {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    const profile = { name: name.trim(), email: cred.user.email, role: 'convidado' }
    await updateProfile(cred.user, { displayName: profile.name })
    await setDoc(doc(db, 'users', cred.user.uid), { ...profile, createdAt: serverTimestamp() })
    return { token: await cred.user.getIdToken(), user: profile }
  } catch (err) {
    throw new Error(AUTH_ERRORS[err.code] || 'Não foi possível criar a conta. Tente novamente.')
  }
}

// Com a proteção contra enumeração de e-mails do Firebase, a chamada não
// informa se o e-mail existe — a tela mostra sempre a mesma confirmação.
export async function requestPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim())
  } catch (err) {
    if (err.code === 'auth/user-not-found') return
    throw new Error(AUTH_ERRORS[err.code] || 'Não foi possível enviar o e-mail. Tente novamente.')
  }
}

export async function logout() {
  // Desvincula o aparelho antes de sair, para não receber push de outra conta
  await disablePushNotifications().catch(() => {})
  return signOut(auth)
}

// Chama `callback(user | null)` sempre que a sessão muda (inclusive na
// restauração inicial). Retorna a função para cancelar a inscrição.
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    callback(fbUser ? await loadProfile(fbUser) : null)
  })
}

// ---- Dashboard (Home) ----

export async function getDashboardSummary() {
  const since = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const [appointmentsToday, recentLeads, proposals, payments, patients] = await Promise.all([
    list(query(collection(db, 'appointments'), where('dateKey', '==', todayKey()))),
    list(query(collection(db, 'leads'), where('createdAt', '>=', since))),
    list(query(collection(db, 'leads'), where('status', '==', 'Proposta'))),
    list(query(collection(db, 'payments'), where('status', '==', 'Pago'))),
    list(collection(db, 'patients'))
  ])

  const revenueOf = (prefix) =>
    payments.filter((p) => p.date?.startsWith(prefix)).reduce((sum, p) => sum + p.amount, 0)
  const monthRevenue = revenueOf(monthPrefix(0))
  const previousRevenue = revenueOf(monthPrefix(-1))

  // Heurística simples até existir o motor de IA: pacientes ativos sem
  // retorno futuro agendado são candidatos a um novo procedimento.
  const today = todayKey()
  const opportunities = patients.filter(
    (p) => p.status !== 'Inativa' && (!p.nextReturn || p.nextReturn < today)
  ).length

  return {
    appointmentsToday: appointmentsToday.length,
    newLeads24h: recentLeads.length,
    pendingProposals: proposals.length,
    monthRevenue,
    monthRevenueGrowthPct: previousRevenue
      ? Math.round(((monthRevenue - previousRevenue) / previousRevenue) * 100)
      : null,
    aiInsight: {
      text:
        opportunities === 1
          ? '1 paciente pode estar pronta para um novo procedimento.'
          : `${opportunities} pacientes podem estar prontos para um novo procedimento.`,
      count: opportunities
    }
  }
}

// ---- Pacientes ----

function toPatient(p) {
  return {
    ...p,
    lastVisitDate: p.lastVisit || null,
    nextReturnDate: p.nextReturn || null,
    lastVisit: formatDateKey(p.lastVisit),
    nextReturn: formatDateKey(p.nextReturn)
  }
}

export async function getPatients() {
  const patients = await list(query(collection(db, 'patients'), orderBy('name')))
  return patients.map(toPatient)
}

export async function getPatient(id) {
  return toPatient(await getOrThrow(doc(db, 'patients', id), 'Paciente não encontrado'))
}

export async function createPatient({ name, phone, cpf, age }) {
  const data = {
    name: name.trim(),
    phone: phone.trim(),
    cpf: cpf.trim(),
    age: age ? Number(age) : null,
    status: 'Em avaliação',
    lastVisit: null,
    lastVisitLabel: 'Sem consultas',
    nextReturn: null,
    nextReturnLabel: 'A agendar',
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'patients'), data)
  return toPatient({ id: ref.id, ...data })
}

const EMPTY_ANAMNESE = {
  queixaPrincipal: 'Ainda não registrada.',
  historicoMedico: 'Sem informações registradas.',
  alergias: 'Não informado.',
  procedimentosAnteriores: 'Nenhum procedimento anterior registrado.'
}

export async function getPatientAnamnese(id) {
  const snap = await getDoc(doc(db, 'patients', id, 'anamnese', 'main'))
  return snap.exists() ? { ...EMPTY_ANAMNESE, ...snap.data() } : { ...EMPTY_ANAMNESE }
}

export async function updatePatientAnamnese(id, data) {
  const { queixaPrincipal, historicoMedico, alergias, procedimentosAnteriores } = data
  const payload = { queixaPrincipal, historicoMedico, alergias, procedimentosAnteriores }
  await setDoc(
    doc(db, 'patients', id, 'anamnese', 'main'),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true }
  )
  return payload
}

export async function getPatientProcedures(id) {
  const procedures = await list(
    query(collection(db, 'patients', id, 'procedures'), orderBy('date', 'desc'))
  )
  return procedures.map((p) => ({ ...p, dateKey: p.date, date: formatDateKey(p.date) }))
}

export async function getPatientPhotos(id) {
  const photos = await list(query(collection(db, 'patients', id, 'photos'), orderBy('date')))
  return photos.map((p) => ({ ...p, dateKey: p.date, date: formatDateKey(p.date) }))
}

export async function getPatientPrescriptions(id) {
  const prescriptions = await list(
    query(collection(db, 'patients', id, 'prescriptions'), orderBy('startDate', 'desc'))
  )
  return prescriptions.map((rx) => ({
    ...rx,
    detail: rx.startDate ? `${rx.detail} • ${formatDateKey(rx.startDate)}` : rx.detail,
    nextSession: rx.nextSession ? formatDateKey(rx.nextSession) : null
  }))
}

export const PRESCRIPTION_KINDS = ['Sessões na clínica', 'Uso domiciliar', 'Medicamento']

export async function createPrescription(patientId, { name, kind, detail, startDate, nextSession }) {
  const data = {
    name: name.trim(),
    kind: kind || PRESCRIPTION_KINDS[0],
    detail: detail.trim(),
    startDate: startDate || todayKey(),
    nextSession: nextSession || null,
    status: 'Em dia',
    active: true,
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'patients', patientId, 'prescriptions'), data)
  const [created] = (await getPatientPrescriptions(patientId)).filter((rx) => rx.id === ref.id)
  return created
}

export async function completePrescription(patientId, prescriptionId) {
  await updateDoc(doc(db, 'patients', patientId, 'prescriptions', prescriptionId), {
    active: false,
    status: 'Concluído',
    nextSession: null,
    completedAt: serverTimestamp()
  })
}

// ---- Agenda ----

export const ROOMS = ['Sala 1 • Clínica Central', 'Sala 2 • Clínica Central']
export const DURATIONS = [30, 45, 60, 90, 120]

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function toAppointment(a) {
  const endTime = a.durationMin ? addMinutesToTime(a.time, a.durationMin) : null
  return {
    ...a,
    date: parseDateKey(a.dateKey, a.time),
    durationLabel: endTime ? `${a.time} - ${endTime}` : null,
    room: a.room || null,
    status: a.status || 'Agendado'
  }
}

// Única função síncrona: as abas de dia são derivadas da data local.
// `startKey` ('YYYY-MM-DD') define o primeiro dia; padrão = hoje.
export function getAgendaDayTabs(count = 7, startKey = todayKey()) {
  const today = todayKey()
  const start = parseDateKey(startKey)
  return Array.from({ length: count }).map((_, i) => {
    const date = addDays(start, i)
    const key = toDateKey(date)
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    const isToday = key === today
    return {
      key,
      label: isToday ? 'Hoje' : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`,
      weekday: isToday ? 'Hoje' : weekday.charAt(0).toUpperCase() + weekday.slice(1),
      day: date.getDate(),
      month: date.getMonth()
    }
  })
}

// Quantidade de atendimentos por dia no intervalo (para marcar a faixa de dias)
export async function getAppointmentCountsByDay(startKey, endKey) {
  const appointments = await list(
    query(
      collection(db, 'appointments'),
      where('dateKey', '>=', startKey),
      where('dateKey', '<=', endKey)
    )
  )
  return appointments.reduce((acc, a) => ({ ...acc, [a.dateKey]: (acc[a.dateKey] || 0) + 1 }), {})
}

export async function getAppointmentsForDay(dateKey) {
  const appointments = await list(
    query(collection(db, 'appointments'), where('dateKey', '==', dateKey))
  )
  return appointments.map(toAppointment).sort((a, b) => a.time.localeCompare(b.time))
}

export async function getAppointment(id) {
  return toAppointment(await getOrThrow(doc(db, 'appointments', id), 'Agendamento não encontrado'))
}

// Cria o agendamento após checar conflito de horário na mesma sala.
// Também atualiza o "próximo retorno" da paciente quando for o mais próximo.
export async function createAppointment({ patientId, procedure, dateKey, time, durationMin, room }) {
  if (dateKey < todayKey()) throw new Error('Escolha uma data a partir de hoje.')

  const [patient, sameDay] = await Promise.all([
    getOrThrow(doc(db, 'patients', patientId), 'Paciente não encontrado'),
    list(query(collection(db, 'appointments'), where('dateKey', '==', dateKey)))
  ])

  const start = toMinutes(time)
  const end = start + Number(durationMin)
  const conflict = sameDay.find((a) => {
    if (a.room !== room || a.status === 'Concluído') return false
    const aStart = toMinutes(a.time)
    return start < aStart + (a.durationMin || 30) && aStart < end
  })
  if (conflict) {
    throw new Error(
      `${room.split(' •')[0]} já está ocupada às ${conflict.time} (${conflict.patientName}). Escolha outro horário ou sala.`
    )
  }

  const data = {
    dateKey,
    time,
    durationMin: Number(durationMin),
    patientId,
    patientName: patient.name,
    patientAge: patient.age ?? null,
    patientCpf: patient.cpf || null,
    procedure: procedure.trim(),
    room,
    status: 'Agendado',
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'appointments'), data)

  if (!patient.nextReturn || patient.nextReturn < todayKey() || dateKey < patient.nextReturn) {
    await updateDoc(doc(db, 'patients', patientId), {
      nextReturn: dateKey,
      nextReturnLabel: data.procedure
    })
  }

  return toAppointment({ id: ref.id, ...data })
}

// status: 'Agendado' | 'Em atendimento' | 'Concluído'
export async function updateAppointmentStatus(id, status) {
  await updateDoc(doc(db, 'appointments', id), { status, statusUpdatedAt: serverTimestamp() })
  return getAppointment(id)
}

// ---- Financeiro ----

function toPayment(p) {
  return { ...p, dateKey: p.date, date: formatDateKey(p.date) }
}

export async function getFinanceSummary() {
  const payments = await list(collection(db, 'payments'))
  const prefix = monthPrefix(0)
  const paidThisMonth = payments.filter((p) => p.status === 'Pago' && p.date?.startsWith(prefix))
  const pending = payments.filter((p) => p.status === 'Pendente')
  return {
    totalFaturado: paidThisMonth.reduce((sum, p) => sum + p.amount, 0),
    monthLabel: monthName(0),
    aReceber: pending.reduce((sum, p) => sum + p.amount, 0),
    aReceberClientes: new Set(pending.map((p) => p.patientId || p.patientName)).size
  }
}

// Últimos lançamentos = pagamentos recebidos mais recentes
export async function getFinanceLaunches(limitCount = 5) {
  const paid = await list(query(collection(db, 'payments'), where('status', '==', 'Pago')))
  return paid
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limitCount)
    .map((p) => ({ ...toPayment(p), name: p.procedure }))
}

export async function getFinancePayments() {
  const payments = await list(collection(db, 'payments'))
  // Pendentes primeiro, depois por data mais recente
  return payments
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Pendente' ? -1 : 1
      return (b.date || '').localeCompare(a.date || '')
    })
    .map(toPayment)
}

export async function getFinanceCommissions() {
  const commissions = await list(
    query(collection(db, 'commissions'), orderBy('date', 'desc'))
  )
  const prefix = monthPrefix(0)
  return commissions
    .filter((c) => c.date?.startsWith(prefix))
    .map((c) => ({ ...c, value: Math.round((c.base * c.pct) / 100) }))
}

// ---- Leads ----

function toLead(l) {
  const createdAt = toDate(l.createdAt)
  return { ...l, createdAt, createdAtLabel: formatRelativeLabel(createdAt) }
}

export async function getLeads() {
  const leads = await list(query(collection(db, 'leads'), orderBy('createdAt', 'desc')))
  return leads.map(toLead)
}

export async function getLead(id) {
  return toLead(await getOrThrow(doc(db, 'leads', id), 'Lead não encontrado'))
}

export async function createLead({ name, phone, interest, source, proposalValue }) {
  const data = {
    name: name.trim(),
    phone: phone.trim(),
    interest: interest.trim(),
    source: source || 'Outro',
    status: 'Novo',
    proposalValue: Number(proposalValue) || 0,
    downPayment: 0,
    notes: '',
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'leads'), data)
  return toLead({ id: ref.id, ...data, createdAt: new Date() })
}

export const LEAD_STATUSES = ['Novo', 'Em contato', 'Qualificado', 'Proposta', 'Convertido']

export async function updateLeadStatus(id, status) {
  await updateDoc(doc(db, 'leads', id), { status })
  return getLead(id)
}

function toMessage(m) {
  const createdAt = toDate(m.createdAt) || new Date()
  return { ...m, createdAt, time: formatTime(createdAt) }
}

export async function getLeadMessages(id) {
  const messages = await list(
    query(collection(db, 'leads', id, 'messages'), orderBy('createdAt'))
  )
  return messages.map(toMessage)
}

// Registra uma mensagem enviada pela clínica na conversa do lead
export async function sendLeadMessage(id, { text, attachment = null }) {
  const data = { from: 'clinica', text: text.trim(), createdBy: currentUid(), createdAt: serverTimestamp() }
  if (attachment) data.attachment = attachment
  const ref = await addDoc(collection(db, 'leads', id, 'messages'), data)
  return toMessage({ id: ref.id, ...data, createdAt: new Date() })
}

// ---- Arquivos (Firebase Storage) ----

const MAX_PHOTO_SIDE = 2048

// Reduz fotos grandes no navegador antes do envio (economiza espaço e dados
// móveis). Se o formato não puder ser lido (ex.: HEIC no desktop), envia o
// arquivo original.
async function resizeImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ? { blob, contentType: 'image/jpeg', ext: 'jpg' } : null
  } catch {
    return null
  }
}

function upload(path, blob, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef(storage, path), blob, { contentType })
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.bytesTransferred / snap.totalBytes),
      (err) =>
        reject(
          new Error(
            err.code === 'storage/unauthorized'
              ? 'Arquivo não permitido (verifique o tipo e o tamanho).'
              : 'Falha no envio do arquivo. Tente novamente.'
          )
        ),
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    )
  })
}

function safeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .slice(-80)
}

export const PHOTO_LABELS = ['Antes', 'Depois', '30 dias', '60 dias', '90 dias', 'Evolução']

export async function uploadPatientPhoto(patientId, file, { label, date }, onProgress) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.')
  const ref = doc(collection(db, 'patients', patientId, 'photos'))
  const resized = await resizeImage(file)
  const blob = resized?.blob || file
  const contentType = resized?.contentType || file.type
  const ext = resized?.ext || file.name.split('.').pop()
  const storagePath = `patients/${patientId}/photos/${ref.id}.${ext}`
  const url = await upload(storagePath, blob, contentType, onProgress)
  const data = {
    label,
    date: date || todayKey(),
    url,
    storagePath,
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  await setDoc(ref, data)
  return { id: ref.id, ...data, dateKey: data.date, date: formatDateKey(data.date) }
}

export async function deletePatientPhoto(patientId, photo) {
  if (photo.storagePath) await deleteObject(storageRef(storage, photo.storagePath)).catch(() => {})
  await deleteDoc(doc(db, 'patients', patientId, 'photos', photo.id))
}

export const DOCUMENT_CATEGORIES = ['Exame', 'Termo de consentimento', 'Laudo', 'Receita', 'Outro']
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

function toDocument(d) {
  const createdAt = toDate(d.createdAt)
  return { ...d, createdAt, createdAtLabel: createdAt ? formatRelativeLabel(createdAt) : '' }
}

export async function getPatientDocuments(id) {
  const docs = await list(
    query(collection(db, 'patients', id, 'documents'), orderBy('createdAt', 'desc'))
  )
  return docs.map(toDocument)
}

export async function uploadPatientDocument(patientId, file, { name, category }, onProgress) {
  const allowed = file.type === 'application/pdf' || file.type.startsWith('image/')
  if (!allowed) throw new Error('Envie um PDF ou uma imagem.')
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('O arquivo deve ter no máximo 20 MB.')
  const ref = doc(collection(db, 'patients', patientId, 'documents'))
  const storagePath = `patients/${patientId}/documents/${ref.id}/${safeFileName(file.name)}`
  const url = await upload(storagePath, file, file.type, onProgress)
  const data = {
    name: (name || file.name).trim(),
    category: category || 'Outro',
    contentType: file.type,
    size: file.size,
    url,
    storagePath,
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  await setDoc(ref, data)
  return toDocument({ id: ref.id, ...data, createdAt: new Date() })
}

export async function deletePatientDocument(patientId, document) {
  await deleteObject(storageRef(storage, document.storagePath)).catch(() => {})
  await deleteDoc(doc(db, 'patients', patientId, 'documents', document.id))
}

// ---- Notificações ----
// Cada usuário tem `users/{uid}/notifications`, preenchida pelas Cloud
// Functions (novo lead, novo agendamento, lembrete de atendimento, mensagem
// recebida). Push no celular usa Firebase Cloud Messaging.

function toNotification(n) {
  const createdAt = toDate(n.createdAt) || new Date()
  return { ...n, createdAt, timeLabel: formatRelativeLabel(createdAt) }
}

// Assina as notificações do usuário logado em tempo real.
// `callback(lista, novas)` — `novas` traz só as que chegaram após a carga inicial.
export function subscribeNotifications(callback, onError) {
  const uid = currentUid()
  if (!uid) return () => {}
  let initial = true
  return onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => {
      const items = snap.docs.map((d) => toNotification(withId(d)))
      const added = initial
        ? []
        : snap.docChanges().filter((c) => c.type === 'added').map((c) => toNotification(withId(c.doc)))
      initial = false
      callback(items, added)
    },
    onError
  )
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'users', currentUid(), 'notifications', id), { read: true })
}

export async function markAllNotificationsRead(ids) {
  const batch = writeBatch(db)
  ids.forEach((id) => batch.update(doc(db, 'users', currentUid(), 'notifications', id), { read: true }))
  await batch.commit()
}

const PUSH_TOKEN_KEY = 'afrodite_push_token'

function readPushToken() {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY)
  } catch {
    return null
  }
}

// 'unconfigured' (sem chave VAPID) | 'unsupported' | 'local' (emuladores) |
// 'denied' | 'enabled' | 'disabled'
export async function getPushStatus() {
  if (usingEmulators) return 'local'
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return 'unconfigured'
  const { isSupported } = await import('firebase/messaging')
  if (!(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' && readPushToken() ? 'enabled' : 'disabled'
}

// O service worker do FCM recebe a config pela URL (os valores são públicos)
function messagingSwUrl() {
  const o = app.options
  const params = new URLSearchParams({
    apiKey: o.apiKey,
    projectId: o.projectId,
    messagingSenderId: o.messagingSenderId,
    appId: o.appId
  })
  return `/firebase-messaging-sw.js?${params}`
}

export async function enablePushNotifications() {
  const status = await getPushStatus()
  if (status === 'local') throw new Error('Push não funciona com os emuladores locais — teste no app publicado.')
  if (status === 'unconfigured') throw new Error('As notificações push ainda não foram configuradas.')
  if (status === 'unsupported') {
    throw new Error('Este navegador não suporta notificações. No iPhone, adicione o app à Tela de Início primeiro.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão de notificações negada nas configurações do navegador.')

  const { getMessaging, getToken } = await import('firebase/messaging')
  const registration = await navigator.serviceWorker.register(messagingSwUrl(), {
    scope: '/firebase-cloud-messaging-push-scope'
  })
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  })
  await setDoc(doc(db, 'users', currentUid(), 'devices', token), {
    token,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp()
  })
  try {
    localStorage.setItem(PUSH_TOKEN_KEY, token)
  } catch {
    // sem armazenamento local: o token continua salvo no Firestore
  }
}

export async function disablePushNotifications() {
  const token = readPushToken()
  if (!token) return
  const { getMessaging, deleteToken } = await import('firebase/messaging')
  await deleteToken(getMessaging(app)).catch(() => {})
  await deleteDoc(doc(db, 'users', currentUid(), 'devices', token)).catch(() => {})
  try {
    localStorage.removeItem(PUSH_TOKEN_KEY)
  } catch {
    // ignora
  }
}
