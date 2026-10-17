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
    nextReturnLabel: 'Pós procedimento',
    leadId: 'l6',
    source: 'Instagram',
    interest: 'Consulta de avaliação'
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
  { id: 'l1', name: 'Juliana Alves', phone: '(51) 99118-7777', email: 'juliana.alves@exemplo.com', interest: 'Protocolo de colágeno', status: 'Novo', source: 'Instagram', createdAt: hoursAgo(2, 10), proposalValue: 1900, downPayment: 0, notes: 'Perguntou sobre o protocolo de estímulo de colágeno visto no Instagram.', nextFollowUp: dateKey(0) },
  { id: 'l2', name: 'Tatiane Souza', phone: '(51) 98777-0066', interest: 'Toxina botulínica', status: 'Em contato', source: 'Indicação', createdAt: hoursAgo(5, 30), proposalValue: 2800, downPayment: 500, notes: 'Indicada por uma paciente atual.', nextFollowUp: dateKey(-1) },
  { id: 'l3', name: 'Carla Martins', phone: '(51) 99866-5555', interest: 'Skinbooster', status: 'Qualificado', source: 'Site', createdAt: hoursAgo(20), proposalValue: 680, downPayment: 0, notes: '', nextFollowUp: dateKey(2) },
  { id: 'l4', name: 'Fernanda Lima', phone: '(51) 99165-4444', interest: 'Tratamento facial completo', status: 'Proposta', source: 'WhatsApp', createdAt: hoursAgo(30), proposalValue: 3200, downPayment: 1000, notes: 'Proposta enviada, aguardando retorno.', nextFollowUp: dateKey(0) },
  { id: 'l5', name: 'Patrícia Nunes', phone: '(51) 99321-8080', interest: 'Bioestimulador de colágeno', status: 'Proposta', source: 'Instagram', createdAt: hoursAgo(52), proposalValue: 2400, downPayment: 0, notes: 'Pediu parcelamento em 3x.', nextFollowUp: dateKey(-3) },
  { id: 'l6', name: 'Beatriz Lima', phone: '(51) 99345-6789', interest: 'Consulta de avaliação', status: 'Convertido', source: 'Instagram', createdAt: hoursAgo(24 * 45), proposalValue: 450, downPayment: 450, notes: 'Convertida — já é paciente ativa.', nextFollowUp: null, patientId: 'p5' },
  { id: 'l7', name: 'Renata Prado', phone: '(51) 99777-3131', interest: 'Lipo de papada enzimática', status: 'Perdido', source: 'Google', createdAt: hoursAgo(24 * 12), proposalValue: 1500, downPayment: 0, notes: '', nextFollowUp: null, lostReason: 'Preço' }
]

// Histórico de relacionamento (atividades) — horas atrás em relação a agora
const LEAD_ACTIVITIES = {
  l1: [{ type: 'criado', text: 'Lead cadastrado • origem: Instagram', hours: 2.2 }],
  l2: [
    { type: 'criado', text: 'Lead cadastrado • origem: Indicação', hours: 5.5 },
    { type: 'ligacao', label: 'Ligação', text: 'Conversamos sobre toxina; quer agendar após o dia 20.', hours: 5 },
    { type: 'status', text: 'Movido de "Novo" para "Em contato"', hours: 5 }
  ],
  l3: [
    { type: 'criado', text: 'Lead cadastrado • origem: Site', hours: 20 },
    { type: 'whatsapp', label: 'WhatsApp', text: 'Enviou fotos da pele; boa candidata a skinbooster.', hours: 18 },
    { type: 'status', text: 'Movido de "Em contato" para "Qualificado"', hours: 17 }
  ],
  l4: [
    { type: 'criado', text: 'Lead cadastrado • origem: WhatsApp', hours: 30 },
    { type: 'visita', label: 'Visita', text: 'Veio à clínica para avaliação; proposta de tratamento completo.', hours: 26 },
    { type: 'proposta', text: 'Proposta atualizada para R$ 3.200,00', hours: 25 },
    { type: 'status', text: 'Movido de "Qualificado" para "Proposta"', hours: 25 }
  ],
  l5: [
    { type: 'criado', text: 'Lead cadastrado • origem: Instagram', hours: 52 },
    { type: 'nota', label: 'Nota', text: 'Pediu parcelamento em 3x sem juros.', hours: 48 }
  ],
  l6: [
    { type: 'criado', text: 'Lead cadastrado • origem: Instagram', hours: 24 * 45 },
    { type: 'ligacao', label: 'Ligação', text: 'Agendou avaliação.', hours: 24 * 44 },
    { type: 'conversao', text: 'Convertido em paciente', hours: 24 * 40 }
  ],
  l7: [
    { type: 'criado', text: 'Lead cadastrado • origem: Google', hours: 24 * 12 },
    { type: 'perdido', text: 'Marcado como perdido • motivo: Preço', hours: 24 * 8 }
  ]
}

