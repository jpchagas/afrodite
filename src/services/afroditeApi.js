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
  collectionGroup,
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
  runTransaction,
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
    list(query(collection(db, 'transactions'), where('monthKey', 'in', [monthPrefix(0), monthPrefix(-1)]))),
    list(collection(db, 'patients'))
  ])

  const revenueOf = (prefix) =>
    payments
      .filter((t) => t.type === 'receita' && t.status === 'Pago' && t.monthKey === prefix)
      .reduce((sum, t) => sum + t.amount, 0)
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

function ageFrom(birthDate) {
  if (!birthDate) return null
  const [y, m, d] = birthDate.split('-').map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

function toPatient(p) {
  return {
    ...p,
    age: p.birthDate ? ageFrom(p.birthDate) : p.age ?? null,
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

export const PATIENT_STATUSES = ['Em avaliação', 'Ativa', 'Em acompanhamento', 'Pós procedimento', 'Inativa']

function newPatientData({ name, phone, cpf, age, email, birthDate }, extra = {}) {
  return {
    name: name.trim(),
    phone: (phone || '').trim(),
    cpf: (cpf || '').trim(),
    email: (email || '').trim(),
    age: age ? Number(age) : null,
    birthDate: birthDate || null,
    status: 'Em avaliação',
    lastVisit: null,
    lastVisitLabel: 'Sem consultas',
    nextReturn: null,
    nextReturnLabel: 'A agendar',
    createdBy: currentUid(),
    createdAt: serverTimestamp(),
    ...extra
  }
}

export async function createPatient(fields) {
  const ref = doc(collection(db, 'patients'))
  const data = newPatientData(fields)
  const batch = writeBatch(db)
  batch.set(ref, data)
  batch.set(activityRef('patients', ref.id), activityData('criado', 'Paciente cadastrada'))
  await batch.commit()
  return toPatient({ id: ref.id, ...data })
}

const PATIENT_EDITABLE = ['name', 'phone', 'cpf', 'email', 'age', 'birthDate', 'status']

export async function updatePatient(id, fields) {
  const changes = pick(fields, PATIENT_EDITABLE)
  if ('age' in changes) changes.age = changes.age ? Number(changes.age) : null
  for (const k of ['name', 'phone', 'cpf', 'email']) if (k in changes) changes[k] = (changes[k] || '').trim()
  const before = await getOrThrow(doc(db, 'patients', id), 'Paciente não encontrado')
  const batch = writeBatch(db)
  batch.update(doc(db, 'patients', id), { ...changes, updatedAt: serverTimestamp() })
  if (changes.status && changes.status !== before.status) {
    batch.set(activityRef('patients', id), activityData('status', `Status alterado de "${before.status}" para "${changes.status}"`))
  }
  await batch.commit()
  return getPatient(id)
}

// Linha do tempo do relacionamento: contatos registrados, agendamentos,
// procedimentos e o histórico como lead (quando veio de um lead).
export async function getPatientTimeline(id) {
  const patient = await getOrThrow(doc(db, 'patients', id), 'Paciente não encontrado')
  const [activities, appointments, procedures, leadActivities] = await Promise.all([
    getActivities('patients', id),
    list(query(collection(db, 'appointments'), where('patientId', '==', id))),
    list(collection(db, 'patients', id, 'procedures')),
    patient.leadId ? getActivities('leads', patient.leadId).catch(() => []) : []
  ])
  const now = Date.now()
  const items = [
    ...activities,
    // A conversão já aparece pelo lado da paciente
    ...leadActivities.filter((a) => a.type !== 'conversao').map((a) => ({ ...a, id: `lead-${a.id}`, fromLead: true })),
    ...appointments.map((a) => {
      const date = parseDateKey(a.dateKey, a.time)
      const future = date.getTime() > now && a.status === 'Agendado'
      return {
        id: `appt-${a.id}`,
        type: 'agendamento',
        date,
        title: future ? `Agendado: ${a.procedure}` : a.procedure,
        text: `${formatDateKey(a.dateKey)} às ${a.time} • ${a.status || 'Agendado'}`,
        link: `/agenda/${a.id}`,
        future
      }
    }),
    ...procedures.map((p) => ({
      id: `proc-${p.id}`,
      type: 'procedimento',
      date: parseDateKey(p.date),
      title: p.name,
      text: [p.area, p.product, p.status].filter(Boolean).join(' • ')
    }))
  ]
  return items.sort((a, b) => b.date - a.date)
}

// ---- Clínico: anamnese ----

export const ANAMNESE_TEXT_FIELDS = [
  { key: 'queixaPrincipal', label: 'Queixa principal' },
  { key: 'historicoMedico', label: 'Histórico médico' },
  { key: 'alergias', label: 'Alergias' },
  { key: 'medicamentos', label: 'Medicamentos em uso' },
  { key: 'procedimentosAnteriores', label: 'Procedimentos estéticos anteriores' },
  { key: 'observacoes', label: 'Observações' }
]

// Condições que contraindicam ou exigem cuidado em procedimentos estéticos
export const ANAMNESE_FLAGS = [
  { key: 'gestante', label: 'Gestante', critical: true },
  { key: 'lactante', label: 'Lactante', critical: true },
  { key: 'anticoagulante', label: 'Usa anticoagulante', critical: true },
  { key: 'isotretinoina', label: 'Isotretinoína nos últimos 6 meses', critical: true },
  { key: 'autoimune', label: 'Doença autoimune' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hipertensao', label: 'Hipertensão' },
  { key: 'queloide', label: 'Tendência a queloide' },
  { key: 'herpes', label: 'Histórico de herpes' },
  { key: 'marcapasso', label: 'Marcapasso ou implante metálico' },
  { key: 'fumante', label: 'Fumante' },
  { key: 'fotossensibilidade', label: 'Fotossensibilidade' }
]

export const FITZPATRICK = [
  { value: 'I', label: 'I — muito clara, sempre queima' },
  { value: 'II', label: 'II — clara, queima com facilidade' },
  { value: 'III', label: 'III — morena clara' },
  { value: 'IV', label: 'IV — morena moderada' },
  { value: 'V', label: 'V — morena escura' },
  { value: 'VI', label: 'VI — negra' }
]

const EMPTY_ANAMNESE = {
  ...Object.fromEntries(ANAMNESE_TEXT_FIELDS.map((f) => [f.key, ''])),
  flags: {},
  fitzpatrick: null
}

// "Não", "Nega", "Nenhuma"... não contam como alergia
const NO_ALLERGY = /^\s*(n[aã]o|nega|nenhum|nenhuma|sem|n\/?a|-|—)\b/i

/**
 * Alertas clínicos derivados da anamnese: [{ label, critical }].
 * Alergias e condições críticas vêm primeiro.
 */
export function clinicalAlerts(anamnese) {
  if (!anamnese) return []
  const alerts = []
  const allergy = (anamnese.alergias || '').trim()
  if (allergy && !NO_ALLERGY.test(allergy)) alerts.push({ label: `Alergia: ${allergy.replace(/\.$/, '')}`, critical: true })
  for (const f of ANAMNESE_FLAGS) if (anamnese.flags?.[f.key]) alerts.push({ label: f.label, critical: !!f.critical })
  return alerts.sort((a, b) => Number(b.critical) - Number(a.critical))
}

export async function getPatientAnamnese(id) {
  const snap = await getDoc(doc(db, 'patients', id, 'anamnese', 'main'))
  const data = snap.exists() ? snap.data() : {}
  return { ...EMPTY_ANAMNESE, ...data, flags: { ...(data.flags || {}) }, updatedAt: toDate(data.updatedAt) }
}

// Salva a anamnese guardando a versão anterior (histórico para auditoria) e
// atualiza os alertas resumidos na ficha da paciente (`clinicalAlerts`).
export async function updatePatientAnamnese(id, data) {
  const payload = {
    ...Object.fromEntries(ANAMNESE_TEXT_FIELDS.map((f) => [f.key, (data[f.key] || '').trim()])),
    flags: Object.fromEntries(ANAMNESE_FLAGS.map((f) => [f.key, !!data.flags?.[f.key]])),
    fitzpatrick: data.fitzpatrick || null
  }
  const ref = doc(db, 'patients', id, 'anamnese', 'main')
  const current = await getDoc(ref)
  const user = auth.currentUser
  const batch = writeBatch(db)
  if (current.exists()) {
    batch.set(doc(collection(db, 'patients', id, 'anamneseVersions')), {
      ...current.data(),
      versionedAt: serverTimestamp()
    })
  }
  batch.set(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: user?.uid || null,
    updatedByName: user?.displayName || user?.email || null
  })
  batch.update(doc(db, 'patients', id), { clinicalAlerts: clinicalAlerts(payload).map((a) => a.label) })
  await batch.commit()
  return { ...payload, updatedAt: new Date(), updatedByName: user?.displayName || user?.email || null }
}

export async function getAnamneseVersions(id) {
  const items = await list(query(collection(db, 'patients', id, 'anamneseVersions'), orderBy('versionedAt', 'desc')))
  return items.map((v) => ({ ...EMPTY_ANAMNESE, ...v, savedAt: toDate(v.updatedAt) || toDate(v.versionedAt) }))
}

// ---- Clínico: procedimentos e evolução ----

export const PROCEDURE_UNITS = ['U', 'ml', 'seringa(s)', 'fio(s)', 'ampola(s)', 'sessão(ões)']

function toProcedure(p) {
  return { ...p, dateKey: p.date, date: formatDateKey(p.date) }
}

export async function getPatientProcedures(id) {
  const procedures = await list(
    query(collection(db, 'patients', id, 'procedures'), orderBy('date', 'desc'))
  )
  return procedures.map(toProcedure)
}

/**
 * Registra um procedimento realizado (produto, lote, quantidade, áreas,
 * técnica, cuidados pós). Atualiza a última consulta da paciente e, com
 * `returnInDays`, o próximo retorno (quando for o mais próximo).
 */
export async function createProcedure(patientId, fields) {
  const date = fields.date || todayKey()
  const user = auth.currentUser
  const data = {
    name: fields.name.trim(),
    date,
    area: (fields.areas || '').trim(),
    product: (fields.product || '').trim(),
    lot: (fields.lot || '').trim(),
    quantity: fields.quantity ? Number(String(fields.quantity).replace(',', '.')) : null,
    unit: fields.unit || null,
    technique: (fields.technique || '').trim(),
    postCare: (fields.postCare || '').trim(),
    notes: (fields.notes || '').trim(),
    status: fields.status || 'Concluído',
    appointmentId: fields.appointmentId || null,
    professional: user?.displayName || user?.email || null,
    createdBy: user?.uid || null,
    createdAt: serverTimestamp()
  }
  const patient = await getOrThrow(doc(db, 'patients', patientId), 'Paciente não encontrado')
  const ref = doc(collection(db, 'patients', patientId, 'procedures'))
  const patientChanges = {}
  if (data.status === 'Concluído' && (!patient.lastVisit || date >= patient.lastVisit)) {
    patientChanges.lastVisit = date
    patientChanges.lastVisitLabel = data.name
  }
  const days = Number(fields.returnInDays)
  if (days > 0) {
    const returnKey = toDateKey(addDays(parseDateKey(date), days))
    if (!patient.nextReturn || patient.nextReturn < todayKey() || returnKey < patient.nextReturn) {
      patientChanges.nextReturn = returnKey
      patientChanges.nextReturnLabel = `Retorno • ${data.name}`
    }
  }
  const batch = writeBatch(db)
  batch.set(ref, data)
  if (Object.keys(patientChanges).length) batch.update(doc(db, 'patients', patientId), patientChanges)
  if (data.status === 'Concluído') {
    const automations = await getAutomations()
    if (automations.postProcedure.enabled) {
      const catalog = await getCatalog({ activeOnly: true }).catch(() => [])
      const item = catalog.find((c) => normalizeName(c.name) === normalizeName(data.name))
      for (const task of carePlanFor({ patientId, patient, procedure: { id: ref.id, ...data }, returnInDays: days, maintenanceDays: item?.maintenanceDays })) {
        batch.set(doc(collection(db, 'careTasks')), task)
      }
    }
  }
  await batch.commit()
  return toProcedure({ id: ref.id, ...data })
}

const PROCEDURE_EDITABLE = ['name', 'date', 'area', 'product', 'lot', 'quantity', 'unit', 'technique', 'postCare', 'notes', 'status']

export async function updateProcedure(patientId, procedureId, fields) {
  const changes = pick({ ...fields, area: fields.areas ?? fields.area }, PROCEDURE_EDITABLE)
  if ('quantity' in changes) changes.quantity = changes.quantity ? Number(String(changes.quantity).replace(',', '.')) : null
  for (const k of ['name', 'area', 'product', 'lot', 'technique', 'postCare', 'notes']) if (k in changes) changes[k] = (changes[k] || '').trim()
  const ref = doc(db, 'patients', patientId, 'procedures', procedureId)
  await updateDoc(ref, { ...changes, updatedAt: serverTimestamp() })
  return toProcedure(withId(await getDoc(ref)))
}

export async function createEvolution(patientId, { text, date, appointmentId = null }) {
  const user = auth.currentUser
  const data = {
    text: text.trim(),
    date: date || todayKey(),
    appointmentId,
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || null,
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'patients', patientId, 'evolutions'), data)
  return { id: ref.id, ...data, createdAt: new Date() }
}

/**
 * Prontuário: procedimentos e notas de evolução em ordem cronológica
 * (mais recente primeiro). Itens: { kind: 'procedimento' | 'evolucao', ... }
 */
export async function getClinicalRecord(patientId) {
  const [procedures, evolutions] = await Promise.all([
    getPatientProcedures(patientId),
    list(collection(db, 'patients', patientId, 'evolutions'))
  ])
  const items = [
    ...procedures.map((p) => ({ ...p, kind: 'procedimento', sortKey: `${p.dateKey}` })),
    ...evolutions.map((e) => {
      const createdAt = toDate(e.createdAt)
      return { ...e, kind: 'evolucao', createdAt, dateKey: e.date, date: formatDateKey(e.date), sortKey: `${e.date}` }
    })
  ]
  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || (b.createdAt || 0) - (a.createdAt || 0))
}

// ---- Pacotes de sessões ----

function toPackage(p) {
  const remaining = Math.max(0, (p.totalSessions || 0) - (p.usedSessions || 0))
  return { ...p, remaining, status: remaining === 0 ? 'Concluído' : 'Ativo', createdAt: toDate(p.createdAt) }
}

export async function getPatientPackages(patientId) {
  const items = await list(collection(db, 'patients', patientId, 'packages'))
  return items.map(toPackage).sort((a, b) => b.remaining - a.remaining || (b.createdAt || 0) - (a.createdAt || 0))
}

// Usa uma sessão do pacote (ex.: ao realizar o atendimento)
export async function consumePackageSession(patientId, packageId, { appointmentId = null } = {}) {
  const ref = doc(db, 'patients', patientId, 'packages', packageId)
  const pkg = toPackage(await getOrThrow(ref, 'Pacote não encontrado'))
  if (pkg.remaining <= 0) throw new Error('Todas as sessões deste pacote já foram usadas.')
  const usage = [...(pkg.usage || []), { date: todayKey(), appointmentId }]
  await updateDoc(ref, { usedSessions: (pkg.usedSessions || 0) + 1, usage })
  return toPackage({ ...pkg, usedSessions: (pkg.usedSessions || 0) + 1, usage })
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
// Coleção única `transactions` para receitas e despesas. Datas: `dueDate`
// (vencimento) e `paidDate` (pagamento), ambas 'YYYY-MM-DD'. `monthKey`
// ('YYYY-MM') = mês do pagamento, ou do vencimento enquanto pendente — é
// por ele que o financeiro é navegado mês a mês (regime de caixa).

export const INCOME_CATEGORIES = ['Procedimento', 'Consulta', 'Pacote', 'Produto', 'Outro']
export const EXPENSE_CATEGORIES = [
  'Insumos',
  'Aluguel',
  'Salários',
  'Comissões',
  'Marketing',
  'Impostos',
  'Equipamentos',
  'Contas e serviços',
  'Outro'
]
export const PAYMENT_METHODS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Transferência']
const DEFAULT_COMMISSION_RATES = { Procedimento: 30, Pacote: 25, Consulta: 0, Produto: 10, Outro: 0 }

const pad2 = (n) => String(n).padStart(2, '0')

export function currentMonthKey() {
  return todayKey().slice(0, 7)
}

export function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

export function formatMonth(monthKey, { short = false } = {}) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  if (short) return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Mesmo dia em outro mês, limitado ao último dia (31/01 + 1 mês = 28/02)
function addMonthsToDateKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const last = new Date(y, m - 1 + n + 1, 0).getDate()
  const date = new Date(y, m - 1 + n, Math.min(d, last))
  return toDateKey(date)
}

function toTransaction(t) {
  const overdue = t.status === 'Pendente' && t.dueDate && t.dueDate < todayKey()
  return {
    ...t,
    displayStatus: overdue ? 'Atrasado' : t.status,
    overdue,
    effectiveDate: t.paidDate || t.dueDate,
    signedAmount: t.type === 'despesa' ? -t.amount : t.amount
  }
}

const byEffectiveDateDesc = (a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || '')

export async function getMonthTransactions(monthKey) {
  const items = await list(query(collection(db, 'transactions'), where('monthKey', '==', monthKey)))
  return items.map(toTransaction).sort(byEffectiveDateDesc)
}

export async function getPatientTransactions(patientId) {
  const items = (await list(query(collection(db, 'transactions'), where('patientId', '==', patientId))))
    .map(toTransaction)
    .sort(byEffectiveDateDesc)
  const sum = (arr) => arr.reduce((s, t) => s + t.amount, 0)
  const income = items.filter((t) => t.type === 'receita')
  return {
    items,
    paid: sum(income.filter((t) => t.status === 'Pago')),
    pending: sum(income.filter((t) => t.status === 'Pendente')),
    overdue: sum(income.filter((t) => t.overdue))
  }
}

export async function getAppointmentTransactions(appointmentId) {
  const items = await list(query(collection(db, 'transactions'), where('appointmentId', '==', appointmentId)))
  return items.map(toTransaction).sort(byEffectiveDateDesc)
}

/**
 * Visão do mês: saldo (receitas − despesas pagas), a receber / a pagar
 * (todas as pendências, de qualquer mês), atrasados e série dos últimos
 * 6 meses para o gráfico.
 */
export async function getFinanceOverview(monthKey) {
  const firstMonth = addMonths(monthKey, -5)
  const [monthItems, pendingItems, rangeItems] = await Promise.all([
    getMonthTransactions(monthKey),
    list(query(collection(db, 'transactions'), where('status', '==', 'Pendente'))),
    list(
      query(collection(db, 'transactions'), where('monthKey', '>=', firstMonth), where('monthKey', '<=', monthKey))
    )
  ])
  const sum = (arr) => arr.reduce((s, t) => s + t.amount, 0)
  const paid = monthItems.filter((t) => t.status === 'Pago')
  const income = sum(paid.filter((t) => t.type === 'receita'))
  const expense = sum(paid.filter((t) => t.type === 'despesa'))

  const pending = pendingItems.map(toTransaction)
  const summarize = (type) => {
    const items = pending.filter((t) => t.type === type)
    const overdue = items.filter((t) => t.overdue)
    return { total: sum(items), count: items.length, overdueTotal: sum(overdue), overdueCount: overdue.length }
  }

  const series = Array.from({ length: 6 }).map((_, i) => {
    const key = addMonths(firstMonth, i)
    const items = rangeItems.filter((t) => t.monthKey === key && t.status === 'Pago')
    return {
      monthKey: key,
      label: formatMonth(key, { short: true }),
      income: sum(items.filter((t) => t.type === 'receita')),
      expense: sum(items.filter((t) => t.type === 'despesa'))
    }
  })

  const expenseByCategory = Object.entries(
    paid
      .filter((t) => t.type === 'despesa')
      .reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {})
  )
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return {
    monthKey,
    monthLabel: formatMonth(monthKey),
    income,
    expense,
    balance: income - expense,
    toReceiveThisMonth: sum(monthItems.filter((t) => t.type === 'receita' && t.status === 'Pendente')),
    receivable: summarize('receita'),
    payable: summarize('despesa'),
    overdueReceivables: pending
      .filter((t) => t.type === 'receita' && t.overdue)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
    expenseByCategory,
    series
  }
}

