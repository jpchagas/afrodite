import React, { useEffect, useState } from 'react'
import { Button, CircularProgress, MenuItem, Stack, TextField, InputAdornment } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import { maskPhone } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'
import DuplicateWarning from '../../components/DuplicateWarning.jsx'

const EMPTY = { name: '', phone: '', email: '', interest: '', source: 'Instagram', proposalValue: '' }

export default function NewLeadSheet({ open, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setDuplicates(null)
    }
  }, [open])

  const set = (field, transform) => (e) => {
    setForm((prev) => ({ ...prev, [field]: transform ? transform(e.target.value) : e.target.value }))
    if (field === 'phone') setDuplicates(null)
  }

  const valid =
    form.name.trim().length >= 3 &&
    form.phone.replace(/\D/g, '').length >= 10 &&
    form.interest.trim().length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      // Na primeira tentativa, avisa se o telefone já existe; na segunda, cadastra
      if (!duplicates) {
        const found = await afroditeApi.findContactsByPhone(form.phone)
        if (found.leads.length || found.patients.length) {
          setDuplicates(found)
          return
        }
      }
      const lead = await afroditeApi.createLead(form)
      toast('Lead cadastrado')
      onClose()
      onCreated?.(lead)
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível cadastrar'), { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Novo lead"
      subtitle="O primeiro contato fica marcado para hoje."
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="new-lead-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : duplicates ? 'Cadastrar mesmo assim' : 'Cadastrar lead'}
        </Button>
      }
    >
      <Stack component="form" id="new-lead-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {duplicates && <DuplicateWarning matches={duplicates} onNavigate={onClose} />}
        <TextField label="Nome" value={form.name} onChange={set('name')} required autoFocus />
        <TextField label="Telefone / WhatsApp" value={form.phone} onChange={set('phone', maskPhone)} inputMode="tel" required />
        <TextField label="E-mail (opcional)" type="email" value={form.email} onChange={set('email')} inputMode="email" />
        <TextField label="Interesse" placeholder="Ex.: Toxina botulínica" value={form.interest} onChange={set('interest')} required />
        <Stack direction="row" spacing={1.5}>
          <TextField select label="Origem" value={form.source} onChange={set('source')} sx={{ flex: 1 }}>
            {afroditeApi.LEAD_SOURCES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Valor estimado"
            value={form.proposalValue}
            onChange={set('proposalValue', (v) => v.replace(/\D/g, '').slice(0, 7))}
            inputMode="numeric"
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ flex: 1 }}
          />
        </Stack>
      </Stack>
    </BottomSheet>
  )
}
