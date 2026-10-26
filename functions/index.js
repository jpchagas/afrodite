// Cloud Functions do Afrodite: geram as notificações da equipe a partir dos
// eventos do Firestore e enviam os lembretes de atendimento.
//
// Documentos com `_seed: true` (dados de demonstração do `npm run seed`)
// não geram notificações.

import { setGlobalOptions } from 'firebase-functions/options'
import { onDocumentCreated } from 'firebase-functions/firestore'
import { onSchedule } from 'firebase-functions/scheduler'
import { db, notifyStaff, formatDateKey, truncate } from './notify.js'
import { sendDueReminders, sendFollowUpReminders, TIME_ZONE } from './reminders.js'
import { runDailyAutomations } from './automations.js'

// Mesma região do Firestore (nam5)
setGlobalOptions({ region: 'us-central1', maxInstances: 5 })

export const onLeadCreated = onDocumentCreated('leads/{leadId}', async (event) => {
  const lead = event.data?.data()
  if (!lead || lead._seed) return
  await notifyStaff({
    type: 'lead',
    title: `Novo lead: ${lead.name}`,
    body: [lead.interest, lead.source && `via ${lead.source}`].filter(Boolean).join(' • '),
    link: `/leads/${event.params.leadId}`,
    exclude: lead.createdBy
  })
})

// Mensagens recebidas do lead (integração com WhatsApp); as enviadas pela
// clínica não notificam.
export const onLeadMessageCreated = onDocumentCreated('leads/{leadId}/messages/{messageId}', async (event) => {
  const message = event.data?.data()
  if (!message || message._seed || message.from !== 'lead') return
  const lead = (await db.doc(`leads/${event.params.leadId}`).get()).data()
  await notifyStaff({
    type: 'mensagem',
    title: `Mensagem de ${lead?.name || 'lead'}`,
    body: truncate(message.attachment ? `📎 ${message.attachment.name}` : message.text),
    link: `/leads/${event.params.leadId}/whatsapp`
  })
})

export const onAppointmentCreated = onDocumentCreated('appointments/{appointmentId}', async (event) => {
  const appt = event.data?.data()
  if (!appt || appt._seed) return
  await notifyStaff({
    type: 'agendamento',
    title: 'Novo agendamento',
    body: `${appt.patientName} • ${formatDateKey(appt.dateKey)} às ${appt.time} — ${appt.procedure}`,
    link: `/agenda/${event.params.appointmentId}`,
    exclude: appt.createdBy
  })
})

export const appointmentReminders = onSchedule(
  { schedule: 'every 5 minutes', timeZone: TIME_ZONE },
  async () => {
    await sendDueReminders()
    // Automações antes dos lembretes: leads sem contato entram em "Retomar hoje"
    await runDailyAutomations()
    await sendFollowUpReminders()
  }
)
