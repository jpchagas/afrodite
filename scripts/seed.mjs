// Popula o Firebase Emulator Suite com dados de demonstração.
// Uso: com `npm run emulators` rodando em outro terminal, execute `npm run seed`.
//
// O script SEMPRE aponta para os emuladores (nunca para produção) e é
// idempotente: apaga as coleções e recria tudo a cada execução. As datas são
// geradas em relação ao dia atual, para que "Hoje" sempre tenha agenda,
// leads recentes e faturamento no mês corrente.

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
// Evita que o firebase-admin procure credenciais/metadata do Google Cloud
process.env.GCLOUD_PROJECT = 'demo-afrodite'
process.env.METADATA_SERVER_DETECTION = 'none'

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'demo-afrodite'

initializeApp({ projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

// ---- Datas relativas ----

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()

function daysFromNow(days) {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d
}

function dateKey(days) {
  const d = daysFromNow(days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hoursAgo(hours, minutes = 0) {
  return Timestamp.fromDate(new Date(now.getTime() - (hours * 60 + minutes) * 60_000))
}

// Dia dentro do mês atual / anterior (limitado a hoje para não cair no futuro)
function thisMonth(day) {
  const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function lastMonth(day) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, day)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---- Dados ----

const USERS = [
  {
    uid: 'u-admin',
    email: 'admin@afrodite.com',
    password: '123456',
    name: 'Dra. Bárbara',
    role: 'medica'
  }
]

const PATIENTS = [
  {
    id: 'p1',
    name: 'Rafaela Costa',
    age: 32,
    cpf: '123.456.789-00',
    phone: '(51) 99876-5432',
    status: 'Em acompanhamento',
    lastVisit: dateKey(-25),
    lastVisitLabel: 'Avaliação',
    nextReturn: dateKey(35),
    nextReturnLabel: 'Pós procedimento'
  },
  {
    id: 'p2',
    name: 'Camila Rocha',
    age: 28,
    cpf: '987.654.321-00',
    phone: '(51) 98877-6544',
    status: 'Ativa',
    lastVisit: dateKey(-27),
    lastVisitLabel: 'Consulta de avaliação',
    nextReturn: dateKey(4),
    nextReturnLabel: 'Retorno'
  },
  {
    id: 'p3',
    name: 'Juliana Mendes',
    age: 40,
    cpf: '111.222.333-44',
    phone: '(51) 99123-4567',
    status: 'Pós procedimento',
    lastVisit: dateKey(-30),
    lastVisitLabel: 'Procedimento labial',
    nextReturn: dateKey(2),
    nextReturnLabel: 'Revisão'
  },
  {
    id: 'p4',
    name: 'Mariana Silva',
    age: 35,
    cpf: '222.333.444-55',
    phone: '(51) 99234-5678',
    status: 'Em avaliação',
    lastVisit: dateKey(-33),
    lastVisitLabel: 'Retorno',
    nextReturn: null,
    nextReturnLabel: 'A agendar'
  },
  {
    id: 'p5',
    name: 'Beatriz Lima',
    age: 31,
    cpf: '333.444.555-66',
    phone: '(51) 99345-6789',
    status: 'Ativa',
    lastVisit: dateKey(-40),
    lastVisitLabel: 'Avaliação',
    nextReturn: dateKey(21),
    nextReturnLabel: 'Pós procedimento'
  },
  {
    id: 'p6',
    name: 'Letícia Souza',
    age: 27,
    cpf: '444.555.666-77',
    phone: '(51) 99456-7890',
    status: 'Inativa',
    lastVisit: dateKey(-150),
    lastVisitLabel: 'Consulta',
    nextReturn: null,
    nextReturnLabel: 'Sem retorno agendado'
  }
]

const ANAMNESE = {
  p1: {
    queixaPrincipal: 'Melhorar a qualidade da pele e prevenção de linhas de expressão.',
    historicoMedico: 'Sem comorbidades.',
    alergias: 'Não possui.',
    procedimentosAnteriores: 'Bioestimulador de colágeno (2024).'
  },
  p3: {
    queixaPrincipal: 'Volume e contorno labial.',
    historicoMedico: 'Hipotireoidismo controlado.',
    alergias: 'Dipirona.',
    procedimentosAnteriores: 'Preenchimento labial (2023).'
  }
}

const PROCEDURES = {
  p1: [
    { id: 'pr1', name: 'Toxina botulínica', date: dateKey(-25), area: 'Face', status: 'Concluído' },
    { id: 'pr2', name: 'Preenchimento labial', date: dateKey(-95), area: 'Lábios', status: 'Concluído' },
    { id: 'pr3', name: 'Bioestimulador de colágeno', date: dateKey(-270), area: 'Face', status: 'Concluído' },
    { id: 'pr4', name: 'Skinbooster', date: dateKey(-370), area: 'Rosto', status: 'Concluído' },
    { id: 'pr5', name: 'Protocolo de colágeno', date: dateKey(0), area: 'Face', status: 'Em andamento' }
  ],
  p3: [
    { id: 'pr1', name: 'Preenchimento labial', date: dateKey(-30), area: 'Lábios', status: 'Concluído' }
  ]
}

const PHOTOS = {
  p1: [
    { id: 'f1', label: 'Antes', date: dateKey(-95) },
    { id: 'f2', label: '30 dias', date: dateKey(-65) },
    { id: 'f3', label: '60 dias', date: dateKey(-35) },
    { id: 'f4', label: '90 dias', date: dateKey(-5) }
  ]
}

const PRESCRIPTIONS = {
  p1: [
    { id: 'rx1', name: 'Skinbooster', detail: '3 sessões', startDate: dateKey(-60), nextSession: dateKey(10), status: 'Em dia', active: true },
    { id: 'rx2', name: 'Protocolo de manutenção', detail: '1 sessão', startDate: dateKey(-25), nextSession: null, status: 'Em dia', active: true },
    { id: 'rx3', name: 'Hidratação domiciliar', detail: 'Diário • 30 dias', startDate: dateKey(-20), nextSession: null, status: 'Em dia', active: true },
    { id: 'rx4', name: 'Ácido retinoico 0,025%', detail: 'Noturno • 60 dias', startDate: dateKey(-200), nextSession: null, status: 'Concluído', active: false }
  ]
}

const APPOINTMENTS = [
  { day: 0, time: '08:00', durationMin: 45, patientId: 'p2', procedure: 'Consulta de avaliação', room: 'Sala 1 • Clínica Central' },
  { day: 0, time: '09:30', durationMin: 60, patientId: 'p3', procedure: 'Procedimento labial', room: 'Sala 2 • Clínica Central' },
  { day: 0, time: '11:00', durationMin: 30, patientId: 'p4', procedure: 'Retorno', room: 'Sala 1 • Clínica Central' },
  { day: 0, time: '14:00', durationMin: 45, patientId: 'p5', procedure: 'Avaliação', room: 'Sala 1 • Clínica Central' },
  { day: 0, time: '16:30', durationMin: 60, patientId: 'p1', procedure: 'Protocolo de colágeno', room: 'Sala 2 • Clínica Central' },
  { day: 0, time: '17:30', durationMin: 30, patientId: 'p6', procedure: 'Consulta', room: 'Sala 1 • Clínica Central' },
  { day: 1, time: '09:00', durationMin: 30, patientId: 'p1', procedure: 'Retorno pós procedimento', room: 'Sala 1 • Clínica Central' },
  { day: 1, time: '10:30', durationMin: 60, patientId: 'p2', procedure: 'Skinbooster', room: 'Sala 2 • Clínica Central' },
  { day: 2, time: '08:30', durationMin: 45, patientId: 'p4', procedure: 'Avaliação inicial', room: 'Sala 1 • Clínica Central' },
  { day: 2, time: '15:00', durationMin: 30, patientId: 'p3', procedure: 'Revisão', room: 'Sala 2 • Clínica Central' },
  { day: 3, time: '11:00', durationMin: 60, patientId: 'p5', procedure: 'Protocolo de manutenção', room: 'Sala 2 • Clínica Central' }
]

const LEADS = [
  { id: 'l1', name: 'Juliana Alves', phone: '(51) 99118-7777', interest: 'Protocolo de colágeno', status: 'Novo', source: 'Instagram', createdAt: hoursAgo(2, 10), proposalValue: 1900, downPayment: 0, notes: 'Perguntou sobre o protocolo de estímulo de colágeno visto no Instagram.' },
  { id: 'l2', name: 'Tatiane Souza', phone: '(51) 98777-0066', interest: 'Toxina botulínica', status: 'Em contato', source: 'Indicação', createdAt: hoursAgo(5, 30), proposalValue: 2800, downPayment: 500, notes: 'Indicada por uma paciente atual.' },
  { id: 'l3', name: 'Carla Martins', phone: '(51) 99866-5555', interest: 'Skinbooster', status: 'Qualificado', source: 'Site', createdAt: hoursAgo(20), proposalValue: 680, downPayment: 0, notes: '' },
  { id: 'l4', name: 'Fernanda Lima', phone: '(51) 99165-4444', interest: 'Tratamento facial completo', status: 'Proposta', source: 'WhatsApp', createdAt: hoursAgo(30), proposalValue: 3200, downPayment: 1000, notes: 'Proposta enviada, aguardando retorno.' },
  { id: 'l5', name: 'Patrícia Nunes', phone: '(51) 99321-8080', interest: 'Bioestimulador de colágeno', status: 'Proposta', source: 'Instagram', createdAt: hoursAgo(52), proposalValue: 2400, downPayment: 0, notes: 'Pediu parcelamento em 3x.' },
  { id: 'l6', name: 'Beatriz Fontoura', phone: '(51) 99009-2222', interest: 'Consulta de avaliação', status: 'Convertido', source: 'Instagram', createdAt: hoursAgo(24 * 10), proposalValue: 450, downPayment: 450, notes: 'Convertida — já é paciente ativa.' }
]

const L1_MESSAGES = [
  { from: 'clinica', minutesAfter: 0, text: 'Olá, Juliana! Aqui é da equipe da Dra. Bárbara. Vi que você se interessou pelo protocolo de colágeno. Posso te ajudar com alguma dúvida?' },
  { from: 'lead', minutesAfter: 7, text: 'Oi! Tenho sim algumas dúvidas sobre o procedimento e os valores.' },
  { from: 'clinica', minutesAfter: 10, text: 'Claro! Vou te enviar todo o material com as informações e já deixo um horário reservado para uma avaliação, pode ser?' },
  { from: 'clinica', minutesAfter: 11, text: 'Protocolo de Colágeno.pdf', attachment: { name: 'Protocolo de Colágeno.pdf', size: '2.4MB' } }
]

const PAYMENTS = [
  { id: 'pg1', patientId: 'p1', patientName: 'Rafaela Costa', procedure: 'Toxina botulínica', amount: 2800, date: thisMonth(3), method: 'Cartão de crédito', status: 'Pago' },
  { id: 'pg2', patientId: 'p3', patientName: 'Juliana Mendes', procedure: 'Preenchimento labial', amount: 1900, date: thisMonth(2), method: 'Pix', status: 'Pago' },
  { id: 'pg3', patientId: 'p2', patientName: 'Camila Rocha', procedure: 'Skinbooster', amount: 680, date: thisMonth(1), method: 'Pix', status: 'Pago' },
  { id: 'pg4', patientId: 'p5', patientName: 'Beatriz Lima', procedure: 'Bioestimulador de colágeno', amount: 2400, date: thisMonth(1), method: 'Cartão de crédito', status: 'Pago' },
  { id: 'pg5', patientId: 'p4', patientName: 'Mariana Silva', procedure: 'Avaliação + protocolo', amount: 1200, date: null, method: 'Boleto', status: 'Pendente' },
  { id: 'pg6', patientId: 'p1', patientName: 'Rafaela Costa', procedure: 'Protocolo de colágeno', amount: 2925, date: null, method: 'Cartão de crédito', status: 'Pendente' },
  { id: 'pg7', patientId: 'p2', patientName: 'Camila Rocha', procedure: 'Consulta de avaliação', amount: 450, date: lastMonth(22), method: 'Pix', status: 'Pago' },
  { id: 'pg8', patientId: 'p3', patientName: 'Juliana Mendes', procedure: 'Toxina botulínica', amount: 2800, date: lastMonth(15), method: 'Cartão de crédito', status: 'Pago' },
  { id: 'pg9', patientId: 'p5', patientName: 'Beatriz Lima', procedure: 'Skinbooster', amount: 680, date: lastMonth(8), method: 'Pix', status: 'Pago' }
]

const COMMISSIONS = [
  { id: 'cm1', procedure: 'Toxina botulínica', base: 2800, pct: 30, date: thisMonth(3) },
  { id: 'cm2', procedure: 'Preenchimento labial', base: 1900, pct: 30, date: thisMonth(2) },
  { id: 'cm3', procedure: 'Skinbooster', base: 680, pct: 25, date: thisMonth(1) },
  { id: 'cm4', procedure: 'Bioestimulador de colágeno', base: 2400, pct: 30, date: thisMonth(1) }
]

// ---- Escrita ----

async function clearCollection(path) {
  // recursiveDelete também remove subcoleções (anamnese, mensagens etc.)
  await db.recursiveDelete(db.collection(path))
}

async function seedUsers() {
  for (const u of USERS) {
    try {
      await auth.deleteUser(u.uid)
    } catch {
      // usuário ainda não existe
    }
    await auth.createUser({ uid: u.uid, email: u.email, password: u.password, displayName: u.name })
    await db.doc(`users/${u.uid}`).set({ email: u.email, name: u.name, role: u.role })
  }
}

async function seedPatients() {
  const batch = db.batch()
  for (const { id, ...data } of PATIENTS) {
    batch.set(db.doc(`patients/${id}`), { ...data, createdAt: Timestamp.now() })
  }
  for (const [pid, data] of Object.entries(ANAMNESE)) {
    batch.set(db.doc(`patients/${pid}/anamnese/main`), data)
  }
  for (const [pid, list] of Object.entries(PROCEDURES)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/procedures/${id}`), data)
  }
  for (const [pid, list] of Object.entries(PHOTOS)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/photos/${id}`), data)
  }
  for (const [pid, list] of Object.entries(PRESCRIPTIONS)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/prescriptions/${id}`), data)
  }
  await batch.commit()
}

async function seedAppointments() {
  const batch = db.batch()
  APPOINTMENTS.forEach((a, idx) => {
    const patient = PATIENTS.find((p) => p.id === a.patientId)
    batch.set(db.doc(`appointments/ag${idx + 1}`), {
      dateKey: dateKey(a.day),
      time: a.time,
      durationMin: a.durationMin,
      patientId: a.patientId,
      patientName: patient.name,
      patientAge: patient.age,
      patientCpf: patient.cpf,
      procedure: a.procedure,
      room: a.room,
      status: 'Agendado'
    })
  })
  await batch.commit()
}

async function seedLeads() {
  const batch = db.batch()
  for (const { id, ...data } of LEADS) {
    batch.set(db.doc(`leads/${id}`), data)

    const messages =
      id === 'l1'
        ? L1_MESSAGES
        : [
            {
              from: 'clinica',
              minutesAfter: 0,
              text: `Olá, ${data.name.split(' ')[0]}! Vi seu interesse em ${data.interest.toLowerCase()}. Posso te ajudar com alguma dúvida?`
            }
          ]
    messages.forEach((m, idx) => {
      const createdAt = Timestamp.fromMillis(data.createdAt.toMillis() + m.minutesAfter * 60_000)
      const msg = { from: m.from, text: m.text, createdAt }
      if (m.attachment) msg.attachment = m.attachment
      batch.set(db.doc(`leads/${id}/messages/m${idx + 1}`), msg)
    })
  }
  await batch.commit()
}

async function seedFinance() {
  const batch = db.batch()
  for (const { id, ...data } of PAYMENTS) batch.set(db.doc(`payments/${id}`), data)
  for (const { id, ...data } of COMMISSIONS) batch.set(db.doc(`commissions/${id}`), data)
  await batch.commit()
}

async function main() {
  console.log(`Populando emuladores (projeto ${PROJECT_ID})...`)
  for (const c of ['users', 'patients', 'appointments', 'leads', 'payments', 'commissions']) {
    await clearCollection(c)
  }
  await seedUsers()
  await seedPatients()
  await seedAppointments()
  await seedLeads()
  await seedFinance()
  console.log('Pronto. Login: admin@afrodite.com / 123456')
}

main().catch((err) => {
  if (String(err?.message || err).includes('ECONNREFUSED')) {
    console.error('Não foi possível conectar aos emuladores. Rode `npm run emulators` em outro terminal antes.')
  } else {
    console.error(err)
  }
  process.exit(1)
})
