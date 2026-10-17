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