const PATIENT_ACTIVITIES = {
  p1: [
    { type: 'whatsapp', label: 'WhatsApp', text: 'Confirmou o retorno pós-procedimento.', hours: 24 * 3 },
    { type: 'nota', label: 'Nota', text: 'Prefere horários no fim da tarde.', hours: 24 * 20 }
  ],
  p5: [{ type: 'conversao', text: 'Paciente originada de lead • Instagram • Consulta de avaliação', hours: 24 * 40, leadId: 'l6' }]
}

const L1_MESSAGES = [
  { from: 'clinica', minutesAfter: 0, text: 'Olá, Juliana! Aqui é da equipe da Dra. Bárbara. Vi que você se interessou pelo protocolo de colágeno. Posso te ajudar com alguma dúvida?' },
  { from: 'lead', minutesAfter: 7, text: 'Oi! Tenho sim algumas dúvidas sobre o procedimento e os valores.' },
  { from: 'clinica', minutesAfter: 10, text: 'Claro! Vou te enviar todo o material com as informações e já deixo um horário reservado para uma avaliação, pode ser?' },
  { from: 'clinica', minutesAfter: 11, text: 'Protocolo de Colágeno.pdf', attachment: { name: 'Protocolo de Colágeno.pdf', size: '2.4MB' } }
]

// ---- Financeiro (coleção `transactions`) ----
// Seis meses de receitas e despesas. No mês atual, o que vence depois de
// hoje fica pendente; há recebimentos atrasados e um parcelamento.

