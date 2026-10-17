import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Card, CardActionArea, Button, Stack, Skeleton } from '@mui/material'
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import AddCommentRoundedIcon from '@mui/icons-material/AddCommentRounded'
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import { formatCurrency } from '../../utils/format.js'
import StatusChip from '../../components/StatusChip.jsx'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import InsightCard from '../../components/InsightCard.jsx'
import InfoField from '../../components/InfoField.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import { HeaderIconButton } from '../../components/ScreenHeader.jsx'
import ProceduresList from './partials/ProceduresList.jsx'
import PhotosGallery from './partials/PhotosGallery.jsx'
import NewAppointmentSheet from '../agenda/NewAppointmentSheet.jsx'
import ActivityTimeline from '../../components/ActivityTimeline.jsx'
import LogContactSheet from '../../components/LogContactSheet.jsx'
import EditPatientSheet from './partials/EditPatientSheet.jsx'

const TABS = ['Resumo', 'Histórico', 'Procedimentos', 'Fotos']

export default function PatientProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState(0)
  const [scheduling, setScheduling] = useState(false)
  const [sheet, setSheet] = useState(null) // 'edit' | 'contact'
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const timeline = useAsync(() => afroditeApi.getPatientTimeline(id), [id])
  const finance = useAsync(() => afroditeApi.getPatientTransactions(id), [id])
  const anamnese = useAsync(() => afroditeApi.getPatientAnamnese(id), [id])
  const procedures = useAsync(() => afroditeApi.getPatientProcedures(id), [id])

  const phoneDigits = patient.data?.phone?.replace(/\D/g, '')

  return (
    <AppScreen
      header={
        <PatientHeader
          patient={patient.data}
          error={patient.error}
          title="Paciente"
          actions={
            patient.data && (
              <>
                {phoneDigits && (
                  <HeaderIconButton
                    aria-label="WhatsApp"
                    component="a"
                    href={`https://wa.me/55${phoneDigits}`}
                    target="_blank"
                    rel="noopener"
                    sx={{ color: '#1f9d55' }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 20 }} />
                  </HeaderIconButton>
                )}
                <HeaderIconButton aria-label="Editar paciente" onClick={() => setSheet('edit')}>
                  <EditRoundedIcon sx={{ fontSize: 19 }} />
                </HeaderIconButton>
              </>
            )
          }
        >
          <SectionTabs value={tab} onChange={setTab} items={TABS} />
        </PatientHeader>
      }
    >
      {patient.error ? (
        <ErrorState error={patient.error} onRetry={patient.reload} />
      ) : (
        <>
          {tab === 0 && (
            <ResumoTab
              patient={patient.data}
              anamnese={anamnese.data}
              onVerLead={() => navigate(`/leads/${patient.data.leadId}`)}
              finance={finance.data}
              onVerFinanceiro={() => navigate(`/financeiro?paciente=${id}`)}
              onVerAnamnese={() => navigate(`/pacientes/${id}/anamnese`)}
              onVerFotos={() => setTab(3)}
              onVerPrescricoes={() => navigate(`/pacientes/${id}/prescricoes`)}
              onVerDocumentos={() => navigate(`/pacientes/${id}/documentos`)}
              onAgendar={() => setScheduling(true)}
            />
          )}
          {tab === 1 && <RelationshipTab state={timeline} onLogContact={() => setSheet('contact')} />}
          {tab === 2 && <ProceduresList state={procedures} />}
          {tab === 3 && <PhotosGallery patientId={id} />}
        </>
      )}

      <NewAppointmentSheet
        open={scheduling}
        onClose={() => setScheduling(false)}
        patient={patient.data}
        onCreated={(appt) => {
          toast(`Agendado para ${appt.date.toLocaleDateString('pt-BR')} às ${appt.time}`)
          patient.reload()
          timeline.reload()
        }}
      />
      <EditPatientSheet
        open={sheet === 'edit'}
        onClose={() => setSheet(null)}
        patient={patient.data}
        onSaved={(updated) => {
          patient.setData(updated)
          timeline.reload()
          toast('Dados atualizados')
        }}
      />
      <LogContactSheet
        open={sheet === 'contact'}
        onClose={() => setSheet(null)}
        target="patients"
        id={id}
        onSaved={() => {
          timeline.reload()
          toast('Contato registrado')
        }}
      />
    </AppScreen>
  )
}

