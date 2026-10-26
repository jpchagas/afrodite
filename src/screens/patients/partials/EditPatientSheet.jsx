import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, MenuItem, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { friendlyMessage } from '../../../utils/errors.js'
import { maskCpf, maskPhone } from '../../../utils/format.js'
import BottomSheet from '../../../components/BottomSheet.jsx'

export default function EditPatientSheet({ open, onClose, patient, onSaved }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && patient) {
      setForm({
        name: patient.name || '',
        phone: patient.phone || '',
        email: patient.email || '',
        cpf: patient.cpf || '',
        age: patient.age != null ? String(patient.age) : '',
        birthDate: patient.birthDate || '',
        status: patient.status || 'Em avaliação'
      })
      setError(null)
    }
  }, [open, patient])

  if (!form) return null
  const set = (field, mask) => (e) => setForm((prev) => ({ ...prev, [field]: mask ? mask(e.target.value) : e.target.value }))
  const valid = form.name.trim().length >= 3 && form.phone.replace(/\D/g, '').length >= 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const updated = await afroditeApi.updatePatient(patient.id, form)
      onClose()
      onSaved?.(updated)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível salvar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Editar paciente"
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="edit-patient-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar alterações'}
        </Button>
      }
    >
      <Stack component="form" id="edit-patient-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Nome completo" value={form.name} onChange={set('name')} required />
        <TextField label="Telefone / WhatsApp" value={form.phone} onChange={set('phone', maskPhone)} inputMode="tel" required />
        <TextField label="E-mail" type="email" value={form.email} onChange={set('email')} inputMode="email" />
        <TextField label="CPF" value={form.cpf} onChange={set('cpf', maskCpf)} inputMode="numeric" />
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Nascimento"
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1.6 }}
          />
          <TextField
            label="Idade"
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
            inputMode="numeric"
            sx={{ flex: 1 }}
          />
        </Stack>
        <TextField select label="Status" value={form.status} onChange={set('status')}>
          {afroditeApi.PATIENT_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </BottomSheet>
  )
}