/**
 * Cria um lançamento. Com `installments` > 1, gera uma parcela por mês
 * (valor dividido em centavos, diferença na última) ligadas por `groupId`.
 * `paid` marca como pago na criação (só a 1ª parcela, se parcelado).
 */
export async function createTransaction({
  type,
  description,
  category,
  amount,
  dueDate,
  paid = false,
  paidDate,
  method,
  patientId = null,
  patientName = null,
  appointmentId = null,
  installments = 1,
  notes = ''
}) {
  const total = Math.round(Number(amount) * 100)
  if (!total || total < 0) throw new Error('Informe um valor válido.')
  const n = Math.max(1, Math.min(24, Number(installments) || 1))
  const base = Math.floor(total / n)
  const groupRef = n > 1 ? doc(collection(db, 'transactions')) : null
  const batch = writeBatch(db)
  const created = []
  for (let i = 0; i < n; i++) {
    const cents = i === n - 1 ? total - base * (n - 1) : base
    const due = addMonthsToDateKey(dueDate || todayKey(), i)
    const isPaid = paid && i === 0
    const pDate = isPaid ? paidDate || todayKey() : null
    const ref = doc(collection(db, 'transactions'))
    const data = {
      type,
      description: n > 1 ? `${description.trim()} (${i + 1}/${n})` : description.trim(),
      category: category || 'Outro',
      amount: cents / 100,
      dueDate: due,
      paidDate: pDate,
      status: isPaid ? 'Pago' : 'Pendente',
      method: method || null,
      monthKey: (pDate || due).slice(0, 7),
      patientId,
      patientName,
      appointmentId,
      groupId: groupRef?.id || null,
      installment: n > 1 ? { n: i + 1, total: n } : null,
      notes: notes.trim(),
      createdBy: currentUid(),
      createdAt: serverTimestamp()
    }
    batch.set(ref, data)
    created.push(toTransaction({ id: ref.id, ...data }))
  }
  await batch.commit()
  return created
}