function DateCard({ label, value, caption }) {
  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.8 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 650, fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    </Card>
  )
}

function QuickAction({ icon, label, onClick }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardActionArea onClick={onClick} sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
          {icon}
        </Box>
        <Typography variant="caption" fontWeight={600}>
          {label}
        </Typography>
      </CardActionArea>
    </Card>
  )
}

function ResumoTab({ patient, anamnese, finance, onVerFinanceiro, onVerLead, onVerAnamnese, onVerFotos, onVerPrescricoes, onVerDocumentos, onAgendar }) {

  if (!patient) {
    return (
      <Stack spacing={1.25}>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={130} />
        <Skeleton variant="rounded" height={90} />
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <DateCard label="Última consulta" value={patient.lastVisit} caption={patient.lastVisitLabel} />
        <DateCard label="Próximo retorno" value={patient.nextReturn} caption={patient.nextReturnLabel} />
      </Box>

      {patient.leadId && (
        <Card>
          <CardActionArea onClick={onVerLead} sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-start' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
              <PersonSearchRoundedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">Veio de lead{patient.source ? ` • ${patient.source}` : ''}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {patient.interest ? `Interesse: ${patient.interest}` : 'Ver histórico de captação'}
              </Typography>
            </Box>
            <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
          </CardActionArea>
        </Card>
      )}

      {finance && finance.items.length > 0 && (
        <Card>
          <CardActionArea onClick={onVerFinanceiro} sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-start' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
              <PaymentsRoundedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">Financeiro</Typography>
              <Typography variant="caption" color="text.secondary" component="div" noWrap>
                {formatCurrency(finance.paid, { cents: false })} pago • {formatCurrency(finance.pending, { cents: false })} em aberto
              </Typography>
            </Box>
            {finance.overdue > 0 && <StatusChip status="Atrasado" />}
            <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
          </CardActionArea>
        </Card>
      )}

      <Button fullWidth size="large" variant="outlined" startIcon={<EventAvailableRoundedIcon />} onClick={onAgendar}>
        Agendar atendimento
      </Button>

      <Card>
        <CardActionArea onClick={onVerAnamnese} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="subtitle2">Anamnese clínica</Typography>
            <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
          </Box>
          {anamnese ? (
            <Stack spacing={1.25}>
              <InfoField label="Queixa principal" value={anamnese.queixaPrincipal} />
              <InfoField label="Alergias" value={anamnese.alergias} />
            </Stack>
          ) : (
            <Skeleton height={60} />
          )}
        </CardActionArea>
      </Card>

      <Stack direction="row" spacing={1.25}>
        <QuickAction icon={<PhotoLibraryRoundedIcon />} label="Fotos" onClick={onVerFotos} />
        <QuickAction icon={<DescriptionRoundedIcon />} label="Prescrições" onClick={onVerPrescricoes} />
        <QuickAction
          icon={<FolderRoundedIcon />}
          label="Documentos"
          onClick={onVerDocumentos}
        />
      </Stack>

      <Box sx={{ pt: 1.25 }}>
        <InsightCard
          title="IA recomenda"
          text="Pode ser um bom momento para avaliar um novo protocolo de estímulo de colágeno."
          actionLabel="Ver prescrições"
          onAction={onVerPrescricoes}
        />
      </Box>
    </Stack>
  )
}

function RelationshipTab({ state, onLogContact }) {
  return (
    <>
      <Button fullWidth variant="contained" startIcon={<AddCommentRoundedIcon />} onClick={onLogContact} sx={{ mb: 2 }}>
        Registrar contato
      </Button>
      {state.loading && <ListSkeleton count={4} height={56} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}
      {state.data && state.data.length === 0 && (
        <EmptyState icon={<HistoryRoundedIcon />} title="Sem histórico" description="Contatos, agendamentos e procedimentos aparecem aqui." />
      )}
      {state.data && state.data.length > 0 && <ActivityTimeline items={state.data} />}
    </>
  )
}
