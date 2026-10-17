// Lembretes de atendimento: avisa a equipe quando um atendimento agendado
// começa nos próximos LEAD_MINUTES minutos. Roda a cada 5 minutos.

import { db, notifyStaff } from './notify.js'

export const TIME_ZONE = 'America/Sao_Paulo'
const LEAD_MINUTES = 30

// Data ('YYYY-MM-DD') e minutos do dia no fuso da clínica
export function clinicNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  )
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  }
}

export async function sendDueReminders(now = new Date()) {
  const { dateKey, minutes } = clinicNow(now)
  const snap = await db
    .collection('appointments')
    .where('dateKey', '==', dateKey)
    .where('status', '==', 'Agendado')
    .get()

  const due = snap.docs.filter((d) => {
    const a = d.data()
    if (a.reminderSent) return false
    const [h, m] = a.time.split(':').map(Number)
    const startsIn = h * 60 + m - minutes
    return startsIn >= 0 && startsIn <= LEAD_MINUTES
  })

  for (const d of due) {
    const a = d.data()
    const [h, m] = a.time.split(':').map(Number)
    const startsIn = h * 60 + m - minutes
    // Marca antes de notificar para não repetir se a execução seguinte se sobrepuser
    await d.ref.update({ reminderSent: true })
    await notifyStaff({
      type: 'lembrete',
      title: startsIn <= 1 ? `${a.patientName} — agora` : `${a.patientName} em ${startsIn} min`,
      body: `${a.time} • ${a.procedure}${a.room ? ` • ${a.room.split(' •')[0]}` : ''}`,
      link: `/agenda/${d.id}`
    })
  }
  return due.length
}

// Próximo contato de leads: avisa a equipe uma vez no dia marcado, a partir
// das 8h (horário da clínica).
const OPEN_STAGES = ['Novo', 'Em contato', 'Qualificado', 'Proposta']
const FOLLOW_UP_HOUR = 8

export async function sendFollowUpReminders(now = new Date()) {
  const { dateKey, minutes } = clinicNow(now)
  if (minutes < FOLLOW_UP_HOUR * 60) return 0
  const snap = await db.collection('leads').where('nextFollowUp', '==', dateKey).get()
  const due = snap.docs.filter((d) => {
    const l = d.data()
    return OPEN_STAGES.includes(l.status) && l.followUpNotified !== dateKey
  })
  for (const d of due) {
    const l = d.data()
    await d.ref.update({ followUpNotified: dateKey })
    await notifyStaff({
      type: 'followup',
      title: `Retomar contato: ${l.name}`,
      body: [l.interest, l.status].filter(Boolean).join(' • '),
      link: `/leads/${d.id}`
    })
  }
  return due.length
}