const TRANSACTION_EDITABLE = ['description', 'category', 'amount', 'dueDate', 'method', 'notes']

export async function updateTransaction(id, fields) {
  const current = await getOrThrow(doc(db, 'transactions', id), 'Lançamento não encontrado')
  const changes = pick(fields, TRANSACTION_EDITABLE)
  if ('amount' in changes) {
    changes.amount = Math.round(Number(changes.amount) * 100) / 100
    if (!changes.amount || changes.amount < 0) throw new Error('Informe um valor válido.')
  }
  if ('description' in changes) changes.description = changes.description.trim()
  const next = { ...current, ...changes }
  changes.monthKey = (next.paidDate || next.dueDate).slice(0, 7)
  await updateDoc(doc(db, 'transactions', id), { ...changes, updatedAt: serverTimestamp() })
  return toTransaction({ ...next, ...changes })
}

export async function markTransactionPaid(id, { paidDate, method } = {}) {
  const current = await getOrThrow(doc(db, 'transactions', id), 'Lançamento não encontrado')
  const date = paidDate || todayKey()
  const changes = { status: 'Pago', paidDate: date, method: method || current.method || null, monthKey: date.slice(0, 7) }
  await updateDoc(doc(db, 'transactions', id), { ...changes, updatedAt: serverTimestamp() })
  return toTransaction({ ...current, ...changes })
}

export async function markTransactionPending(id) {
  const current = await getOrThrow(doc(db, 'transactions', id), 'Lançamento não encontrado')
  const changes = { status: 'Pendente', paidDate: null, monthKey: current.dueDate.slice(0, 7) }
  await updateDoc(doc(db, 'transactions', id), { ...changes, updatedAt: serverTimestamp() })
  return toTransaction({ ...current, ...changes })
}

export async function deleteTransaction(id) {
  await deleteDoc(doc(db, 'transactions', id))
}

// ---- Comissões (calculadas sobre receitas pagas no mês) ----

export async function getCommissionRates() {
  const snap = await getDoc(doc(db, 'settings', 'finance'))
  return { ...DEFAULT_COMMISSION_RATES, ...(snap.exists() ? snap.data().commissionRates : {}) }
}

export async function updateCommissionRates(rates) {
  const clean = Object.fromEntries(
    Object.entries(rates).map(([k, v]) => [k, Math.max(0, Math.min(100, Number(v) || 0))])
  )
  await setDoc(doc(db, 'settings', 'finance'), { commissionRates: clean, updatedAt: serverTimestamp() }, { merge: true })
  return clean
}

export async function getCommissions(monthKey) {
  const [items, rates] = await Promise.all([getMonthTransactions(monthKey), getCommissionRates()])
  const paidIncome = items.filter((t) => t.type === 'receita' && t.status === 'Pago')
  const rows = INCOME_CATEGORIES.map((category) => {
    const base = paidIncome.filter((t) => t.category === category).reduce((s, t) => s + t.amount, 0)
    const pct = rates[category] || 0
    return { category, base, pct, value: Math.round(base * pct) / 100, count: paidIncome.filter((t) => t.category === category).length }
  }).filter((r) => r.base > 0)
  return { rows, rates, total: rows.reduce((s, r) => s + r.value, 0) }
}

// ---- Exportação ----

