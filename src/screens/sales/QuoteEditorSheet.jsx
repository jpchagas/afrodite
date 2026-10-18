import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { addDays, toDateKey, todayKey } from '../../services/dates.js'
import { friendlyMessage } from '../../utils/errors.js'
import { formatCurrency, maskMoney, moneyToInput, parseMoney } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'

function fromQuote(q) {
  return {
    client: { kind: q.leadId ? 'lead' : 'patient', id: q.leadId || q.patientId, name: q.clientName, phone: q.clientPhone },
    items: q.items.map((i, idx) => ({ ...i, key: idx, unitPrice: moneyToInput(i.unitPrice) })),
    discount: moneyToInput(q.discount),
    installments: q.installments,
    validUntil: q.validUntil,
    notes: q.notes || ''
  }
}

function emptyForm(client) {
  return { client: client || null, items: [], discount: '', installments: 1, validUntil: toDateKey(addDays(new Date(), 15)), notes: '' }
}

/**
 * Novo orçamento ou edição (`quote`). `client` fixa o cliente:
 * { kind: 'lead' | 'patient', id, name, phone }.
 */
export default function QuoteEditorSheet({ open, onClose, client, quote, appointmentId, onSaved }) {
  const editing = !!quote
  const [form, setForm] = useState(() => (quote ? fromQuote(quote) : emptyForm(client)))
  const [catalog, setCatalog] = useState([])
  const [clients, setClients] = useState(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(quote ? fromQuote(quote) : emptyForm(client))
    setError(null)
    afroditeApi.getCatalog({ activeOnly: true }).then(setCatalog, () => {})
    if (!client && !quote && !clients) {
      Promise.all([afroditeApi.getPatients(), afroditeApi.getLeads()]).then(
        ([patients, leads]) =>
          setClients([
            ...patients.map((p) => ({ kind: 'patient', id: p.id, name: p.name, phone: p.phone, group: 'Pacientes' })),
            ...leads.filter(afroditeApi.isOpenLead).map((l) => ({ kind: 'lead', id: l.id, name: l.name, phone: l.phone, group: 'Leads' }))
          ]),
        () => setClients([])
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, i) => s + parseMoney(i.unitPrice) * i.qty, 0)
    const discount = Math.min(parseMoney(form.discount), subtotal)
    return { subtotal, discount, total: subtotal - discount }
  }, [form.items, form.discount])

  const updateItem = (key, changes) =>
    setForm((prev) => ({ ...prev, items: prev.items.map((i) => (i.key === key ? { ...i, ...changes } : i)) }))
  const removeItem = (key) => setForm((prev) => ({ ...prev, items: prev.items.filter((i) => i.key !== key) }))
  const addItem = (item) =>
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: Date.now(),
          catalogId: item?.id || null,
          name: item?.name || '',
          category: item?.category || 'Procedimento',
          sessions: item?.sessions || 1,
          qty: 1,
          unitPrice: moneyToInput(item?.price),
          custom: !item
        }
      ]
    }))

  const valid = form.client && form.items.length > 0 && form.items.every((i) => i.name.trim()) && totals.total > 0

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await afroditeApi.saveQuote({
        id: quote?.id,
        leadId: form.client.kind === 'lead' ? form.client.id : null,
        patientId: form.client.kind === 'patient' ? form.client.id : null,
        clientName: form.client.name,
        clientPhone: form.client.phone,
        items: form.items.map((i) => ({ ...i, unitPrice: parseMoney(i.unitPrice) })),
        discount: totals.discount,
        installments: form.installments,
        validUntil: form.validUntil,
        notes: form.notes,
        appointmentId: quote?.appointmentId || appointmentId || null
      })
      onClose()
      onSaved?.(saved)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível salvar o orçamento.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title={editing ? `Editar orçamento ${quote.code}` : 'Novo orçamento'}
      subtitle={form.client && (client || editing) ? form.client.name : undefined}
      footer={
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.25 }}>
            <Typography variant="body2" color="text.secondary">
              {totals.discount > 0 ? `${formatCurrency(totals.subtotal)} − ${formatCurrency(totals.discount)}` : 'Total'}
              {form.installments > 1 && totals.total > 0 ? ` • ${form.installments}x de ${formatCurrency(totals.total / form.installments)}` : ''}
            </Typography>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 650, letterSpacing: '-0.02em' }}>{formatCurrency(totals.total)}</Typography>
          </Box>
          <Button fullWidth size="large" variant="contained" disabled={!valid || saving} onClick={handleSave}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar orçamento'}
          </Button>
        </Box>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!client && !editing && (
          <Autocomplete
            options={clients || []}
            loading={!clients}
            groupBy={(o) => o.group}
            value={form.client}
            onChange={(_, value) => setForm((prev) => ({ ...prev, client: value }))}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id && a.kind === b.kind}
            noOptionsText="Nenhum cliente encontrado"
            renderInput={(params) => <TextField {...params} label="Cliente (paciente ou lead)" required />}
          />
        )}

        <Box>
          <Typography variant="overline" color="text.secondary">
            Itens
          </Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {form.items.map((i) => (
              <Box key={i.key} sx={{ p: 1.5, borderRadius: '16px', border: `1px solid ${brand.line}`, bgcolor: brand.surface }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {i.custom ? (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Descrição do item"
                        value={i.name}
                        onChange={(e) => updateItem(i.key, { name: e.target.value })}
                        inputProps={{ 'aria-label': 'Descrição do item' }}
                      />
                    ) : (
                      <>
                        <Typography variant="subtitle2">{i.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {i.category}
                          {i.category === 'Pacote' ? ` • ${i.sessions} sessões` : ''}
                        </Typography>
                      </>
                    )}
                  </Box>
                  <IconButton size="small" aria-label={`Remover ${i.name || 'item'}`} onClick={() => removeItem(i.key)}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${brand.line}` }}>
                    <IconButton size="small" aria-label="Diminuir quantidade" disabled={i.qty <= 1} onClick={() => updateItem(i.key, { qty: i.qty - 1 })}>
                      <RemoveRoundedIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 650 }}>{i.qty}</Typography>
                    <IconButton size="small" aria-label="Aumentar quantidade" onClick={() => updateItem(i.key, { qty: i.qty + 1 })}>
                      <AddRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <TextField
                    size="small"
                    value={i.unitPrice}
                    onChange={(e) => updateItem(i.key, { unitPrice: maskMoney(e.target.value) })}
                    inputMode="numeric"
                    inputProps={{ 'aria-label': `Preço de ${i.name || 'item'}` }}
                    InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            ))}
            <Autocomplete
              key={pickerKey}
              options={catalog}
              groupBy={(c) => c.category}
              getOptionLabel={(c) => c.name}
              onChange={(_, value) => {
                if (value) {
                  addItem(value)
                  setPickerKey((k) => k + 1)
                }
              }}
              renderOption={({ key, ...props }, c) => (
                <li key={key} {...props} style={{ ...props.style, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{c.name}</span>
                  <span style={{ color: brand.muted, whiteSpace: 'nowrap' }}>{formatCurrency(c.price, { cents: false })}</span>
                </li>
              )}
              noOptionsText="Nada no catálogo"
              renderInput={(params) => <TextField {...params} label="Adicionar do catálogo" />}
            />
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => addItem(null)} sx={{ alignSelf: 'flex-start', color: brand.wine }}>
              Item avulso
            </Button>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Desconto"
            value={form.discount}
            onChange={(e) => setForm((prev) => ({ ...prev, discount: maskMoney(e.target.value) }))}
            inputMode="numeric"
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="Pagamento"
            value={form.installments}
            onChange={(e) => setForm((prev) => ({ ...prev, installments: Number(e.target.value) }))}
            sx={{ width: 130 }}
          >
            {Array.from({ length: 12 }).map((_, n) => (
              <MenuItem key={n + 1} value={n + 1}>
                {n === 0 ? 'À vista' : `Até ${n + 1}x`}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          label="Válido até"
          type="date"
          value={form.validUntil}
          onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
          inputProps={{ min: todayKey() }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Observações para a paciente"
          placeholder="Ex.: Inclui retorno de 15 dias sem custo."
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          multiline
          minRows={2}
        />
      </Stack>
    </BottomSheet>
  )
}