function monthDate(offset, day) {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const INCOME_TEMPLATE = [
  { day: 2, patientId: 'p1', description: 'Toxina botulínica', category: 'Procedimento', amount: 2800, method: 'Cartão de crédito' },
  { day: 4, patientId: 'p2', description: 'Consulta de avaliação', category: 'Consulta', amount: 450, method: 'Pix' },
  { day: 7, patientId: 'p3', description: 'Preenchimento labial', category: 'Procedimento', amount: 1900, method: 'Pix' },
  { day: 10, patientId: 'p5', description: 'Skinbooster', category: 'Procedimento', amount: 1360, method: 'Cartão de débito' },
  { day: 13, patientId: 'p4', description: 'Pacote limpeza de pele (4 sessões)', category: 'Pacote', amount: 1200, method: 'Pix' },
  { day: 17, patientId: 'p2', description: 'Bioestimulador de colágeno', category: 'Procedimento', amount: 2400, method: 'Cartão de crédito' },
  { day: 21, patientId: 'p6', description: 'Dermocosméticos', category: 'Produto', amount: 380, method: 'Dinheiro' },
  { day: 24, patientId: 'p1', description: 'Retorno + ajuste', category: 'Consulta', amount: 300, method: 'Pix' },
  { day: 27, patientId: 'p3', description: 'Toxina botulínica', category: 'Procedimento', amount: 2800, method: 'Cartão de crédito' },
  { day: 3, patientId: 'p5', description: 'Pacote bioestimulador (3 sessões)', category: 'Pacote', amount: 3600, method: 'Cartão de crédito' },
  { day: 8, patientId: 'p1', description: 'Fios de PDO', category: 'Procedimento', amount: 3200, method: 'Pix' },
  { day: 14, patientId: 'p6', description: 'Microagulhamento', category: 'Procedimento', amount: 1500, method: 'Cartão de débito' }
]
// Crescimento leve mês a mês (índice 0 = 5 meses atrás)
const MONTH_FACTOR = [0.78, 0.84, 0.9, 0.86, 0.95, 1]
const EXPENSE_TEMPLATE = [
  { day: 5, description: 'Aluguel da clínica', category: 'Aluguel', amount: 4500, method: 'Boleto' },
  { day: 5, description: 'Folha de pagamento', category: 'Salários', amount: 6200, method: 'Transferência' },
  { day: 10, description: 'Água, luz e internet', category: 'Contas e serviços', amount: 640, method: 'Boleto' },
  { day: 12, description: 'Insumos (ácido hialurônico e toxina)', category: 'Insumos', amount: 2300, method: 'Pix' },
  { day: 15, description: 'Anúncios Instagram', category: 'Marketing', amount: 900, method: 'Cartão de crédito' },
  { day: 20, description: 'Simples Nacional', category: 'Impostos', amount: 1100, method: 'Boleto' }
]

function buildTransactions() {
  const today = dateKey(0)
  const name = (pid) => PATIENTS.find((p) => p.id === pid).name
  const list = []
  const add = (t) => {
    const paid = t.paid ?? t.dueDate <= today
    list.push({
      type: t.type,
      description: t.description,
      category: t.category,
      amount: Math.round(t.amount * 100) / 100,
      dueDate: t.dueDate,
      paidDate: paid ? t.paidDate || t.dueDate : null,
      status: paid ? 'Pago' : 'Pendente',
      method: paid ? t.method || null : t.method || null,
      monthKey: (paid ? t.paidDate || t.dueDate : t.dueDate).slice(0, 7),
      patientId: t.patientId || null,
      patientName: t.patientId ? name(t.patientId) : null,
      appointmentId: null,
      groupId: t.groupId || null,
      installment: t.installment || null,
      notes: ''
    })
  }
  for (let offset = -5; offset <= 0; offset++) {
    const factor = MONTH_FACTOR[offset + 5]
    INCOME_TEMPLATE.forEach((t, idx) => {
      // meses anteriores têm um pouco menos de atendimentos
      if (factor < 0.9 && idx % 4 === 3) return
      add({ ...t, type: 'receita', amount: Math.round((t.amount * (0.9 + factor / 10)) / 10) * 10, dueDate: monthDate(offset, t.day) })
    })
    EXPENSE_TEMPLATE.forEach((t) => {
      const variance = t.category === 'Insumos' ? factor : 1
      add({ ...t, type: 'despesa', amount: Math.round(t.amount * variance), dueDate: monthDate(offset, t.day) })
    })
  }
  // Recebimentos em atraso
  add({ type: 'receita', description: 'Avaliação + protocolo', category: 'Procedimento', amount: 1200, dueDate: dateKey(-10), paid: false, patientId: 'p4', method: 'Boleto' })
  add({ type: 'receita', description: 'Sessão de skinbooster', category: 'Procedimento', amount: 680, dueDate: dateKey(-4), paid: false, patientId: 'p5', method: 'Pix' })
  // A receber no futuro
  add({ type: 'receita', description: 'Preenchimento — saldo', category: 'Procedimento', amount: 950, dueDate: dateKey(5), paid: false, patientId: 'p3' })
  // Parcelamento 3x (1ª paga hoje)
  ;[0, 1, 2].forEach((i) =>
    add({
      type: 'receita',
      description: `Protocolo de colágeno (${i + 1}/3)`,
      category: 'Pacote',
      amount: 975,
      dueDate: i === 0 ? dateKey(0) : monthDate(i, now.getDate()),
      paid: i === 0,
      patientId: 'p1',
      method: 'Cartão de crédito',
      groupId: 'grp-colageno-p1',
      installment: { n: i + 1, total: 3 }
    })
  )
  // A pagar: parcela de equipamento no próximo mês
  add({ type: 'despesa', description: 'Equipamento de radiofrequência (parcela)', category: 'Equipamentos', amount: 1450, dueDate: monthDate(1, 8), paid: false, method: 'Boleto' })
  return list
}

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
      status: 'Agendado',
      _seed: true
    })
  })
  await batch.commit()
}

