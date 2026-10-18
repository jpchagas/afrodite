import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, FormControlLabel, InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import { maskMoney, moneyToInput, parseMoney } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'

const digits = (v, max = 4) => String(v ?? '').replace(/\D/g, '').slice(0, max)

export default function CatalogItemSheet({ open, onClose, item, onSaved }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      name: item?.name || '',
      category: item?.category || 'Procedimento',
      price: moneyToInput(item?.price),
      sessions: digits(item?.sessions || 1, 3),
      durationMin: digits(item?.durationMin || '', 3),
      maintenanceDays: digits(item?.maintenanceDays || '', 4),
      description: item?.description || '',
      active: item ? item.active : true
    })
  }, [open, item])

  if (!form) return null
  const set = (field, t) => (e) => setForm((prev) => ({ ...prev, [field]: t ? t(e.target.value) : e.target.value }))
  const valid = form.name.trim() && parseMoney(form.price) >= 0

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await afroditeApi.saveCatalogItem({ ...form, id: item?.id, price: parseMoney(form.price) })
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
      title={item ? 'Editar item' : 'Novo item do catálogo'}
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!valid || saving} onClick={handleSave}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar'}
        </Button>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Nome" value={form.name} onChange={set('name')} required autoFocus={!item} />
        <Stack direction="row" spacing={1.5}>
          <TextField select label="Categoria" value={form.category} onChange={set('category')} sx={{ flex: 1 }}>
            {afroditeApi.CATALOG_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Preço"
            value={form.price}
            onChange={set('price', maskMoney)}
            inputMode="numeric"
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ flex: 1 }}
          />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          {form.category === 'Pacote' && (
            <TextField label="Sessões" value={form.sessions} onChange={set('sessions', (v) => digits(v, 3))} inputMode="numeric" sx={{ flex: 1 }} />
          )}
          {form.category !== 'Produto' && (
            <TextField
              label="Duração"
              value={form.durationMin}
              onChange={set('durationMin', (v) => digits(v, 3))}
              inputMode="numeric"
              InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
              sx={{ flex: 1 }}
            />
          )}
        </Stack>
        {form.category !== 'Produto' && (
          <TextField
            label="Manutenção recomendada"
            helperText="Gera oportunidades de venda quando a paciente estiver perto do retorno."
            value={form.maintenanceDays}
            onChange={set('maintenanceDays', (v) => digits(v, 4))}
            inputMode="numeric"
            InputProps={{ endAdornment: <InputAdornment position="end">dias</InputAdornment> }}
          />
        )}
        <TextField label="Descrição" value={form.description} onChange={set('description')} multiline minRows={2} />
        <FormControlLabel
          control={<Switch checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} />}
          label={<Typography variant="body2" fontWeight={600}>Ativo (aparece em orçamentos e agenda)</Typography>}
        />
      </Stack>
    </BottomSheet>
  )
}
