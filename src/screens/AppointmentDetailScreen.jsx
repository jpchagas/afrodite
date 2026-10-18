import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  Checkbox,
  FormControlLabel,
  Button,
  Stack,
  Skeleton,
  CircularProgress,
  ButtonBase
} from '@mui/material'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import RoomRoundedIcon from '@mui/icons-material/RoomRounded'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../theme/theme.js'
import { friendlyMessage } from '../utils/errors.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAsync } from '../hooks/useAsync.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatLongDate } from '../utils/format.js'
import AppScreen from '../components/AppScreen.jsx'
import PatientHeader from '../components/PatientHeader.jsx'
import StatusChip from '../components/StatusChip.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { ErrorState } from '../components/StateViews.jsx'
import TransactionFormSheet from './finance/TransactionFormSheet.jsx'
import { formatCurrency } from '../utils/format.js'
import ClinicalAlerts from '../components/ClinicalAlerts.jsx'
import ProcedureFormSheet from './patients/partials/ProcedureFormSheet.jsx'
import PackagesCard from './patients/partials/PackagesCard.jsx'
import QuoteEditorSheet from './sales/QuoteEditorSheet.jsx'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'

const PREP_ITEMS = [
  'Confirmar se a paciente está bem',
  'Reforçar orientações pré-procedimento',
  'Checar exames recentes'
]

// Próximo passo do atendimento a partir do status atual
const NEXT_STEP = {
  Agendado: { status: 'Em atendimento', label: 'Iniciar atendimento', icon: <PlayArrowRoundedIcon />, toast: 'Atendimento iniciado' },
  'Em atendimento': { status: 'Concluído', label: 'Finalizar atendimento', icon: <CheckRoundedIcon />, toast: 'Atendimento concluído' }
}

function Shortcut({ icon, label, onClick, disabled }) {
  return (
    <Card sx={{ flex: 1 }}>
      <ButtonBase
        onClick={onClick}
        disabled={disabled}
        sx={{ width: '100%', py: 1.75, flexDirection: 'column', gap: 0.75, opacity: disabled ? 0.45 : 1 }}
      >
        <Box sx={{ color: brand.rose, display: 'flex' }}>{icon}</Box>
        <Typography variant="caption" fontWeight={600}>
          {label}
        </Typography>
      </ButtonBase>
    </Card>
  )
}