// CSV com ";" e vírgula decimal (abre direto no Excel em português)
export function transactionsToCsv(items) {
  const header = ['Data', 'Vencimento', 'Tipo', 'Descrição', 'Categoria', 'Paciente', 'Forma de pagamento', 'Status', 'Valor']
  const esc = (v) => {
    const s = String(v ?? '')
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = items.map((t) => [
    formatDateKey(t.paidDate),
    formatDateKey(t.dueDate),
    t.type === 'despesa' ? 'Despesa' : 'Receita',
    t.description,
    t.category,
    t.patientName || '',
    t.method || '',
    t.displayStatus,
    (t.type === 'despesa' ? -t.amount : t.amount).toFixed(2).replace('.', ',')
  ])
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
}

// ---- Leads ----

// Etapas abertas do funil e desfechos
export const PIPELINE_STAGES = ['Novo', 'Em contato', 'Qualificado', 'Proposta']
export const LEAD_STATUSES = [...PIPELINE_STAGES, 'Convertido', 'Perdido']
export const LEAD_SOURCES = ['Instagram', 'WhatsApp', 'Indicação', 'Site', 'Google', 'Outro']
export const LOST_REASONS = [
  'Preço',
  'Sem resposta',
  'Escolheu outra clínica',
  'Sem interesse no momento',
  'Contraindicação',
  'Outro'
]

export function isOpenLead(lead) {
  return PIPELINE_STAGES.includes(lead.status)
}

// Estado do próximo contato: 'overdue' | 'today' | 'upcoming' | null
function followUpInfo(lead) {
  if (!lead.nextFollowUp || !isOpenLead(lead)) return { followUpState: null, followUpLabel: null }
  const today = todayKey()
  if (lead.nextFollowUp < today) {
    const days = Math.round((parseDateKey(today) - parseDateKey(lead.nextFollowUp)) / 86_400_000)
    return { followUpState: 'overdue', followUpLabel: days === 1 ? 'Atrasado 1 dia' : `Atrasado ${days} dias` }
  }
  if (lead.nextFollowUp === today) return { followUpState: 'today', followUpLabel: 'Retomar hoje' }
  const tomorrow = toDateKey(addDays(new Date(), 1))
  return {
    followUpState: 'upcoming',
    followUpLabel: lead.nextFollowUp === tomorrow ? 'Retomar amanhã' : `Retomar ${formatDateKey(lead.nextFollowUp).slice(0, 5)}`
  }
}

function toLead(l) {
  const createdAt = toDate(l.createdAt)
  return { ...l, createdAt, createdAtLabel: formatRelativeLabel(createdAt), ...followUpInfo(l) }
}

export async function getLeads() {
  const leads = await list(query(collection(db, 'leads'), orderBy('createdAt', 'desc')))
  return leads.map(toLead)
}

export async function getLead(id) {
  return toLead(await getOrThrow(doc(db, 'leads', id), 'Lead não encontrado'))
}

export async function createLead({ name, phone, email, interest, source, proposalValue, nextFollowUp }) {
  const ref = doc(collection(db, 'leads'))
  const data = {
    name: name.trim(),
    phone: phone.trim(),
    email: (email || '').trim(),
    interest: interest.trim(),
    source: source || 'Outro',
    status: 'Novo',
    proposalValue: Number(proposalValue) || 0,
    downPayment: 0,
    notes: '',
    nextFollowUp: nextFollowUp || todayKey(),
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const batch = writeBatch(db)
  batch.set(ref, data)
  batch.set(activityRef('leads', ref.id), activityData('criado', `Lead cadastrado • origem: ${data.source}`))
  await batch.commit()
  return toLead({ id: ref.id, ...data, createdAt: new Date() })
}

const LEAD_EDITABLE = ['name', 'phone', 'email', 'interest', 'source', 'proposalValue', 'downPayment', 'notes']

export async function updateLead(id, fields) {
  const changes = pick(fields, LEAD_EDITABLE)
  for (const k of ['proposalValue', 'downPayment']) if (k in changes) changes[k] = Number(changes[k]) || 0
  for (const k of ['name', 'phone', 'email', 'interest', 'notes']) if (k in changes) changes[k] = (changes[k] || '').trim()
  const before = await getOrThrow(doc(db, 'leads', id), 'Lead não encontrado')
  const batch = writeBatch(db)
  batch.update(doc(db, 'leads', id), { ...changes, updatedAt: serverTimestamp() })
  if ('proposalValue' in changes && changes.proposalValue !== before.proposalValue) {
    batch.set(
      activityRef('leads', id),
      activityData('proposta', `Proposta atualizada para ${changes.proposalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
    )
  }
  await batch.commit()
  return getLead(id)
}

// Move o lead no funil. Para 'Perdido', informe `lostReason`.
export async function updateLeadStatus(id, status, { lostReason = null } = {}) {
  const before = await getOrThrow(doc(db, 'leads', id), 'Lead não encontrado')
  if (before.status === status) return toLead(before)
  if (status === 'Convertido' && !before.patientId) {
    throw new Error('Para converter, use "Converter em paciente" — assim a ficha da paciente é criada.')
  }
  const changes = { status, statusUpdatedAt: serverTimestamp() }
  if (status === 'Perdido') {
    changes.lostReason = lostReason || 'Outro'
    changes.nextFollowUp = null
  } else {
    changes.lostReason = null
  }
  const batch = writeBatch(db)
  batch.update(doc(db, 'leads', id), changes)
  batch.set(
    activityRef('leads', id),
    activityData(
      status === 'Perdido' ? 'perdido' : 'status',
      status === 'Perdido'
        ? `Marcado como perdido • motivo: ${changes.lostReason}`
        : `Movido de "${before.status}" para "${status}"`
    )
  )
  await batch.commit()
  return getLead(id)
}

export async function setLeadFollowUp(id, dateKey) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'leads', id), { nextFollowUp: dateKey || null, followUpNotified: null })
  batch.set(
    activityRef('leads', id),
    activityData('followup', dateKey ? `Próximo contato marcado para ${formatDateKey(dateKey)}` : 'Próximo contato removido')
  )
  await batch.commit()
  return getLead(id)
}

// Converte o lead em paciente: cria a ficha, liga os dois registros e
// leva o histórico (a linha do tempo da paciente inclui a do lead).
export async function convertLeadToPatient(leadId, { name, phone, cpf, age, email }) {
  const lead = await getOrThrow(doc(db, 'leads', leadId), 'Lead não encontrado')
  if (lead.patientId) throw new Error('Este lead já foi convertido.')
  const patientRef = doc(collection(db, 'patients'))
  const batch = writeBatch(db)
  batch.set(
    patientRef,
    newPatientData({ name, phone, cpf, age, email }, { leadId, source: lead.source || null, interest: lead.interest || null })
  )
  batch.update(doc(db, 'leads', leadId), {
    status: 'Convertido',
    patientId: patientRef.id,
    convertedAt: serverTimestamp(),
    nextFollowUp: null,
    lostReason: null
  })
  batch.set(activityRef('leads', leadId), activityData('conversao', 'Convertido em paciente', { patientId: patientRef.id }))
  batch.set(
    activityRef('patients', patientRef.id),
    activityData('conversao', `Paciente originada de lead • ${[lead.source, lead.interest].filter(Boolean).join(' • ')}`, { leadId })
  )
  await batch.commit()
  return { patientId: patientRef.id }
}

// ---- Histórico de relacionamento (atividades) ----
// `leads/{id}/activities` e `patients/{id}/activities`.

export const CONTACT_KINDS = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visita', label: 'Visita' },
  { value: 'email', label: 'E-mail' },
  { value: 'nota', label: 'Nota' }
]

function activityRef(target, id) {
  return doc(collection(db, target, id, 'activities'))
}

function activityData(type, text, meta = {}) {
  const user = auth.currentUser
  return {
    type,
    text,
    ...meta,
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || null,
    createdAt: serverTimestamp()
  }
}

function pick(obj, keys) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => keys.includes(k) && v !== undefined))
}

export async function getActivities(target, id) {
  const items = await list(query(collection(db, target, id, 'activities'), orderBy('createdAt', 'desc')))
  return items.map((a) => ({ ...a, date: toDate(a.createdAt) || new Date() }))
}

/**
 * Registra um contato (ligação, WhatsApp, visita, e-mail ou nota) no lead
 * ou na paciente. Em leads, `nextFollowUp` (opcional) agenda o próximo
 * contato, e um contato real tira o lead da etapa "Novo".
 */
export async function logContact(target, id, { kind, text, nextFollowUp }) {
  const label = CONTACT_KINDS.find((k) => k.value === kind)?.label || 'Contato'
  const batch = writeBatch(db)
  batch.set(activityRef(target, id), activityData(kind, text.trim() || label, { label }))
  if (target === 'leads') {
    const lead = await getOrThrow(doc(db, 'leads', id), 'Lead não encontrado')
    const changes = {}
    if (kind !== 'nota') changes.lastContactAt = serverTimestamp()
    if (nextFollowUp !== undefined) {
      changes.nextFollowUp = nextFollowUp || null
      changes.followUpNotified = null
    }
    if (kind !== 'nota' && lead.status === 'Novo') {
      changes.status = 'Em contato'
      batch.set(activityRef('leads', id), activityData('status', 'Movido de "Novo" para "Em contato"'))
    }
    if (Object.keys(changes).length) batch.update(doc(db, 'leads', id), changes)
  }
  await batch.commit()
}

// Procura leads e pacientes com o mesmo telefone (evita duplicidade)
export async function findContactsByPhone(phone, { excludeLeadId, excludePatientId } = {}) {
  const normalize = (p = '') => {
    const d = p.replace(/\D/g, '')
    return d.length >= 12 && d.startsWith('55') ? d.slice(2) : d
  }
  const target = normalize(phone)
  if (target.length < 10) return { leads: [], patients: [] }
  const [leads, patients] = await Promise.all([list(collection(db, 'leads')), list(collection(db, 'patients'))])
  return {
    leads: leads.filter((l) => l.id !== excludeLeadId && normalize(l.phone) === target).map(toLead),
    patients: patients.filter((p) => p.id !== excludePatientId && normalize(p.phone) === target).map(toPatient)
  }
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
  // Mensagem enviada conta como contato: tira o lead de "Novo"
  const lead = await getDoc(doc(db, 'leads', id))
  if (lead.exists()) {
    const batch = writeBatch(db)
    const changes = { lastContactAt: serverTimestamp() }
    if (lead.data().status === 'Novo') {
      changes.status = 'Em contato'
      batch.set(activityRef('leads', id), activityData('status', 'Movido de "Novo" para "Em contato" (mensagem no WhatsApp)'))
    }
    batch.update(doc(db, 'leads', id), changes)
    await batch.commit().catch(() => {})
  }
  return toMessage({ id: ref.id, ...data, createdAt: new Date() })
}

// ---- Vendas: catálogo ----

export const CATALOG_CATEGORIES = ['Procedimento', 'Consulta', 'Pacote', 'Produto']

function toCatalogItem(c) {
  return { ...c, sessions: c.sessions || 1, active: c.active !== false }
}

export async function getCatalog({ activeOnly = false } = {}) {
  const items = (await list(query(collection(db, 'catalog'), orderBy('name')))).map(toCatalogItem)
  return activeOnly ? items.filter((c) => c.active) : items
}

// Cria (sem id) ou atualiza (com id) um item do catálogo
export async function saveCatalogItem({ id, name, category, price, sessions, durationMin, maintenanceDays, description, active = true }) {
  const data = {
    name: name.trim(),
    category: category || 'Procedimento',
    price: Number(price) || 0,
    sessions: category === 'Pacote' ? Math.max(1, Number(sessions) || 1) : 1,
    durationMin: Number(durationMin) || null,
    maintenanceDays: Number(maintenanceDays) || null,
    description: (description || '').trim(),
    active: !!active,
    updatedAt: serverTimestamp()
  }
  if (!data.name) throw new Error('Informe o nome.')
  if (id) {
    await updateDoc(doc(db, 'catalog', id), data)
    return toCatalogItem({ id, ...data })
  }
  const ref = await addDoc(collection(db, 'catalog'), { ...data, createdAt: serverTimestamp() })
  return toCatalogItem({ id: ref.id, ...data })
}

// ---- Vendas: orçamentos ----
// `quotes`: itens do catálogo, desconto, parcelas e validade. Fluxo:
// Rascunho → Enviado → Aprovado | Recusado (Expirado é derivado da validade).

export const QUOTE_STATUSES = ['Rascunho', 'Enviado', 'Aprovado', 'Recusado']

function quoteTotals(items, discount) {
  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 1), 0)
  const d = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  return { subtotal: Math.round(subtotal * 100) / 100, discount: Math.round(d * 100) / 100, total: Math.round((subtotal - d) * 100) / 100 }
}

function toQuote(q) {
  const expired = q.status === 'Enviado' && q.validUntil && q.validUntil < todayKey()
  return {
    ...q,
    code: q.id ? q.id.slice(0, 5).toUpperCase() : '',
    displayStatus: expired ? 'Expirado' : q.status,
    createdAt: toDate(q.createdAt),
    sentAt: toDate(q.sentAt),
    decidedAt: toDate(q.decidedAt)
  }
}

export async function getQuotes({ leadId, patientId } = {}) {
  let q = collection(db, 'quotes')
  if (leadId) q = query(q, where('leadId', '==', leadId))
  else if (patientId) q = query(q, where('patientId', '==', patientId))
  const items = (await list(q)).map(toQuote)
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export async function getQuote(id) {
  return toQuote(await getOrThrow(doc(db, 'quotes', id), 'Orçamento não encontrado'))
}

function cleanItems(items) {
  return items
    .filter((i) => i.name?.trim())
    .map((i) => ({
      catalogId: i.catalogId || null,
      name: i.name.trim(),
      category: i.category || 'Procedimento',
      qty: Math.max(1, Number(i.qty) || 1),
      unitPrice: Math.round((Number(i.unitPrice) || 0) * 100) / 100,
      sessions: i.category === 'Pacote' ? Math.max(1, Number(i.sessions) || 1) : 1
    }))
}

/**
 * Cria ou atualiza (com `id`) um orçamento. O cliente é um lead ou uma
 * paciente: { leadId | patientId, clientName, clientPhone }.
 */
export async function saveQuote({ id, leadId = null, patientId = null, clientName, clientPhone, items, discount, installments, validUntil, notes, appointmentId = null }) {
  const clean = cleanItems(items || [])
  if (!clean.length) throw new Error('Adicione pelo menos um item.')
  const totals = quoteTotals(clean, discount)
  const data = {
    leadId,
    patientId,
    clientName: (clientName || '').trim(),
    clientPhone: (clientPhone || '').trim(),
    items: clean,
    ...totals,
    installments: Math.max(1, Math.min(12, Number(installments) || 1)),
    validUntil: validUntil || toDateKey(addDays(new Date(), 15)),
    notes: (notes || '').trim(),
    appointmentId,
    updatedAt: serverTimestamp()
  }
  if (id) {
    const current = await getOrThrow(doc(db, 'quotes', id), 'Orçamento não encontrado')
    if (current.status === 'Aprovado') throw new Error('Orçamentos aprovados não podem ser alterados.')
    await updateDoc(doc(db, 'quotes', id), data)
    return getQuote(id)
  }
  const ref = doc(collection(db, 'quotes'))
  const batch = writeBatch(db)
  batch.set(ref, { ...data, status: 'Rascunho', createdBy: currentUid(), createdAt: serverTimestamp() })
  const target = leadId ? ['leads', leadId] : patientId ? ['patients', patientId] : null
  if (target) batch.set(activityRef(...target), activityData('proposta', `Orçamento criado • ${formatMoney(totals.total)}`, { quoteId: ref.id }))
  await batch.commit()
  return getQuote(ref.id)
}

function formatMoney(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Texto do orçamento para enviar pelo WhatsApp
export function quoteShareText(quote) {
  const first = (quote.clientName || '').split(' ')[0]
  const lines = [
    `Olá${first ? `, ${first}` : ''}! Segue o seu orçamento:`,
    '',
    ...quote.items.map((i) => `• ${i.name}${i.qty > 1 ? ` (${i.qty}x)` : ''}${i.category === 'Pacote' ? ` — ${i.sessions * i.qty} sessões` : ''}: ${formatMoney(i.unitPrice * i.qty)}`),
    ''
  ]
  if (quote.discount > 0) lines.push(`Desconto: − ${formatMoney(quote.discount)}`)
  lines.push(`*Total: ${formatMoney(quote.total)}*${quote.installments > 1 ? ` (até ${quote.installments}x de ${formatMoney(quote.total / quote.installments)})` : ''}`)
  lines.push(`Válido até ${formatDateKey(quote.validUntil)}.`)
  if (quote.notes) lines.push('', quote.notes)
  lines.push('', 'Qualquer dúvida, estamos à disposição!')
  return lines.join('\n')
}

export function quoteWhatsAppUrl(quote) {
  let digits = (quote.clientPhone || '').replace(/\D/g, '')
  if (digits && !digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(quoteShareText(quote))}`
}

// Marca como enviado. Em leads: etapa "Proposta" e valor da proposta = total.
export async function markQuoteSent(id) {
  const quote = await getQuote(id)
  const batch = writeBatch(db)
  batch.update(doc(db, 'quotes', id), { status: quote.status === 'Rascunho' ? 'Enviado' : quote.status, sentAt: serverTimestamp() })
  if (quote.leadId) {
    const lead = await getOrThrow(doc(db, 'leads', quote.leadId), 'Lead não encontrado')
    const changes = { proposalValue: quote.total }
    if (['Novo', 'Em contato', 'Qualificado'].includes(lead.status)) {
      changes.status = 'Proposta'
      batch.set(activityRef('leads', quote.leadId), activityData('status', `Movido de "${lead.status}" para "Proposta"`))
    }
    batch.update(doc(db, 'leads', quote.leadId), changes)
  }
  const target = quote.leadId ? ['leads', quote.leadId] : quote.patientId ? ['patients', quote.patientId] : null
  if (target) batch.set(activityRef(...target), activityData('proposta', `Orçamento enviado • ${formatMoney(quote.total)}`, { quoteId: id }))
  await batch.commit()
  return getQuote(id)
}

/**
 * Aprova o orçamento (venda fechada):
 * - lead ainda sem ficha → converte em paciente;
 * - lança as receitas no Financeiro (parcelas mensais a partir de `firstDueDate`;
 *   `paid` marca a 1ª como recebida);
 * - cria os pacotes de sessões dos itens da categoria Pacote.
 */
export async function approveQuote(id, { firstDueDate, paid = false, method = null } = {}) {
  const quote = await getQuote(id)
  if (quote.status === 'Aprovado') throw new Error('Este orçamento já foi aprovado.')
  let patientId = quote.patientId
  if (!patientId && quote.leadId) {
    const lead = await getOrThrow(doc(db, 'leads', quote.leadId), 'Lead não encontrado')
    patientId = lead.patientId || (await convertLeadToPatient(quote.leadId, { name: lead.name, phone: lead.phone, email: lead.email })).patientId
  }
  if (!patientId) throw new Error('Orçamento sem paciente vinculada.')

  const hasPackage = quote.items.some((i) => i.category === 'Pacote')
  await createTransaction({
    type: 'receita',
    description: `Orçamento ${quote.code} — ${quote.items.map((i) => i.name).join(', ')}`.slice(0, 120),
    category: hasPackage ? 'Pacote' : quote.items[0].category === 'Consulta' ? 'Consulta' : 'Procedimento',
    amount: quote.total,
    dueDate: firstDueDate || todayKey(),
    paid,
    method,
    installments: quote.installments,
    patientId,
    patientName: quote.clientName,
    appointmentId: quote.appointmentId || null
  })

  const batch = writeBatch(db)
  for (const item of quote.items.filter((i) => i.category === 'Pacote')) {
    batch.set(doc(collection(db, 'patients', patientId, 'packages')), {
      name: item.name,
      totalSessions: item.sessions * item.qty,
      usedSessions: 0,
      usage: [],
      quoteId: id,
      catalogId: item.catalogId || null,
      createdAt: serverTimestamp()
    })
  }
  batch.update(doc(db, 'quotes', id), { status: 'Aprovado', patientId, decidedAt: serverTimestamp() })
  batch.set(activityRef('patients', patientId), activityData('proposta', `Orçamento aprovado • ${formatMoney(quote.total)}`, { quoteId: id }))
  await batch.commit()
  return { patientId, quote: await getQuote(id) }
}

export async function rejectQuote(id, reason) {
  const quote = await getQuote(id)
  const batch = writeBatch(db)
  batch.update(doc(db, 'quotes', id), { status: 'Recusado', rejectReason: reason || null, decidedAt: serverTimestamp() })
  const target = quote.leadId ? ['leads', quote.leadId] : quote.patientId ? ['patients', quote.patientId] : null
  if (target) batch.set(activityRef(...target), activityData('perdido', `Orçamento recusado${reason ? ` • ${reason}` : ''}`, { quoteId: id }))
  await batch.commit()
  return getQuote(id)
}

// ---- Vendas: resumo e oportunidades ----

export async function getSalesSummary(monthKey = currentMonthKey()) {
  const quotes = await getQuotes()
  const inMonth = (d) => d && toDateKey(d).slice(0, 7) === monthKey
  const sent = quotes.filter((q) => inMonth(q.sentAt))
  const approved = quotes.filter((q) => q.status === 'Aprovado' && inMonth(q.decidedAt))
  const rejected = quotes.filter((q) => q.status === 'Recusado' && inMonth(q.decidedAt))
  const decided = approved.length + rejected.length
  const open = quotes.filter((q) => q.displayStatus === 'Enviado')
  return {
    quotes,
    sentCount: sent.length,
    approvedCount: approved.length,
    approvedValue: approved.reduce((s, q) => s + q.total, 0),
    conversionPct: decided ? Math.round((approved.length / decided) * 100) : null,
    openCount: open.length,
    openValue: open.reduce((s, q) => s + q.total, 0)
  }
}

const normalizeName = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Oportunidades de venda:
 * - manutenção: pacientes cujo último procedimento de um item com
 *   `maintenanceDays` vence em até 15 dias (ou já venceu) e sem agendamento futuro;
 * - orçamentos enviados há mais de 3 dias aguardando resposta.
 */
export async function getSalesOpportunities() {
  const today = todayKey()
  const [catalog, patients, procedures, futureAppts, quotes] = await Promise.all([
    getCatalog({ activeOnly: true }),
    list(collection(db, 'patients')),
    getDocs(collectionGroup(db, 'procedures')),
    list(query(collection(db, 'appointments'), where('dateKey', '>=', today))),
    getQuotes()
  ])
  const booked = new Set(futureAppts.filter((a) => a.status !== 'Concluído').map((a) => a.patientId))
  const maintained = catalog.filter((c) => c.maintenanceDays > 0)
  const lastByKey = {}
  for (const snap of procedures.docs) {
    const p = snap.data()
    const patientId = snap.ref.parent.parent.id
    const item = maintained.find((c) => normalizeName(p.name).includes(normalizeName(c.name)) || normalizeName(c.name).includes(normalizeName(p.name)))
    if (!item || p.status !== 'Concluído') continue
    const key = `${patientId}|${item.id}`
    if (!lastByKey[key] || p.date > lastByKey[key].date) lastByKey[key] = { date: p.date, item, patientId }
  }
  const horizon = toDateKey(addDays(new Date(), 15))
  const maintenance = Object.values(lastByKey)
    .map(({ date, item, patientId }) => {
      const patient = patients.find((x) => x.id === patientId)
      const dueDate = toDateKey(addDays(parseDateKey(date), item.maintenanceDays))
      return {
        id: `${patientId}-${item.id}`,
        patientId,
        patientName: patient?.name || 'Paciente',
        phone: patient?.phone || '',
        procedure: item.name,
        catalogItem: item,
        lastDate: date,
        dueDate,
        overdueDays: Math.round((parseDateKey(today) - parseDateKey(dueDate)) / 86_400_000),
        booked: booked.has(patientId)
      }
    })
    .filter((o) => o.dueDate <= horizon && !o.booked)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const threeDaysAgo = addDays(new Date(), -3)
  const awaiting = quotes
    .filter((q) => q.displayStatus === 'Enviado' && q.sentAt && q.sentAt < threeDaysAgo)
    .sort((a, b) => a.sentAt - b.sentAt)
  return { maintenance, awaiting }
}

// Mensagem de manutenção para o WhatsApp da paciente
export function maintenanceWhatsAppUrl(o) {
  let digits = (o.phone || '').replace(/\D/g, '')
  if (digits && !digits.startsWith('55')) digits = `55${digits}`
  const first = o.patientName.split(' ')[0]
  const text = `Olá, ${first}! Tudo bem? Já está chegando a hora da manutenção do seu ${o.procedure.toLowerCase()}. Quer que eu reserve um horário para você?`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

// ---- Acompanhamento (Care) ----
// `careTasks`: o que a equipe precisa fazer por cada paciente em uma data —
// check-in pós-procedimento, confirmar retorno, manutenção, aniversário,
// reativação ou tarefa avulsa. Status: Pendente → Concluído | Ignorado.

export const CARE_TYPES = {
  checkin: { label: 'Check-in pós-procedimento', short: 'Check-in' },
  retorno: { label: 'Confirmar retorno', short: 'Retorno' },
  manutencao: { label: 'Manutenção', short: 'Manutenção' },
  queixa: { label: 'Reavaliar queixa', short: 'Queixa' },
  aniversario: { label: 'Aniversário', short: 'Aniversário' },
  reativacao: { label: 'Reativação', short: 'Reativação' },
  personalizado: { label: 'Tarefa', short: 'Tarefa' }
}

// Tipos em que a equipe registra como a paciente está
export const CARE_OUTCOME_TYPES = ['checkin', 'retorno', 'queixa']

// Tarefas geradas ao registrar um procedimento concluído
function carePlanFor({ patientId, patient, procedure, returnInDays, maintenanceDays }) {
  const base = {
    patientId,
    patientName: patient.name,
    phone: patient.phone || '',
    procedureId: procedure.id,
    procedureName: procedure.name,
    postCare: procedure.postCare || '',
    status: 'Pendente',
    source: 'procedimento',
    notes: '',
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const at = (days) => toDateKey(addDays(parseDateKey(procedure.date), days))
  const tasks = [{ ...base, type: 'checkin', title: `Check-in pós ${procedure.name}`, dueDate: at(1) }]
  if (returnInDays > 0) tasks.push({ ...base, type: 'retorno', title: `Confirmar retorno • ${procedure.name}`, dueDate: at(Math.max(1, returnInDays - 2)) })
  if (maintenanceDays > 0) tasks.push({ ...base, type: 'manutencao', title: `Manutenção de ${procedure.name}`, dueDate: at(Math.max(1, maintenanceDays - 7)) })
  // Tarefas cujo dia já passou (registro retroativo) não são criadas
  return tasks.filter((t) => t.dueDate >= todayKey())
}

function toCareTask(t) {
  const today = todayKey()
  const overdue = t.status === 'Pendente' && t.dueDate < today
  let dueLabel = formatDateKey(t.dueDate).slice(0, 5)
  if (t.dueDate === today) dueLabel = 'Hoje'
  else if (t.dueDate === toDateKey(addDays(new Date(), 1))) dueLabel = 'Amanhã'
  else if (overdue) {
    const days = Math.round((parseDateKey(today) - parseDateKey(t.dueDate)) / 86_400_000)
    dueLabel = days === 1 ? 'Atrasada 1 dia' : `Atrasada ${days} dias`
  }
  return { ...t, overdue, dueLabel, typeLabel: CARE_TYPES[t.type]?.label || 'Tarefa', completedAt: toDate(t.completedAt) }
}

const byDue = (a, b) => a.dueDate.localeCompare(b.dueDate) || a.patientName.localeCompare(b.patientName)

// scope: 'hoje' (atrasadas + hoje) | 'proximos' (próximos 14 dias) | 'concluidos'
export async function getCareTasks(scope = 'hoje') {
  if (scope === 'concluidos') {
    const done = await list(query(collection(db, 'careTasks'), where('status', 'in', ['Concluído', 'Ignorado'])))
    return done.map(toCareTask).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 60)
  }
  const pending = (await list(query(collection(db, 'careTasks'), where('status', '==', 'Pendente')))).map(toCareTask)
  const today = todayKey()
  const horizon = toDateKey(addDays(new Date(), 14))
  return pending.filter((t) => (scope === 'hoje' ? t.dueDate <= today : t.dueDate > today && t.dueDate <= horizon)).sort(byDue)
}

export async function getCareCounts() {
  const pending = (await list(query(collection(db, 'careTasks'), where('status', '==', 'Pendente')))).map(toCareTask)
  const today = todayKey()
  return {
    today: pending.filter((t) => t.dueDate <= today).length,
    overdue: pending.filter((t) => t.overdue).length,
    upcoming: pending.filter((t) => t.dueDate > today).length,
    preview: pending.filter((t) => t.dueDate <= today).sort(byDue).slice(0, 3)
  }
}

export async function getPatientCareTasks(patientId) {
  const items = await list(query(collection(db, 'careTasks'), where('patientId', '==', patientId)))
  return items.map(toCareTask).filter((t) => t.status === 'Pendente').sort(byDue)
}

export async function createCareTask({ patientId, patientName, phone, title, dueDate, type = 'personalizado', notes = '' }) {
  const data = {
    type,
    title: title.trim(),
    patientId,
    patientName,
    phone: phone || '',
    dueDate: dueDate || todayKey(),
    status: 'Pendente',
    source: 'manual',
    notes: notes.trim(),
    createdBy: currentUid(),
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'careTasks'), data)
  return toCareTask({ id: ref.id, ...data })
}

/**
 * Conclui a tarefa e registra no histórico da paciente. `outcome`:
 * 'ok' (sem queixas) | 'queixa' — queixa vira evolução no prontuário e
 * gera "Reavaliar queixa" para o dia seguinte. `channel`: 'whatsapp' | 'ligacao' | null.
 */
export async function completeCareTask(id, { outcome = null, note = '', channel = null } = {}) {
  const task = toCareTask(await getOrThrow(doc(db, 'careTasks', id), 'Tarefa não encontrada'))
  const user = auth.currentUser
  const text = [
    `${task.typeLabel}${task.procedureName && !task.title.includes(task.procedureName) ? ` • ${task.procedureName}` : ''}`,
    outcome === 'ok' ? 'sem queixas' : outcome === 'queixa' ? 'COM QUEIXA' : null,
    note.trim() || null
  ]
    .filter(Boolean)
    .join(' — ')
  const batch = writeBatch(db)
  batch.update(doc(db, 'careTasks', id), {
    status: 'Concluído',
    outcome,
    resultNote: note.trim(),
    channel,
    completedAt: serverTimestamp(),
    completedBy: user?.uid || null,
    completedByName: user?.displayName || user?.email || null
  })
  batch.set(activityRef('patients', task.patientId), activityData(channel || 'nota', `Acompanhamento: ${text}`, { label: 'Acompanhamento', careTaskId: id }))
  if (outcome === 'queixa') {
    batch.set(doc(collection(db, 'patients', task.patientId, 'evolutions')), {
      text: `Intercorrência relatada no acompanhamento (${task.title}): ${note.trim() || 'sem detalhes'}`,
      date: todayKey(),
      appointmentId: null,
      createdBy: user?.uid || null,
      createdByName: user?.displayName || user?.email || null,
      createdAt: serverTimestamp()
    })
    batch.set(doc(collection(db, 'careTasks')), {
      type: 'queixa',
      title: `Reavaliar queixa • ${task.procedureName || task.patientName}`,
      patientId: task.patientId,
      patientName: task.patientName,
      phone: task.phone,
      procedureId: task.procedureId || null,
      procedureName: task.procedureName || null,
      dueDate: toDateKey(addDays(new Date(), 1)),
      status: 'Pendente',
      source: 'acompanhamento',
      notes: note.trim(),
      createdBy: user?.uid || null,
      createdAt: serverTimestamp()
    })
  }
  await batch.commit()
}

export async function rescheduleCareTask(id, dueDate) {
  await updateDoc(doc(db, 'careTasks', id), { dueDate })
}

export async function dismissCareTask(id) {
  await updateDoc(doc(db, 'careTasks', id), { status: 'Ignorado', completedAt: serverTimestamp() })
}

function waUrl(phone, text) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits && !digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

// Mensagem pronta por tipo de tarefa
export function careMessage(task) {
  const first = (task.patientName || '').split(' ')[0]
  const proc = (task.procedureName || 'procedimento').toLowerCase()
  switch (task.type) {
    case 'checkin':
      return `Olá, ${first}! Passando para saber como você está depois do ${proc}. Está tudo bem? Qualquer desconforto, me avise por aqui.${task.postCare ? `\n\nLembrete dos cuidados: ${task.postCare}` : ''}`
    case 'retorno':
      return `Olá, ${first}! Seu retorno do ${proc} está chegando. Posso confirmar o seu horário?`
    case 'manutencao':
      return `Olá, ${first}! Já está chegando a hora da manutenção do seu ${proc}. Quer que eu reserve um horário para você?`
    case 'queixa':
      return `Olá, ${first}! Como você está hoje? Melhorou aquele desconforto?`
    case 'aniversario':
      return `Feliz aniversário, ${first}! 🎉 Toda a equipe deseja um dia lindo para você. Temos um presente especial esperando por você aqui na clínica!`
    case 'reativacao':
      return `Olá, ${first}! Sentimos sua falta por aqui. Que tal agendar uma avaliação para cuidarmos de você de novo?`
    default:
      return `Olá, ${first}!`
  }
}

export function careWhatsAppUrl(task) {
  return waUrl(task.phone, careMessage(task))
}

// ---- Marketing: públicos, campanhas e automações ----

export const SEGMENTS = [
  { type: 'inativas', label: 'Pacientes inativas', param: { key: 'days', label: 'Sem visita há', options: [60, 90, 120, 180], suffix: 'dias', default: 90 } },
  { type: 'aniversariantes', label: 'Aniversariantes do mês' },
  { type: 'procedimento', label: 'Fizeram um procedimento', param: { key: 'procedure', label: 'Procedimento', catalog: true } },
  { type: 'leads_perdidos', label: 'Leads perdidos' },
  { type: 'leads_sem_contato', label: 'Leads abertos sem contato', param: { key: 'days', label: 'Sem contato há', options: [3, 7, 15, 30], suffix: 'dias', default: 7 } },
  { type: 'origem', label: 'Por origem', param: { key: 'source', label: 'Origem', options: LEAD_SOURCES } },
  { type: 'pacientes', label: 'Todas as pacientes ativas' }
]

export function segmentLabel(segment) {
  const def = SEGMENTS.find((s) => s.type === segment?.type)
  if (!def) return 'Público'
  const v = segment.params?.[def.param?.key]
  return v ? `${def.label} • ${def.param.suffix ? `${v} ${def.param.suffix}` : v}` : def.label
}

const hasPhone = (x) => (x.phone || '').replace(/\D/g, '').length >= 10

/**
 * Pessoas de um público (com telefone): [{ kind, id, name, phone, vars }].
 * `vars` alimenta as variáveis da mensagem.
 */
export async function getSegmentAudience(segment) {
  const today = todayKey()
  const params = segment.params || {}
  const patientRows = (ps, extra = () => ({})) =>
    ps.filter(hasPhone).map((p) => ({
      kind: 'patient',
      id: p.id,
      name: p.name,
      phone: p.phone,
      vars: { ultima_visita: p.lastVisit ? formatDateKey(p.lastVisit) : '', ...extra(p) }
    }))
  const leadRows = (ls) =>
    ls.filter(hasPhone).map((l) => ({ kind: 'lead', id: l.id, name: l.name, phone: l.phone, vars: { procedimento: l.interest || '' } }))

  switch (segment.type) {
    case 'inativas': {
      const days = Number(params.days) || 90
      const cutoff = toDateKey(addDays(new Date(), -days))
      const [patients, future] = await Promise.all([
        list(collection(db, 'patients')),
        list(query(collection(db, 'appointments'), where('dateKey', '>=', today)))
      ])
      const booked = new Set(future.map((a) => a.patientId))
      return patientRows(patients.filter((p) => p.lastVisit && p.lastVisit <= cutoff && !booked.has(p.id)))
    }
    case 'aniversariantes': {
      const month = today.slice(5, 7)
      const patients = await list(collection(db, 'patients'))
      return patientRows(patients.filter((p) => p.birthDate?.slice(5, 7) === month)).sort((a, b) => a.name.localeCompare(b.name))
    }
    case 'procedimento': {
      const target = normalizeName(params.procedure || '')
      if (!target) return []
      const [patients, procs] = await Promise.all([list(collection(db, 'patients')), getDocs(collectionGroup(db, 'procedures'))])
      const ids = new Set(
        procs.docs.filter((d) => normalizeName(d.data().name).includes(target) && d.data().status === 'Concluído').map((d) => d.ref.parent.parent.id)
      )
      return patientRows(patients.filter((p) => ids.has(p.id)), () => ({ procedimento: params.procedure }))
    }
    case 'leads_perdidos': {
      const leads = await list(query(collection(db, 'leads'), where('status', '==', 'Perdido')))
      return leadRows(leads)
    }
    case 'leads_sem_contato': {
      const days = Number(params.days) || 7
      const cutoff = addDays(new Date(), -days)
      const leads = await list(collection(db, 'leads'))
      return leadRows(leads.filter((l) => isOpenLead(l) && (toDate(l.lastContactAt) || toDate(l.createdAt) || new Date(0)) < cutoff))
    }
    case 'origem': {
      const [patients, leads] = await Promise.all([
        list(query(collection(db, 'patients'), where('source', '==', params.source || ''))),
        list(query(collection(db, 'leads'), where('source', '==', params.source || '')))
      ])
      return [...patientRows(patients), ...leadRows(leads.filter((l) => !l.patientId))]
    }
    case 'pacientes': {
      const patients = await list(collection(db, 'patients'))
      return patientRows(patients.filter((p) => p.status !== 'Inativa'))
    }
    default:
      return []
  }
}

export const MESSAGE_VARIABLES = [
  { key: 'primeiro_nome', label: 'Primeiro nome' },
  { key: 'nome', label: 'Nome completo' },
  { key: 'procedimento', label: 'Procedimento' },
  { key: 'ultima_visita', label: 'Última visita' }
]

export const MESSAGE_TEMPLATES = [
  { label: 'Reativação', text: 'Olá, {primeiro_nome}! Sentimos sua falta por aqui 💕 Que tal agendar uma avaliação? Esta semana temos horários especiais para você.' },
  { label: 'Manutenção', text: 'Olá, {primeiro_nome}! Já está na hora da manutenção do seu {procedimento}. Posso reservar um horário para você?' },
  { label: 'Promoção', text: 'Olá, {primeiro_nome}! Neste mês preparamos condições especiais em procedimentos selecionados. Quer saber mais?' },
  { label: 'Aniversário', text: 'Feliz aniversário, {primeiro_nome}! 🎉 Para comemorar, você tem um presente especial na sua próxima visita.' },
  { label: 'Retomar lead', text: 'Oi, {primeiro_nome}! Tudo bem? Ainda tem interesse em {procedimento}? Posso te ajudar com as informações que faltam.' }
]

export function personalize(message, recipient) {
  const vars = { nome: recipient.name, primeiro_nome: (recipient.name || '').split(' ')[0], ...(recipient.vars || {}) }
  return message.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? vars[k] : k === 'procedimento' ? 'procedimento' : ''))
}

export function campaignWhatsAppUrl(campaign, recipient) {
  return waUrl(recipient.phone, personalize(campaign.message, recipient))
}

function toCampaign(c) {
  const recipients = c.recipients || []
  const sent = recipients.filter((r) => r.status === 'enviado').length
  const skipped = recipients.filter((r) => r.status === 'pulado').length
  return {
    ...c,
    createdAt: toDate(c.createdAt),
    startedAt: toDate(c.startedAt),
    stats: { total: recipients.length, sent, skipped, pending: recipients.length - sent - skipped },
    segmentLabel: segmentLabel(c.segment)
  }
}

export async function getCampaigns() {
  const items = await list(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc')))
  return items.map(toCampaign)
}

export async function getCampaign(id) {
  return toCampaign(await getOrThrow(doc(db, 'campaigns', id), 'Campanha não encontrada'))
}

export async function createCampaign({ name, segment, message }) {
  if (!message?.trim()) throw new Error('Escreva a mensagem.')
  const audience = await getSegmentAudience(segment)
  if (!audience.length) throw new Error('Esse público não tem ninguém com telefone cadastrado.')
  const data = {
    name: name.trim() || segmentLabel(segment),
    segment,
    message: message.trim(),
    channel: 'whatsapp',
    status: 'Em andamento',
    recipients: audience.map((r) => ({ ...r, status: 'pendente', sentAt: null })),
    createdBy: currentUid(),
    createdAt: serverTimestamp(),
    startedAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, 'campaigns'), data)
  return getCampaign(ref.id)
}

/**
 * Marca um destinatário como enviado/pulado (transação: dois aparelhos
 * disparando ao mesmo tempo não se sobrescrevem). Envio registra a
 * campanha no histórico do lead/paciente.
 */
export async function markCampaignRecipient(campaignId, index, status) {
  const ref = doc(db, 'campaigns', campaignId)
  let recipient = null
  let campaignName = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Campanha não encontrada')
    const data = snap.data()
    const recipients = [...data.recipients]
    recipients[index] = { ...recipients[index], status, sentAt: status === 'enviado' ? Timestamp.now() : null }
    recipient = recipients[index]
    campaignName = data.name
    const done = recipients.every((r) => r.status !== 'pendente')
    tx.update(ref, { recipients, ...(done ? { status: 'Concluída', completedAt: serverTimestamp() } : {}) })
  })
  if (status === 'enviado' && recipient) {
    const target = recipient.kind === 'lead' ? 'leads' : 'patients'
    await setDoc(activityRef(target, recipient.id), activityData('whatsapp', `Campanha "${campaignName}" enviada`, { label: 'Campanha', campaignId })).catch(() => {})
  }
  return getCampaign(campaignId)
}

/**
 * Resultados da campanha: pacientes que agendaram e leads que viraram
 * paciente depois de receber a mensagem (até 30 dias).
 */
export async function getCampaignResults(campaign) {
  const sent = campaign.recipients.filter((r) => r.status === 'enviado' && r.sentAt)
  if (!sent.length) return { booked: 0, converted: 0, names: [] }
  const since = sent.map((r) => toDate(r.sentAt)).sort((a, b) => a - b)[0]
  const [appts, leads] = await Promise.all([
    list(query(collection(db, 'appointments'), where('createdAt', '>=', Timestamp.fromDate(since)))),
    list(query(collection(db, 'leads'), where('status', '==', 'Convertido')))
  ])
  const within = (date, sentAt) => date && date >= sentAt && date - sentAt <= 30 * 86_400_000
  const names = []
  let booked = 0
  let converted = 0
  for (const r of sent) {
    const sentAt = toDate(r.sentAt)
    if (r.kind === 'patient' && appts.some((a) => a.patientId === r.id && within(toDate(a.createdAt), sentAt))) {
      booked++
      names.push(r.name)
    }
    if (r.kind === 'lead' && leads.some((l) => l.id === r.id && within(toDate(l.convertedAt), sentAt))) {
      converted++
      names.push(r.name)
    }
  }
  return { booked, converted, names }
}

export const AUTOMATION_DEFAULTS = {
  postProcedure: { enabled: true },
  birthday: { enabled: true },
  reactivation: { enabled: true, days: 120 },
  leadNoContact: { enabled: true, days: 3 }
}

export async function getAutomations() {
  const snap = await getDoc(doc(db, 'settings', 'automations'))
  const data = snap.exists() ? snap.data() : {}
  return Object.fromEntries(Object.entries(AUTOMATION_DEFAULTS).map(([k, v]) => [k, { ...v, ...(data[k] || {}) }]))
}

export async function updateAutomation(key, changes) {
  const current = await getAutomations()
  const next = { ...current[key], ...changes }
  await setDoc(doc(db, 'settings', 'automations'), { [key]: next, updatedAt: serverTimestamp() }, { merge: true })
  return { ...current, [key]: next }
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
