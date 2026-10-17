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
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { auth, db } from './firebase.js'
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

export function logout() {
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

// ---- Agenda ----

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
export function getAgendaDayTabs(count = 7) {
  return Array.from({ length: count }).map((_, i) => {
    const date = addDays(new Date(), i)
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    return {
      key: toDateKey(date),
      label: i === 0 ? 'Hoje' : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`,
      weekday: i === 0 ? 'Hoje' : weekday.charAt(0).toUpperCase() + weekday.slice(1),
      day: date.getDate()
    }
  })
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
  const data = { from: 'clinica', text: text.trim(), createdAt: serverTimestamp() }
  if (attachment) data.attachment = attachment
  const ref = await addDoc(collection(db, 'leads', id, 'messages'), data)
  return toMessage({ id: ref.id, ...data, createdAt: new Date() })
}
