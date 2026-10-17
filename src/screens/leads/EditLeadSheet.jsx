import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, InputAdornment, MenuItem, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import { maskPhone } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'

const money = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 7)

export default function EditLeadSheet({ open, onClose, lead, onSaved }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && lead) {
      setForm({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        interest: lead.interest || '',
        source: lead.source || 'Outro',
        proposalValue: money(lead.proposalValue),
        downPayment: money(lead.downPayment),
        notes: lead.notes || ''
      })
      setError(null)
    }
  }, [open, lead])

  if (!form) return null
  const set = (field, transform) => (e) => setForm((prev) => ({ ...prev, [field]: transform ? transform(e.target.value) : e.target.value }))
  const valid = form.name.trim().length >= 3 && form.phone.replace(/\D/g, '').length >= 10 && form.interest.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const updated = await afroditeApi.updateLead(lead.id, form)
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
      title="Editar lead"
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="edit-lead-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar alterações'}
        </Button>
      }
    >
      <Stack component="form" id="edit-lead-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Nome" value={form.name} onChange={set('name')} required />
        <TextField label="Telefone / WhatsApp" value={form.phone} onChange={set('phone', maskPhone)} inputMode="tel" required />
        <TextField label="E-mail" type="email" value={form.email} onChange={set('email')} inputMode="email" />
        <TextField label="Interesse" value={form.interest} onChange={set('interest')} required />
        <TextField select label="Origem" value={form.source} onChange={set('source')}>
          {afroditeApi.LEAD_SOURCES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Valor da proposta"
            value={form.proposalValue}
            onChange={set('proposalValue', money)}
            inputMode="numeric"
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Sinal pago"
            value={form.downPayment}
            onChange={set('downPayment', money)}
            inputMode="numeric"
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ flex: 1 }}
          />
        </Stack>
        <TextField label="Notas" value={form.notes} onChange={set('notes')} multiline minRows={3} />
      </Stack>
    </BottomSheet>
  )
}
