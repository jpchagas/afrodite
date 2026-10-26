// Automações diárias (rodam uma vez por dia, a partir das 8h no horário da
// clínica, dentro do job agendado de 5 em 5 minutos):
// - aniversário: tarefa de parabéns no dia;
// - reativação: tarefa para pacientes sem visita há N dias e sem horário futuro;
// - leads sem contato há N dias e sem próximo contato entram em "Retomar hoje";
// - resumo do dia: notifica a equipe com os acompanhamentos pendentes.
// O envio das mensagens continua manual (WhatsApp) até a integração oficial.

import { FieldValue } from 'firebase-admin/firestore'
import { db, notifyStaff } from './notify.js'
import { clinicNow } from './reminders.js'

const DEFAULTS = {
  postProcedure: { enabled: true },
  birthday: { enabled: true },
  reactivation: { enabled: true, days: 120 },
  leadNoContact: { enabled: true, days: 3 }
}
const OPEN_STAGES = ['Novo', 'Em contato', 'Qualificado', 'Proposta']
const START_HOUR = 8

function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

// Cria o documento só se ainda não existir (IDs determinísticos evitam duplicar)
async function createOnce(ref, data) {
  try {
    await ref.create(data)
    return true
  } catch (err) {
    if (err.code === 6 || /already exists/i.test(err.message)) return false
    throw err
  }
}

export async function runDailyAutomations(now = new Date()) {
  const { dateKey, minutes } = clinicNow(now)
  if (minutes < START_HOUR * 60) return null
  // Trava do dia: só a primeira execução após as 8h segue
  if (!(await createOnce(db.doc(`automationRuns/${dateKey}`), { startedAt: FieldValue.serverTimestamp() }))) return null

  const snap = await db.doc('settings/automations').get()
  const cfg = Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, { ...v, ...((snap.exists && snap.data()[k]) || {}) }]))
  const result = { birthdays: 0, reactivations: 0, leads: 0, careDue: 0 }

  const [patientsSnap, futureSnap] = await Promise.all([
    db.collection('patients').get(),
    db.collection('appointments').where('dateKey', '>=', dateKey).get()
  ])
  const booked = new Set(futureSnap.docs.map((d) => d.data().patientId))
  const task = (p, extra) => ({
    patientId: p.id,
    patientName: p.data().name,
    phone: p.data().phone || '',
    status: 'Pendente',
    source: 'automacao',
    notes: '',
    dueDate: dateKey,
    createdAt: FieldValue.serverTimestamp(),
    ...extra
  })

  for (const p of patientsSnap.docs) {
    const data = p.data()
    if (cfg.birthday.enabled && data.birthDate?.slice(5) === dateKey.slice(5)) {
      const created = await createOnce(db.doc(`careTasks/bday-${p.id}-${dateKey.slice(0, 4)}`), task(p, { type: 'aniversario', title: `Aniversário de ${data.name.split(' ')[0]}` }))
      if (created) result.birthdays++
    }
    if (cfg.reactivation.enabled && data.lastVisit && data.lastVisit <= shiftDateKey(dateKey, -cfg.reactivation.days) && !booked.has(p.id)) {
      // Uma tarefa por "última visita": não repete enquanto ela não voltar
      const created = await createOnce(db.doc(`careTasks/react-${p.id}-${data.lastVisit}`), task(p, { type: 'reativacao', title: `Reativar ${data.name.split(' ')[0]}` }))
      if (created) result.reactivations++
    }
  }

  if (cfg.leadNoContact.enabled) {
    const cutoff = new Date(now.getTime() - cfg.leadNoContact.days * 86_400_000)
    const leads = await db.collection('leads').where('status', 'in', OPEN_STAGES).get()
    for (const l of leads.docs) {
      const data = l.data()
      const last = (data.lastContactAt || data.createdAt)?.toDate?.()
      // Só leads sem próximo contato definido: os com data passada já estão
      // em "Retomar" (e mantêm o selo de atraso); os com data futura, aguardam
      if (last && last < cutoff && !data.nextFollowUp) {
        await l.ref.update({ nextFollowUp: dateKey, followUpNotified: null })
        result.leads++
      }
    }
  }

  const pending = await db.collection('careTasks').where('status', '==', 'Pendente').get()
  result.careDue = pending.docs.filter((d) => d.data().dueDate <= dateKey).length
  if (result.careDue > 0) {
    await notifyStaff({
      type: 'cuidado',
      title: result.careDue === 1 ? '1 acompanhamento para hoje' : `${result.careDue} acompanhamentos para hoje`,
      body: 'Check-ins pós-procedimento, retornos e manutenções aguardando contato.',
      link: '/cuidados'
    })
  }
  await db.doc(`automationRuns/${dateKey}`).update({ ...result, finishedAt: FieldValue.serverTimestamp() })
  return result
}
