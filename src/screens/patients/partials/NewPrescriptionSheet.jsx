import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, MenuItem, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { todayKey } from '../../../services/dates.js'
import { friendlyMessage } from '../../../utils/errors.js'
import BottomSheet from '../../../components/BottomSheet.jsx'

const DETAIL_HINT = {
  'Sessões na clínica': 'Ex.: 3 sessões, a cada 30 dias',
  'Uso domiciliar': 'Ex.: Aplicar à noite • 30 dias',
  Medicamento: 'Ex.: 1 comprimido ao dia • 10 dias'
}

const EMPTY = {
  name: '',
  kind: afroditeApi.PRESCRIPTION_KINDS[0],
  detail: '',
  startDate: '',
  nextSession: ''
}

export default function NewPrescriptionSheet({ open, onClose, patientId, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, startDate: todayKey() })
      setError(null)
    }
  }, [open])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const isSessions = form.kind === 'Sessões na clínica'
  const valid = form.name.trim() && form.detail.trim() && form.startDate

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const rx = await afroditeApi.createPrescription(patientId, {
        ...form,
        nextSession: isSessions ? form.nextSession : null
      })
      onClose()
      onCreated?.(rx)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível salvar a prescrição.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Nova prescrição"
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="new-rx-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar prescrição'}
        </Button>
      }
    >
      <Stack component="form" id="new-rx-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label="Tipo" value={form.kind} onChange={set('kind')}>
          {afroditeApi.PRESCRIPTION_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {k}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Prescrição" placeholder="Ex.: Skinbooster" value={form.name} onChange={set('name')} required autoFocus />
        <TextField
          label="Posologia / orientação"
          placeholder={DETAIL_HINT[form.kind]}
          value={form.detail}
          onChange={set('detail')}
          multiline
          minRows={2}
          required
        />
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Início"
            type="date"
            value={form.startDate}
            onChange={set('startDate')}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ flex: 1 }}
          />
          {isSessions && (
            <TextField
              label="Próxima sessão"
              type="date"
              value={form.nextSession}
              onChange={set('nextSession')}
              inputProps={{ min: todayKey() }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          )}
        </Stack>
      </Stack>
    </BottomSheet>
  )
}