export default function AppointmentDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [checked, setChecked] = useState({})
  const [saving, setSaving] = useState(false)
  const [charging, setCharging] = useState(false)
  const [recording, setRecording] = useState(false)
  const [quoting, setQuoting] = useState(false)

  const appt = useAsync(() => afroditeApi.getAppointment(id), [id])
  const patientId = appt.data?.patientId
  const patient = useAsync(
    () => (patientId ? afroditeApi.getPatient(patientId) : null),
    [patientId]
  )

  const charges = useAsync(() => afroditeApi.getAppointmentTransactions(id), [id])
  const procedures = useAsync(
    () => (patientId ? afroditeApi.getPatientProcedures(patientId).then((list) => list.filter((p) => p.appointmentId === id)) : null),
    [patientId, id]
  )
  const packages = useAsync(() => (patientId ? afroditeApi.getPatientPackages(patientId) : null), [patientId])
  const appointment = appt.data
  const next = appointment && NEXT_STEP[appointment.status]
  const chargeDefaults = appointment && {
    type: 'receita',
    description: appointment.procedure,
    category: /consulta|avalia|retorno/i.test(appointment.procedure) ? 'Consulta' : 'Procedimento',
    patient: { id: appointment.patientId, name: appointment.patientName },
    appointmentId: id
  }

  async function advanceStatus() {
    setSaving(true)
    try {
      const updated = await afroditeApi.updateAppointmentStatus(id, next.status)
      appt.setData(updated)
      toast(next.toast)
      // Ao finalizar sem cobrança registrada, já abre o lançamento
      // Ao finalizar: primeiro o registro clínico, depois a cobrança
      if (next.status === 'Concluído') {
        if (procedures.data && procedures.data.length === 0) setRecording(true)
        else if (charges.data && charges.data.length === 0) setCharging(true)
      }
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar o atendimento'), { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen header={<PatientHeader patient={patient.data} error={appt.error || patient.error} hideAlerts title="Agendamento" />}>
      {appt.error && <ErrorState error={appt.error} onRetry={appt.reload} />}

      {appt.loading && (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      )}

      {appointment && (
        <>
          {patient.data?.clinicalAlerts?.length > 0 && <ClinicalAlerts alerts={patient.data.clinicalAlerts} sx={{ mb: 1.25 }} />}
          <Card sx={{ p: 2.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="h5" component="h2">
                {appointment.procedure}
              </Typography>
              <StatusChip status={appointment.status} />
            </Box>
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EventRoundedIcon fontSize="small" sx={{ color: brand.rose }} />
                <Typography variant="body2">
                  {formatLongDate(appointment.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  {' • '}
                  {appointment.durationLabel || appointment.time}
                </Typography>
              </Stack>
              {appointment.room && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <RoomRoundedIcon fontSize="small" sx={{ color: brand.rose }} />
                  <Typography variant="body2" color="text.secondary">
                    {appointment.room}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Card>

          <Stack direction="row" spacing={1.25} sx={{ mt: 1.25 }}>
            <Shortcut
              icon={<AssignmentRoundedIcon />}
              label="Anamnese"
              onClick={() => navigate(`/pacientes/${appointment.patientId}/anamnese`)}
            />
            <Shortcut icon={<ScienceRoundedIcon />} label="Exames" disabled />
            <Shortcut
              icon={<HistoryRoundedIcon />}
              label="Histórico"
              onClick={() => navigate(`/pacientes/${appointment.patientId}`)}
            />
          </Stack>

          <SectionTitle>Prontuário do atendimento</SectionTitle>
          {procedures.data && procedures.data.length > 0 ? (
            <Stack spacing={1.25}>
              {procedures.data.map((p) => (
                <Card key={p.id}>
                  <ButtonBase
                    onClick={() => navigate(`/pacientes/${appointment.patientId}`)}
                    sx={{ width: '100%', p: 2, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
                  >
                    <Box sx={{ width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
                      <SpaRoundedIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2">{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" component="div" noWrap>
                        {[p.area, p.product, p.lot && `lote ${p.lot}`].filter(Boolean).join(' • ') || 'Registrado no prontuário'}
                      </Typography>
                    </Box>
                    <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
                  </ButtonBase>
                </Card>
              ))}
            </Stack>
          ) : (
            <Button fullWidth size="large" variant="outlined" startIcon={<SpaRoundedIcon />} onClick={() => setRecording(true)} disabled={!procedures.data}>
              Registrar procedimento
            </Button>
          )}

          {packages.data?.some((p) => p.remaining > 0) && (
            <Box sx={{ mt: 1.25 }}>
              <PackagesCard
                patientId={appointment.patientId}
                packages={packages.data.filter((p) => p.remaining > 0 || (p.usage || []).some((u) => u.appointmentId === id))}
                onChange={(list) => packages.setData((prev) => prev.map((p) => list.find((x) => x.id === p.id) || p))}
                appointmentId={id}
              />
            </Box>
          )}

          <SectionTitle>Cobrança</SectionTitle>
          {charges.data && charges.data.length > 0 ? (
            <Card>
              <ButtonBase
                onClick={() => navigate(`/financeiro?paciente=${appointment.patientId}`)}
                sx={{ width: '100%', p: 2, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
                  <PaymentsRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">
                    {formatCurrency(charges.data.reduce((s, t) => s + t.amount, 0))}
                    {charges.data.length > 1 ? ` em ${charges.data.length} parcelas` : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                    {[...new Set(charges.data.map((t) => t.displayStatus))].map((s) => (
                      <StatusChip key={s} status={s} />
                    ))}
                  </Box>
                </Box>
                <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
              </ButtonBase>
            </Card>
          ) : (
            <Button fullWidth size="large" variant="outlined" startIcon={<PaymentsRoundedIcon />} onClick={() => setCharging(true)} disabled={!charges.data}>
              Registrar cobrança
            </Button>
          )}

          <SectionTitle>Preparação</SectionTitle>
          <Card sx={{ px: 1.5, py: 0.75 }}>
            <Stack>
              {PREP_ITEMS.map((item) => (
                <FormControlLabel
                  key={item}
                  control={
                    <Checkbox
                      checked={!!checked[item]}
                      onChange={() => setChecked((prev) => ({ ...prev, [item]: !prev[item] }))}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: checked[item] ? 'line-through' : 'none',
                        color: checked[item] ? 'text.secondary' : 'text.primary'
                      }}
                    >
                      {item}
                    </Typography>
                  }
                />
              ))}
            </Stack>
          </Card>

          <Stack spacing={1.25} sx={{ mt: 3 }}>
            {next && (
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={!saving && next.icon}
                disabled={saving}
                onClick={advanceStatus}
              >
                {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : next.label}
              </Button>
            )}
            <Stack direction="row" spacing={1.25}>
              <Button fullWidth size="large" variant="outlined" onClick={() => navigate(`/pacientes/${appointment.patientId}`)}>
                Ver paciente
              </Button>
              <Button fullWidth size="large" variant="outlined" startIcon={<RequestQuoteRoundedIcon />} onClick={() => setQuoting(true)}>
                Orçamento
              </Button>
            </Stack>
          </Stack>
        </>
      )}
      <ProcedureFormSheet
        open={recording}
        onClose={() => setRecording(false)}
        patientId={appointment?.patientId}
        defaults={appointment && { name: appointment.procedure, appointmentId: id }}
        alerts={patient.data?.clinicalAlerts}
        onSaved={(proc) => {
          procedures.setData((prev) => [...(prev || []), proc])
          toast('Procedimento registrado no prontuário')
          if (appointment.status === 'Concluído' && charges.data?.length === 0) setCharging(true)
        }}
      />
      <QuoteEditorSheet
        open={quoting}
        onClose={() => setQuoting(false)}
        client={appointment && { kind: 'patient', id: appointment.patientId, name: appointment.patientName, phone: patient.data?.phone || '' }}
        appointmentId={id}
        onSaved={(q) => navigate(`/vendas/orcamentos/${q.id}`)}
      />
      <TransactionFormSheet
        open={charging}
        onClose={() => setCharging(false)}
        defaults={chargeDefaults}
        onSaved={(created) => {
          charges.setData((prev) => [...(prev || []), ...created])
          toast(created.length > 1 ? `${created.length} parcelas lançadas` : 'Cobrança registrada')
        }}
      />
    </AppScreen>
  )
}
