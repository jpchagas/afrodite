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

PATIENTS.push(
  {
    id: 'p7',
    name: 'Vanessa Ribeiro',
    age: 38,
    cpf: '555.666.777-88',
    phone: '(51) 99567-1234',
    status: 'Ativa',
    lastVisit: dateKey(-115),
    lastVisitLabel: 'Toxina botulínica',
    nextReturn: null,
    nextReturnLabel: 'A agendar'
  },
  {
    id: 'p8',
    name: 'Aline Barros',
    age: 29,
    cpf: '666.777.888-99',
    phone: '(51) 99678-2345',
    status: 'Ativa',
    lastVisit: dateKey(-35),
    lastVisitLabel: 'Skinbooster',
    nextReturn: null,
    nextReturnLabel: 'A agendar'
  }
)

const ANAMNESE = {
  p1: {
    queixaPrincipal: 'Melhorar a qualidade da pele e prevenção de linhas de expressão.',
    historicoMedico: 'Sem comorbidades.',
    alergias: 'Nega.',
    medicamentos: 'Anticoncepcional oral.',
    procedimentosAnteriores: 'Bioestimulador de colágeno (2024).',
    observacoes: '',
    flags: {},
    fitzpatrick: 'III'
  },
  p3: {
    queixaPrincipal: 'Volume e contorno labial.',
    historicoMedico: 'Hipotireoidismo controlado.',
    alergias: 'Dipirona',
    medicamentos: 'Levotiroxina 50 mcg.',
    procedimentosAnteriores: 'Preenchimento labial (2023).',
    observacoes: 'Fazer profilaxia antiviral antes de procedimentos labiais.',
    flags: { herpes: true },
    fitzpatrick: 'II'
  },
  p4: {
    queixaPrincipal: 'Manchas e textura da pele no pós-parto.',
    historicoMedico: 'Parto há 4 meses.',
    alergias: 'Nega.',
    medicamentos: '',
    procedimentosAnteriores: '',
    observacoes: 'Aguardar fim da amamentação para toxina e ácidos.',
    flags: { lactante: true },
    fitzpatrick: 'IV'
  }
}

// Mesmo critério de clinicalAlerts() no app (resumo gravado na ficha)
const FLAG_LABELS = { herpes: 'Histórico de herpes', lactante: 'Lactante', gestante: 'Gestante', anticoagulante: 'Usa anticoagulante' }
for (const [pid, a] of Object.entries(ANAMNESE)) {
  const alerts = []
  if (a.alergias && !/^\s*(n[aã]o|nega|nenhum)/i.test(a.alergias)) alerts.push(`Alergia: ${a.alergias.replace(/\.$/, '')}`)
  for (const [k, v] of Object.entries(a.flags)) if (v) alerts.push(FLAG_LABELS[k])
  PATIENTS.find((p) => p.id === pid).clinicalAlerts = alerts
}

const PROCEDURES = {
  p1: [
    { id: 'pr1', name: 'Toxina botulínica', date: dateKey(-25), area: 'Glabela, frontal e periocular', product: 'Botox® 100U', lot: 'C7543C3', quantity: 50, unit: 'U', technique: '5 pontos glabela, 6 frontal, 3 por lado periocular.', postCare: 'Não deitar por 4h; evitar atividade física por 24h.', status: 'Concluído', professional: 'Dra. Bárbara' },
    { id: 'pr2', name: 'Preenchimento labial', date: dateKey(-95), area: 'Lábios', product: 'Juvéderm® Volbella', lot: 'V30A2154', quantity: 1, unit: 'seringa(s)', technique: 'Cânula 25G, contorno e projeção.', postCare: 'Compressa fria nas primeiras 24h.', status: 'Concluído', professional: 'Dra. Bárbara' },
    { id: 'pr3', name: 'Bioestimulador de colágeno', date: dateKey(-270), area: 'Face', product: 'Sculptra®', lot: 'SC2209', quantity: 1, unit: 'ampola(s)', status: 'Concluído', professional: 'Dra. Bárbara' },
    { id: 'pr4', name: 'Skinbooster', date: dateKey(-370), area: 'Rosto', status: 'Concluído' },
    { id: 'pr5', name: 'Protocolo de colágeno', date: dateKey(0), area: 'Face', status: 'Em andamento' }
  ],
  p3: [
    { id: 'pr1', name: 'Preenchimento labial', date: dateKey(-30), area: 'Lábios', product: 'Restylane® Kysse', lot: 'RK11872', quantity: 1, unit: 'seringa(s)', status: 'Concluído', professional: 'Dra. Bárbara' }
  ],
  p7: [
    { id: 'pr1', name: 'Toxina botulínica', date: dateKey(-115), area: 'Glabela e frontal', product: 'Dysport® 300U', lot: 'D20331', quantity: 60, unit: 'U', status: 'Concluído', professional: 'Dra. Bárbara' },
    { id: 'pr2', name: 'Preenchimento labial', date: dateKey(-300), area: 'Lábios', product: 'Juvéderm® Volbella', lot: 'V29B1101', quantity: 1, unit: 'seringa(s)', status: 'Concluído', professional: 'Dra. Bárbara' }
  ],
  p8: [
    { id: 'pr1', name: 'Skinbooster', date: dateKey(-35), area: 'Face e pescoço', product: 'Profhilo®', lot: 'PH4410', quantity: 2, unit: 'ml', status: 'Concluído', professional: 'Dra. Bárbara' }
  ]
}

