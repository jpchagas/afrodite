import React, { useState } from 'react'
import { Button, CircularProgress, Stack, TextField } from '@mui/material'
import { friendlyMessage } from '../../../utils/errors.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { maskCpf, maskPhone } from '../../../utils/format.js'
import BottomSheet from '../../../components/BottomSheet.jsx'

const EMPTY = { name: '', phone: '', cpf: '', age: '' }

export default function NewPatientSheet({ open, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const set = (field, mask) => (e) =>
    setForm((prev) => ({ ...prev, [field]: mask ? mask(e.target.value) : e.target.value }))

  const valid = form.name.trim().length >= 3 && form.phone.replace(/\D/g, '').length >= 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      const patient = await afroditeApi.createPatient(form)
      toast('Paciente cadastrada')
      setForm(EMPTY)
      onClose()
      onCreated?.(patient)
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
      title="Nova paciente"
      subtitle="Dados básicos — o restante pode ser completado depois."
      footer={
        <Button
          fullWidth
          size="large"
          variant="contained"
          type="submit"
          form="new-patient-form"
          disabled={!valid || saving}
        >
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Cadastrar'}
        </Button>
      }
    >
      <Stack component="form" id="new-patient-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        <TextField label="Nome completo" value={form.name} onChange={set('name')} required autoFocus />
        <TextField
          label="Telefone / WhatsApp"
          value={form.phone}
          onChange={set('phone', maskPhone)}
          inputMode="tel"
          required
        />
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
