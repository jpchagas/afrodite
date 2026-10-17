import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'

export default function CommissionRatesSheet({ open, onClose, rates, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(Object.fromEntries(afroditeApi.INCOME_CATEGORIES.map((c) => [c, String(rates?.[c] ?? 0)])))
      setError(null)
    }
  }, [open, rates])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await afroditeApi.updateCommissionRates(form)
      onClose()
      onSaved?.(saved)
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
      title="Percentuais de comissão"
      subtitle="Aplicados sobre as receitas recebidas de cada categoria."
      footer={
        <Button fullWidth size="large" variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar percentuais'}
        </Button>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {afroditeApi.INCOME_CATEGORIES.map((c) => (
          <Stack key={c} direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
              {c}
            </Typography>
            <TextField
              size="small"
              value={form[c] ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [c]: e.target.value.replace(/[^\d]/g, '').slice(0, 3) }))}
              inputMode="numeric"
              inputProps={{ 'aria-label': `Comissão ${c}`, style: { textAlign: 'right' } }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              sx={{ width: 110 }}
            />
          </Stack>
        ))}
      </Stack>
    </BottomSheet>
  )
}
