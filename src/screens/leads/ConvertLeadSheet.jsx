import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import { maskCpf, maskPhone } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'
import DuplicateWarning from '../../components/DuplicateWarning.jsx'

/**
 * Converte o lead em paciente. Os dados do lead vêm preenchidos; se o
 * telefone já for de uma paciente, avisa antes de criar outra ficha.
 */
export default function ConvertLeadSheet({ open, onClose, lead, onConverted }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [duplicates, setDuplicates] = useState(null)

  useEffect(() => {
    if (open && lead) {
      setForm({ name: lead.name || '', phone: lead.phone || '', email: lead.email || '', cpf: '', age: '' })
      setError(null)
      setDuplicates(null)
      afroditeApi
        .findContactsByPhone(lead.phone, { excludeLeadId: lead.id })
        .then((found) => setDuplicates(found.patients.length ? { leads: [], patients: found.patients } : null), () => {})
    }
  }, [open, lead])

  if (!form) return null
  const set = (field, mask) => (e) => setForm((prev) => ({ ...prev, [field]: mask ? mask(e.target.value) : e.target.value }))
  const valid = form.name.trim().length >= 3 && form.phone.replace(/\D/g, '').length >= 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const { patientId } = await afroditeApi.convertLeadToPatient(lead.id, form)
      onClose()
      onConverted?.(patientId)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível converter.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Converter em paciente"
      subtitle="Cria a ficha da paciente com o histórico deste lead."
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="convert-lead-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : duplicates ? 'Criar nova ficha mesmo assim' : 'Criar ficha da paciente'}
        </Button>
      }
    >
      <Stack component="form" id="convert-lead-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {duplicates && <DuplicateWarning matches={duplicates} onNavigate={onClose} />}
        <TextField label="Nome completo" value={form.name} onChange={set('name')} required />
        <TextField label="Telefone / WhatsApp" value={form.phone} onChange={set('phone', maskPhone)} inputMode="tel" required />
        <TextField label="E-mail" type="email" value={form.email} onChange={set('email')} inputMode="email" />
        <Stack direction="row" spacing={1.5}>
          <TextField label="CPF" value={form.cpf} onChange={set('cpf', maskCpf)} inputMode="numeric" sx={{ flex: 2 }} />
          <TextField
            label="Idade"
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
            inputMode="numeric"
            sx={{ flex: 1 }}
          />
        </Stack>
      </Stack>
    </BottomSheet>
  )
}
