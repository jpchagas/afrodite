import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, ButtonBase, Card, Chip, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import HealingRoundedIcon from '@mui/icons-material/HealingRounded'
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded'
import CakeRoundedIcon from '@mui/icons-material/CakeRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import { brand } from '../../theme/theme.js'
import { TONES } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { addDays, toDateKey, todayKey } from '../../services/dates.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'

const TYPE_STYLE = {
  checkin: { icon: <HealingRoundedIcon />, tone: TONES.brand },
  retorno: { icon: <EventRepeatRoundedIcon />, tone: TONES.info },
  manutencao: { icon: <AutorenewRoundedIcon />, tone: TONES.brandStrong },
  queixa: { icon: <ReportProblemRoundedIcon />, tone: TONES.danger },
  aniversario: { icon: <CakeRoundedIcon />, tone: TONES.warning },
  reativacao: { icon: <FavoriteRoundedIcon />, tone: TONES.brand },
  personalizado: { icon: <TaskAltRoundedIcon />, tone: TONES.neutral }
}

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'visita', label: 'Presencial' }
]

function SelectChip({ selected, color = brand.wine, ...props }) {
  return (
    <Chip
      {...props}
      sx={{
        bgcolor: selected ? color : brand.surface,
        color: selected ? '#fff' : brand.ink,
        border: `1px solid ${selected ? color : brand.line}`,
        '&:hover': { bgcolor: selected ? color : brand.blush }
      }}
    />
  )
}

function dueTone(task) {
  if (task.status !== 'Pendente') return TONES.success
  if (task.overdue) return TONES.danger
  if (task.dueDate === todayKey()) return TONES.warning
  return TONES.neutral
}

/**
 * Cartão de tarefa de acompanhamento com as ações: WhatsApp (mensagem pronta),
 * concluir (com como a paciente está), adiar e ignorar.
 * `showPatient` exibe o nome da paciente (oculto dentro do perfil).
 */
export default function CareTaskCard({ task, onChanged, showPatient = true, index = 0 }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [sheet, setSheet] = useState(null) // 'complete' | 'more'
  const [outcome, setOutcome] = useState(null)
  const [note, setNote] = useState('')
  const [channel, setChannel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const style = TYPE_STYLE[task.type] || TYPE_STYLE.personalizado
  const tone = dueTone(task)
  const pending = task.status === 'Pendente'
  const needsOutcome = afroditeApi.CARE_OUTCOME_TYPES.includes(task.type)

  function openComplete(ch = null) {
    setOutcome(null)
    setNote('')
    setChannel(ch)
    setError(null)
    setSheet('complete')
  }

  async function run(action, message) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setSheet(null)
      toast(message)
      onChanged?.()
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível atualizar.'))
    } finally {
      setBusy(false)
    }
  }

  const canComplete = (!needsOutcome || outcome) && (outcome !== 'queixa' || note.trim())

  return (
    <Card sx={{ p: 1.75, animation: 'afFadeUp 420ms both', animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: style.tone.bg, color: style.tone.fg, '& svg': { fontSize: 20 } }}>
          {style.icon}
        </Box>
        <ButtonBase
          onClick={() => navigate(`/pacientes/${task.patientId}`)}
          sx={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left', borderRadius: 2 }}
        >
          <Typography variant="subtitle2">{task.title}</Typography>
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {[showPatient && task.patientName, task.typeLabel].filter(Boolean).join(' • ')}
          </Typography>
          {task.notes && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ fontStyle: 'italic' }}>
              {task.notes}
            </Typography>
          )}
        </ButtonBase>
        <Box component="span" sx={{ alignSelf: 'flex-start', px: 1, py: 0.25, borderRadius: 999, fontSize: '0.72rem', fontWeight: 650, whiteSpace: 'nowrap', bgcolor: tone.bg, color: tone.fg }}>
          {pending ? task.dueLabel : task.status === 'Ignorado' ? 'Ignorada' : 'Feita'}
        </Box>
      </Box>

      {!pending && (task.resultNote || task.outcome) && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1, pl: 6.5 }}>
          {task.outcome === 'queixa' ? '⚠ Com queixa' : task.outcome === 'ok' ? 'Sem queixas' : ''}
          {task.resultNote ? ` — ${task.resultNote}` : ''}
          {task.completedByName ? ` • ${task.completedByName}` : ''}
        </Typography>
      )}

      {pending && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {task.phone && (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              component="a"
              href={afroditeApi.careWhatsAppUrl(task)}
              target="_blank"
              rel="noopener"
              onClick={() => setTimeout(() => openComplete('whatsapp'), 300)}
              sx={{ color: '#1f8a4c' }}
            >
              WhatsApp
            </Button>
          )}
          <Button fullWidth size="small" variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => openComplete()}>
            Concluir
          </Button>
          <IconButton size="small" aria-label="Mais opções" onClick={() => setSheet('more')} sx={{ border: `1px solid ${brand.line}`, borderRadius: '11px', width: 40 }}>
            <MoreHorizRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <BottomSheet
        open={sheet === 'complete'}
        onClose={busy ? undefined : () => setSheet(null)}
        title="Concluir acompanhamento"
        subtitle={`${task.patientName} • ${task.title}`}
        footer={
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={!canComplete || busy}
            onClick={() => run(() => afroditeApi.completeCareTask(task.id, { outcome, note, channel }), outcome === 'queixa' ? 'Queixa registrada no prontuário' : 'Acompanhamento concluído')}
          >
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Concluir'}
          </Button>
        }
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {needsOutcome && (
            <Box>
              <Typography variant="overline" color="text.secondary">
                Como a paciente está?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <SelectChip label="Sem queixas" selected={outcome === 'ok'} color="#2f6b47" onClick={() => setOutcome('ok')} />
                <SelectChip label="Com queixa" selected={outcome === 'queixa'} color="#9b2c3e" onClick={() => setOutcome('queixa')} />
              </Box>
            </Box>
          )}
          {outcome === 'queixa' && (
            <Alert severity="warning">A queixa vai para o prontuário e uma reavaliação fica marcada para amanhã.</Alert>
          )}
          <TextField
            label={outcome === 'queixa' ? 'Descreva a queixa' : 'Observação (opcional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
          />
          <Box>
            <Typography variant="overline" color="text.secondary">
              Contato por
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              {CHANNELS.map((c) => (
                <SelectChip key={c.value} label={c.label} selected={channel === c.value} onClick={() => setChannel(channel === c.value ? null : c.value)} />
              ))}
            </Box>
          </Box>
        </Stack>
      </BottomSheet>

      <BottomSheet open={sheet === 'more'} onClose={busy ? undefined : () => setSheet(null)} title="Adiar ou ignorar" subtitle={task.title}>
        <Stack spacing={1.5} sx={{ pt: 1, pb: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="overline" color="text.secondary">
            Adiar para
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              ['Amanhã', 1],
              ['Em 3 dias', 3],
              ['Em 1 semana', 7]
            ].map(([label, days]) => (
              <SelectChip
                key={label}
                label={label}
                onClick={() =>
                  run(() => afroditeApi.rescheduleCareTask(task.id, toDateKey(addDays(new Date(), days))), `Adiado para ${label.toLowerCase()}`)
                }
              />
            ))}
          </Box>
          <Button color="error" onClick={() => run(() => afroditeApi.dismissCareTask(task.id), 'Tarefa ignorada')} disabled={busy} sx={{ alignSelf: 'flex-start' }}>
            Ignorar esta tarefa
          </Button>
        </Stack>
      </BottomSheet>
    </Card>
  )
}
