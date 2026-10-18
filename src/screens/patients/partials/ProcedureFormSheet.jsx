import React, { useEffect, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { todayKey } from '../../../services/dates.js'
import { friendlyMessage } from '../../../utils/errors.js'
import BottomSheet from '../../../components/BottomSheet.jsx'
import ClinicalAlerts from '../../../components/ClinicalAlerts.jsx'

const RETURNS = [
  { label: 'Sem retorno', days: 0 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '4 meses', days: 120 },
  { label: '6 meses', days: 180 }
]

function initial(procedure, defaults) {
  if (procedure) {
    return {
      name: procedure.name || '',
      date: procedure.dateKey || todayKey(),
      areas: procedure.area || '',
      product: procedure.product || '',
      lot: procedure.lot || '',
      quantity: procedure.quantity != null ? String(procedure.quantity).replace('.', ',') : '',
      unit: procedure.unit || '',
      technique: procedure.technique || '',
      postCare: procedure.postCare || '',
      notes: procedure.notes || '',
      returnInDays: 0
    }
  }
  return {
    name: defaults?.name || '',
    date: todayKey(),
    areas: '',
    product: '',
    lot: '',
    quantity: '',
    unit: '',
    technique: '',
    postCare: '',
    notes: '',
    returnInDays: defaults?.returnInDays || 0
  }
}

/**
 * Registro de procedimento (novo ou edição). `defaults`: { name, appointmentId }.
 * `alerts` mostra os alertas clínicos da paciente antes do registro.
 */
export default function ProcedureFormSheet({ open, onClose, patientId, procedure, defaults, alerts, onSaved }) {
  const editing = !!procedure
  const [form, setForm] = useState(() => initial(procedure, defaults))
  const [catalog, setCatalog] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(initial(procedure, defaults))
    setError(null)
    afroditeApi.getCatalog({ activeOnly: true }).then(
      (items) => setCatalog(items.filter((c) => c.category !== 'Produto')),
      () => {}
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const valid = form.name.trim() && form.date

  // Ao escolher um item do catálogo, sugere o retorno pela manutenção
  function pickName(value) {
    const item = catalog.find((c) => c.name === value)
    setForm((prev) => ({
      ...prev,
      name: value || '',
      returnInDays: !editing && item?.maintenanceDays ? prev.returnInDays || 15 : prev.returnInDays
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const saved = editing
        ? await afroditeApi.updateProcedure(patientId, procedure.id, form)
        : await afroditeApi.createProcedure(patientId, { ...form, appointmentId: defaults?.appointmentId || null })
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
      title={editing ? 'Editar procedimento' : 'Registrar procedimento'}
      subtitle="Produto e lote ficam no prontuário para rastreabilidade."
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="procedure-form" disabled={!valid || saving}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : editing ? 'Salvar alterações' : 'Registrar no prontuário'}
        </Button>
      }
    >
      <Stack component="form" id="procedure-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!editing && alerts?.length > 0 && <ClinicalAlerts alerts={alerts} />}
        <Autocomplete
          freeSolo
          options={catalog.map((c) => c.name)}
          inputValue={form.name}
          onInputChange={(_, value) => pickName(value)}
          renderInput={(params) => <TextField {...params} label="Procedimento" required />}
        />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Data" type="date" value={form.date} onChange={set('date')} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} required />
          <TextField label="Áreas" placeholder="Ex.: Glabela, frontal" value={form.areas} onChange={set('areas')} sx={{ flex: 1.3 }} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <TextField label="Produto / marca" value={form.product} onChange={set('product')} sx={{ flex: 1.4 }} />
          <TextField label="Lote" value={form.lot} onChange={set('lot')} sx={{ flex: 1 }} inputProps={{ style: { textTransform: 'uppercase' } }} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Quantidade"
            value={form.quantity}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d,]/g, '').slice(0, 6) }))}
            inputMode="decimal"
            sx={{ flex: 1 }}
          />
          <TextField select label="Unidade" value={form.unit} onChange={set('unit')} sx={{ flex: 1 }}>
            <MenuItem value="">—</MenuItem>
            {afroditeApi.PROCEDURE_UNITS.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField label="Técnica / pontos" value={form.technique} onChange={set('technique')} multiline minRows={2} />
        <TextField label="Cuidados pós-procedimento" value={form.postCare} onChange={set('postCare')} multiline minRows={2} />
        <TextField label="Intercorrências / observações" value={form.notes} onChange={set('notes')} multiline minRows={2} />
        {!editing && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Retorno
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {RETURNS.map((r) => (
                <Chip
                  key={r.label}
                  label={r.label}
                  onClick={() => setForm((prev) => ({ ...prev, returnInDays: r.days }))}
                  sx={{
                    bgcolor: form.returnInDays === r.days ? brand.wine : brand.surface,
                    color: form.returnInDays === r.days ? '#fff' : brand.ink,
                    border: `1px solid ${form.returnInDays === r.days ? brand.wine : brand.line}`,
                    '&:hover': { bgcolor: form.returnInDays === r.days ? brand.wine : brand.blush }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </BottomSheet>
  )
}
