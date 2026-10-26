import React, { useEffect, useState } from 'react'
import { Alert, Autocomplete, Button, CircularProgress, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { addDays, toDateKey, todayKey } from '../../services/dates.js'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'

export default function NewCareTaskSheet({ open, onClose, patient, onSaved }) {
  const [patients, setPatients] = useState(null)
  const [form, setForm] = useState({ patient: null, title: '', dueDate: todayKey(), notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({ patient: patient || null, title: '', dueDate: toDateKey(addDays(new Date(), 1)), notes: '' })
    setError(null)
    if (!patient && !patients) afroditeApi.getPatients().then(setPatients, () => setPatients([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const valid = form.patient && form.title.trim() && form.dueDate

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const task = await afroditeApi.createCareTask({
        patientId: form.patient.id,
        patientName: form.patient.name,
        phone: form.patient.phone,
        title: form.title,
        dueDate: form.dueDate,
        notes: form.notes
      })
      onClose()
      onSaved?.(task)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível criar a tarefa.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Nova tarefa de acompanhamento"
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!valid || saving} onClick={handleSave}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Criar tarefa'}
        </Button>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!patient && (
          <Autocomplete
            options={patients || []}
            loading={!patients}
            value={form.patient}
            onChange={(_, value) => setForm((prev) => ({ ...prev, patient: value }))}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Paciente" required />}
          />
        )}
        <TextField
          label="O que fazer"
          placeholder="Ex.: Enviar fotos de 30 dias"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
          autoFocus={!!patient}
        />
        <TextField
          label="Data"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          inputProps={{ min: todayKey() }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField label="Observação" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} multiline minRows={2} />
      </Stack>
    </BottomSheet>
  )
}
