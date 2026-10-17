import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Card, CardActionArea, Button, Stack, Skeleton } from '@mui/material'
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import InsightCard from '../../components/InsightCard.jsx'
import InfoField from '../../components/InfoField.jsx'
import ListCard from '../../components/ListCard.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import { HeaderIconButton } from '../../components/ScreenHeader.jsx'
import ProceduresList from './partials/ProceduresList.jsx'
import PhotosGallery from './partials/PhotosGallery.jsx'

const TABS = ['Resumo', 'Histórico', 'Procedimentos', 'Fotos']

export default function PatientProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
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
            phoneDigits && (
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
          error={patient.error}
              anamnese={anamnese.data}
              onVerAnamnese={() => navigate(`/pacientes/${id}/anamnese`)}
              onVerFotos={() => setTab(3)}
              onVerPrescricoes={() => navigate(`/pacientes/${id}/prescricoes`)}
            />
          )}
          {tab === 1 && <HistoricoTab state={procedures} />}
          {tab === 2 && <ProceduresList state={procedures} />}
          {tab === 3 && <PhotosGallery patientId={id} />}
        </>
      )}
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

function ResumoTab({ patient, anamnese, onVerAnamnese, onVerFotos, onVerPrescricoes }) {
  const toast = useToast()

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
          onClick={() => toast('Documentos chegam em breve.', { severity: 'info' })}
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

function HistoricoTab({ state }) {
  if (state.loading) return <ListSkeleton count={3} height={68} />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  if (state.data.length === 0) {
    return <EmptyState icon={<HistoryRoundedIcon />} title="Sem histórico" description="Nenhum atendimento registrado ainda." />
  }

  return (
    <Box sx={{ position: 'relative', pl: 3 }}>
      <Box sx={{ position: 'absolute', left: 7, top: 12, bottom: 12, width: 2, bgcolor: brand.blush, borderRadius: 1 }} />
      <Stack spacing={1.25}>
        {state.data.map((proc, idx) => (
          <Box key={proc.id} sx={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                left: -24,
                top: 22,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: idx === 0 ? brand.wine : brand.surface,
                border: `2px solid ${idx === 0 ? brand.wine : brand.roseLight}`
              }}
            />
            <ListCard
              index={idx}
              title={proc.name}
              subtitle={`${proc.date} • ${proc.area}`}
              trailing={<StatusChip status={proc.status} />}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