const EVOLUTIONS = {
  p1: [
    { id: 'e1', date: dateKey(-10), text: 'Retorno 15 dias pós-toxina: resultado simétrico, sem intercorrências. Paciente satisfeita.', createdByName: 'Dra. Bárbara' },
    { id: 'e2', date: dateKey(-80), text: 'Retorno pós-preenchimento: leve edema residual à esquerda, orientada compressa fria. Reavaliar em 15 dias.', createdByName: 'Dra. Bárbara' }
  ]
}

// ---- Acompanhamento e marketing ----

// Aniversários: Camila faz aniversário hoje; Letícia ainda neste mês
const BIRTHDAYS = {
  p1: '1994-03-12',
  p2: `1998-${dateKey(0).slice(5)}`,
  p3: '1986-07-02',
  p6: `1999-${dateKey(0).slice(5, 7)}-${dateKey(0).slice(8) < '28' ? '28' : '01'}`,
  p7: '1988-11-20'
}
for (const [pid, birthDate] of Object.entries(BIRTHDAYS)) PATIENTS.find((p) => p.id === pid).birthDate = birthDate

const CARE_TASKS = [
  { id: 'ct1', type: 'checkin', title: 'Check-in pós Preenchimento labial', patientId: 'p3', procedureName: 'Preenchimento labial', postCare: 'Compressa fria nas primeiras 24h; evitar beijar e maquiagem nos lábios por 24h.', dueDate: dateKey(-1) },
  { id: 'ct2', type: 'retorno', title: 'Confirmar retorno • Toxina botulínica', patientId: 'p1', procedureName: 'Toxina botulínica', dueDate: dateKey(0) },
  { id: 'ct3', type: 'manutencao', title: 'Manutenção de Toxina botulínica', patientId: 'p7', procedureName: 'Toxina botulínica', dueDate: dateKey(-2) },
  { id: 'ct4', type: 'reativacao', title: 'Reativar Letícia', patientId: 'p6', dueDate: dateKey(0), source: 'automacao' },
  { id: 'ct5', type: 'manutencao', title: 'Manutenção de Skinbooster', patientId: 'p8', procedureName: 'Skinbooster', dueDate: dateKey(3) },
  { id: 'ct6', type: 'personalizado', title: 'Enviar fotos de 30 dias', patientId: 'p1', dueDate: dateKey(6), notes: 'Comparar com as fotos de antes.' },
  { id: 'ct7', type: 'checkin', title: 'Check-in pós Skinbooster', patientId: 'p8', procedureName: 'Skinbooster', dueDate: dateKey(-34), status: 'Concluído', outcome: 'ok', resultNote: 'Sem vermelhidão, adorou o resultado.', channel: 'whatsapp', completedDaysAgo: 34 }
]