async function seedLeads() {
  const batch = db.batch()
  for (const { id, ...data } of LEADS) {
    batch.set(db.doc(`leads/${id}`), { ...data, _seed: true })

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
      const msg = { from: m.from, text: m.text, createdAt, _seed: true }
      if (m.attachment) msg.attachment = m.attachment
      batch.set(db.doc(`leads/${id}/messages/m${idx + 1}`), msg)
    })
  }
  await batch.commit()
}

async function seedActivities() {
  const batch = db.batch()
  const write = (path, items) =>
    items.forEach(({ hours, ...a }, idx) =>
      batch.set(db.doc(`${path}/activities/a${idx + 1}`), {
        ...a,
        createdByName: 'Dra. Bárbara',
        createdBy: 'u-admin',
        createdAt: Timestamp.fromMillis(now.getTime() - hours * 3_600_000),
        _seed: true
      })
    )
  for (const [id, items] of Object.entries(LEAD_ACTIVITIES)) write(`leads/${id}`, items)
  for (const [id, items] of Object.entries(PATIENT_ACTIVITIES)) write(`patients/${id}`, items)
  await batch.commit()
}

async function seedFinance() {
  const items = buildTransactions()
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch()
    items.slice(i, i + 400).forEach((t, k) => batch.set(db.doc(`transactions/t${String(i + k + 1).padStart(3, '0')}`), { ...t, createdAt: Timestamp.now() }))
    await batch.commit()
  }
  await db.doc('settings/finance').set({ commissionRates: { Procedimento: 30, Pacote: 25, Consulta: 0, Produto: 10, Outro: 0 } })
}

// Algumas notificações de exemplo para a central não começar vazia
async function seedNotifications() {
  const items = [
    { type: 'lead', title: 'Novo lead: Juliana Alves', body: 'Protocolo de colágeno • via Instagram', link: '/leads/l1', minutesAgo: 130, read: false },
    { type: 'mensagem', title: 'Mensagem de Juliana Alves', body: 'Oi! Tenho sim algumas dúvidas sobre o procedimento e os valores.', link: '/leads/l1/whatsapp', minutesAgo: 123, read: false },
    { type: 'agendamento', title: 'Novo agendamento', body: `Rafaela Costa • ${dateKey(0).split('-').reverse().slice(0, 2).join('/')} às 16:30 — Protocolo de colágeno`, link: '/agenda/ag5', minutesAgo: 60 * 20, read: true }
  ]
  for (const u of USERS) {
    await db.recursiveDelete(db.collection(`users/${u.uid}/notifications`))
    const batch = db.batch()
    items.forEach(({ minutesAgo, ...n }, idx) => {
      batch.set(db.doc(`users/${u.uid}/notifications/n${idx + 1}`), {
        ...n,
        createdAt: Timestamp.fromMillis(now.getTime() - minutesAgo * 60_000)
      })
    })
    await batch.commit()
  }
}

async function main() {
  console.log(`Populando emuladores (projeto ${PROJECT_ID})...`)
  for (const c of ['users', 'patients', 'appointments', 'leads', 'payments', 'commissions', 'transactions', 'settings']) {
    await clearCollection(c)
  }
  await seedUsers()
  await seedPatients()
  await seedAppointments()
  await seedLeads()
  await seedActivities()
  await seedFinance()
  await seedNotifications()
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
