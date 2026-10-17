import React, { useEffect, useState } from 'react'
import { Alert, Autocomplete, Button, CircularProgress, MenuItem, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { todayKey } from '../../services/dates.js'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'

const PROCEDURES = [
  'Consulta de avaliação',
  'Retorno',
  'Toxina botulínica',
  'Preenchimento labial',
  'Skinbooster',
  'Bioestimulador de colágeno',
  'Protocolo de colágeno'
]

function initialForm(defaultDate) {
  return {
    patient: null,
    procedure: '',
    dateKey: defaultDate && defaultDate >= todayKey() ? defaultDate : todayKey(),
    time: '09:00',
    durationMin: 60,
    room: afroditeApi.ROOMS[0]
  }
}

/**
 * Formulário de novo agendamento. Com `patient`, a paciente vem fixa
 * (aberto a partir do perfil); sem, escolhe-se na lista.
 */
export default function NewAppointmentSheet({ open, onClose, onCreated, defaultDate, patient }) {
  const [form, setForm] = useState(() => initialForm(defaultDate))
  const [patients, setPatients] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({ ...initialForm(defaultDate), patient: patient || null })
    setError(null)
    if (!patient && !patients) {
      afroditeApi.getPatients().then(setPatients, () => setPatients([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError(null)
  }

  const valid = form.patient && form.procedure.trim() && form.dateKey && form.time

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const appointment = await afroditeApi.createAppointment({
        patientId: form.patient.id,
        procedure: form.procedure,
        dateKey: form.dateKey,
        time: form.time,
        durationMin: form.durationMin,
        room: form.room
      })
      onClose()
      onCreated?.(appointment)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível agendar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Novo agendamento"
      subtitle={patient ? patient.name : 'Escolha a paciente, o horário e a sala.'}
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="new-appointment-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Agendar'}
        </Button>
      }
    >
      <Stack component="form" id="new-appointment-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!patient && (
          <Autocomplete
            options={patients || []}
            loading={!patients}
            value={form.patient}
            onChange={(_, value) => setForm((prev) => ({ ...prev, patient: value }))}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="Nenhuma paciente encontrada"
            loadingText="Carregando…"
            renderOption={({ key, ...props }, p) => (
              <li key={key} {...props} style={{ ...props.style, gap: 12 }}>
                <PersonAvatar name={p.name} size={32} />
                {p.name}
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Paciente" required />}
          />
        )}

        <Autocomplete
          freeSolo
          options={PROCEDURES}
          inputValue={form.procedure}
          onInputChange={(_, value) => setForm((prev) => ({ ...prev, procedure: value }))}
          renderInput={(params) => <TextField {...params} label="Procedimento" required />}
        />

        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Data"
            type="date"
            value={form.dateKey}
            onChange={set('dateKey')}
            inputProps={{ min: todayKey() }}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ flex: 3 }}
          />
          <TextField
            label="Horário"
            type="time"
            value={form.time}
            onChange={set('time')}
            inputProps={{ step: 300 }}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ flex: 2 }}
          />
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <TextField select label="Duração" value={form.durationMin} onChange={set('durationMin')} sx={{ flex: 2 }}>
            {afroditeApi.DURATIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}min` : ''}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Sala" value={form.room} onChange={set('room')} sx={{ flex: 3 }}>
            {afroditeApi.ROOMS.map((r) => (
              <MenuItem key={r} value={r}>
                {r.split(' •')[0]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}