const CAMPAIGNS = [
  {
    id: 'cmp1',
    name: 'Reativação de primavera',
    segment: { type: 'inativas', params: { days: 90 } },
    message: 'Olá, {primeiro_nome}! Sentimos sua falta por aqui 💕 Que tal agendar uma avaliação? Esta semana temos horários especiais para você.',
    status: 'Concluída',
    sentDaysAgo: 10,
    recipients: [
      { kind: 'patient', id: 'p2', status: 'enviado' },
      { kind: 'patient', id: 'p7', status: 'enviado' },
      { kind: 'patient', id: 'p6', status: 'pulado' }
    ]
  }
]

// ---- Vendas ----
const CATALOG = [
  { id: 'c01', name: 'Toxina botulínica', category: 'Procedimento', price: 2800, durationMin: 30, maintenanceDays: 120 },
  { id: 'c02', name: 'Preenchimento labial', category: 'Procedimento', price: 1900, durationMin: 60, maintenanceDays: 270 },
  { id: 'c03', name: 'Skinbooster', category: 'Procedimento', price: 680, durationMin: 45, maintenanceDays: 30 },
  { id: 'c04', name: 'Bioestimulador de colágeno', category: 'Procedimento', price: 2400, durationMin: 60, maintenanceDays: 90 },
  { id: 'c05', name: 'Fios de PDO', category: 'Procedimento', price: 3200, durationMin: 60, maintenanceDays: 180 },
  { id: 'c06', name: 'Microagulhamento', category: 'Procedimento', price: 500, durationMin: 60, maintenanceDays: 30 },
  { id: 'c07', name: 'Protocolo de colágeno', category: 'Procedimento', price: 2925, durationMin: 60, maintenanceDays: 90 },
  { id: 'c08', name: 'Consulta de avaliação', category: 'Consulta', price: 450, durationMin: 45 },
  { id: 'c09', name: 'Pacote bioestimulador (3 sessões)', category: 'Pacote', price: 6000, sessions: 3, durationMin: 60 },
  { id: 'c10', name: 'Pacote limpeza de pele (4 sessões)', category: 'Pacote', price: 900, sessions: 4, durationMin: 60 },
  { id: 'c11', name: 'Kit dermocosméticos pós-procedimento', category: 'Produto', price: 380 }
]

const QUOTES = [
  {
    id: 'qFERNANDA1', leadId: 'l4', clientName: 'Fernanda Lima', clientPhone: '(51) 99165-4444', status: 'Enviado', sentDaysAgo: 5,
    items: [
      { catalogId: 'c01', name: 'Toxina botulínica', category: 'Procedimento', qty: 1, unitPrice: 2800, sessions: 1 },
      { catalogId: 'c03', name: 'Skinbooster', category: 'Procedimento', qty: 1, unitPrice: 680, sessions: 1 }
    ],
    discount: 280, installments: 3, validDays: 10, notes: 'Inclui retorno de 15 dias sem custo.'
  },
  {
    id: 'qPATRICIA1', leadId: 'l5', clientName: 'Patrícia Nunes', clientPhone: '(51) 99321-8080', status: 'Rascunho',
    items: [{ catalogId: 'c09', name: 'Pacote bioestimulador (3 sessões)', category: 'Pacote', qty: 1, unitPrice: 6000, sessions: 3 }],
    discount: 600, installments: 6, validDays: 15, notes: ''
  },
  {
    id: 'qRAFAELA1', patientId: 'p1', clientName: 'Rafaela Costa', clientPhone: '(51) 99876-5432', status: 'Aprovado', sentDaysAgo: 30, decidedDaysAgo: 28,
    items: [{ catalogId: 'c09', name: 'Pacote bioestimulador (3 sessões)', category: 'Pacote', qty: 1, unitPrice: 6000, sessions: 3 }],
    discount: 0, installments: 3, validDays: -10, notes: ''
  },
  {
    id: 'qCAMILA1', patientId: 'p2', clientName: 'Camila Rocha', clientPhone: '(51) 98877-6544', status: 'Recusado', sentDaysAgo: 12, decidedDaysAgo: 9, rejectReason: 'Preço',
    items: [{ catalogId: 'c05', name: 'Fios de PDO', category: 'Procedimento', qty: 1, unitPrice: 3200, sessions: 1 }],
    discount: 0, installments: 1, validDays: 3, notes: ''
  }
]

