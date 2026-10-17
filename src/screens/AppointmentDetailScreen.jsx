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

  const appt = useAsync(() => afroditeApi.getAppointment(id), [id])
  const patientId = appt.data?.patientId
  const patient = useAsync(
    () => (patientId ? afroditeApi.getPatient(patientId) : null),
    [patientId]
  )

  const appointment = appt.data
  const next = appointment && NEXT_STEP[appointment.status]

  async function advanceStatus() {
    setSaving(true)
    try {
      const updated = await afroditeApi.updateAppointmentStatus(id, next.status)
      appt.setData(updated)
      toast(next.toast)
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar o atendimento'), { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen header={<PatientHeader patient={patient.data} error={appt.error || patient.error} title="Agendamento" />}>
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
            <Button
              fullWidth
              size="large"
              variant="outlined"
              onClick={() => navigate(`/pacientes/${appointment.patientId}`)}
            >
              Ver paciente
            </Button>
          </Stack>
        </>
      )}
    </AppScreen>
  )
}