const PACKAGES = {
  p1: [{ id: 'pk1', name: 'Pacote bioestimulador (3 sessões)', totalSessions: 3, usedSessions: 1, usage: [{ date: dateKey(-20), appointmentId: null }], quoteId: 'qRAFAELA1', catalogId: 'c09' }]
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
    batch.set(db.doc(`patients/${pid}/anamnese/main`), { ...data, updatedAt: hoursAgo(24 * 30), updatedBy: "u-admin", updatedByName: "Dra. Bárbara" })
  }
  for (const [pid, list] of Object.entries(PROCEDURES)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/procedures/${id}`), data)
  }
  for (const [pid, list] of Object.entries(EVOLUTIONS)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/evolutions/${id}`), { ...data, createdAt: Timestamp.now() })
  }
  for (const [pid, list] of Object.entries(PACKAGES)) {
    for (const { id, ...data } of list) batch.set(db.doc(`patients/${pid}/packages/${id}`), { ...data, createdAt: Timestamp.now() })
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
      createdAt: Timestamp.fromMillis(now.getTime() - (a.patientId === 'p2' && a.day === 1 ? 5 : 30) * 86_400_000),
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

async function seedSales() {
  const batch = db.batch()
  for (const { id, ...c } of CATALOG) {
    batch.set(db.doc(`catalog/${id}`), { sessions: 1, maintenanceDays: null, durationMin: null, description: '', active: true, ...c, createdAt: Timestamp.now() })
  }
  for (const { id, sentDaysAgo, decidedDaysAgo, validDays, ...q } of QUOTES) {
    const subtotal = q.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    batch.set(db.doc(`quotes/${id}`), {
      leadId: null,
      patientId: null,
      rejectReason: null,
      appointmentId: null,
      ...q,
      subtotal,
      total: subtotal - q.discount,
      validUntil: dateKey(validDays),
      sentAt: sentDaysAgo != null ? hoursAgo(24 * sentDaysAgo) : null,
      decidedAt: decidedDaysAgo != null ? hoursAgo(24 * decidedDaysAgo) : null,
      createdBy: 'u-admin',
      createdAt: hoursAgo(24 * ((sentDaysAgo ?? 0) + 1))
    })
  }
  await batch.commit()
}

async function seedCareAndMarketing() {
  const batch = db.batch()
  const person = (pid) => PATIENTS.find((p) => p.id === pid)
  for (const { id, completedDaysAgo, ...t } of CARE_TASKS) {
    const p = person(t.patientId)
    batch.set(db.doc(`careTasks/${id}`), {
      status: 'Pendente',
      source: 'procedimento',
      notes: '',
      outcome: null,
      procedureName: null,
      postCare: '',
      ...t,
      patientName: p.name,
      phone: p.phone,
      completedAt: completedDaysAgo != null ? hoursAgo(24 * completedDaysAgo) : null,
      completedByName: completedDaysAgo != null ? 'Dra. Bárbara' : null,
      createdAt: hoursAgo(24 * 40)
    })
  }
  for (const { id, sentDaysAgo, recipients, ...c } of CAMPAIGNS) {
    batch.set(db.doc(`campaigns/${id}`), {
      ...c,
      channel: 'whatsapp',
      recipients: recipients.map((r, idx) => {
        const p = person(r.id)
        return {
          ...r,
          name: p.name,
          phone: p.phone,
          vars: { ultima_visita: '' },
          sentAt: r.status === 'enviado' ? hoursAgo(24 * sentDaysAgo - idx) : null
        }
      }),
      createdBy: 'u-admin',
      createdAt: hoursAgo(24 * sentDaysAgo + 1),
      startedAt: hoursAgo(24 * sentDaysAgo + 1)
    })
  }
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
  for (const c of ['users', 'patients', 'appointments', 'leads', 'payments', 'commissions', 'transactions', 'settings', 'catalog', 'quotes', 'careTasks', 'campaigns', 'automationRuns']) {
    await clearCollection(c)
  }
  await seedUsers()
  await seedPatients()
  await seedAppointments()
  await seedLeads()
  await seedActivities()
  await seedFinance()
  await seedSales()
  await seedCareAndMarketing()
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
