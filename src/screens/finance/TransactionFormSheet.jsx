import React, { useEffect, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { todayKey } from '../../services/dates.js'
import { friendlyMessage } from '../../utils/errors.js'
import { formatCurrency, maskMoney, moneyToInput, parseMoney } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'
import { SERIES } from '../../components/FinanceChart.jsx'

function TypeToggle({ value, onChange }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', p: 0.5, borderRadius: '14px', bgcolor: 'rgba(74,39,54,0.06)' }}>
      {[
        ['receita', 'Receita', SERIES.income.color],
        ['despesa', 'Despesa', SERIES.expense.color]
      ].map(([v, label, color]) => (
        <ButtonBase
          key={v}
          onClick={() => onChange(v)}
          sx={{
            py: 1,
            borderRadius: '11px',
            fontWeight: 650,
            fontSize: '0.9rem',
            gap: 1,
            bgcolor: value === v ? brand.surface : 'transparent',
            boxShadow: value === v ? '0 1px 3px rgba(36,22,28,0.12)' : 'none',
            color: value === v ? brand.ink : brand.muted
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
          {label}
        </ButtonBase>
      ))}
    </Box>
  )
}

function initialForm({ transaction, defaults }) {
  if (transaction) {
    return {
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      amount: moneyToInput(transaction.amount),
      dueDate: transaction.dueDate,
      method: transaction.method || '',
      notes: transaction.notes || '',
      paid: false,
      installments: 1,
      patient: null
    }
  }
  const type = defaults?.type || 'receita'
  return {
    type,
    description: defaults?.description || '',
    category: defaults?.category || (type === 'receita' ? 'Procedimento' : 'Insumos'),
    amount: moneyToInput(defaults?.amount),
    dueDate: todayKey(),
    method: '',
    notes: '',
    paid: true,
    paidDate: todayKey(),
    installments: 1,
    patient: defaults?.patient || null
  }
}

/**
 * Novo lançamento (receita/despesa) ou edição (`transaction`). `defaults`
 * pré-preenche { type, description, amount, category, patient, appointmentId }.
 */
export default function TransactionFormSheet({ open, onClose, transaction, defaults, onSaved }) {
  const editing = !!transaction
  const [form, setForm] = useState(() => initialForm({ transaction, defaults }))
  const [patients, setPatients] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(initialForm({ transaction, defaults }))
    setError(null)
    if (!editing && !patients) afroditeApi.getPatients().then(setPatients, () => setPatients([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const isIncome = form.type === 'receita'
  const categories = isIncome ? afroditeApi.INCOME_CATEGORIES : afroditeApi.EXPENSE_CATEGORIES
  const amount = parseMoney(form.amount)
  const n = Number(form.installments)
  const valid = form.description.trim() && amount > 0 && form.dueDate

  function changeType(type) {
    setForm((prev) => ({
      ...prev,
      type,
      category: type === 'receita' ? 'Procedimento' : 'Insumos',
      installments: 1,
      patient: type === 'receita' ? prev.patient : null
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      let result
      if (editing) {
        result = await afroditeApi.updateTransaction(transaction.id, {
          description: form.description,
          category: form.category,
          amount,
          dueDate: form.dueDate,
          method: form.method || null,
          notes: form.notes
        })
      } else {
        result = await afroditeApi.createTransaction({
          type: form.type,
          description: form.description,
          category: form.category,
          amount,
          dueDate: form.dueDate,
          paid: form.paid,
          paidDate: form.paidDate,
          method: form.method || null,
          installments: n,
          notes: form.notes,
          patientId: form.patient?.id || null,
          patientName: form.patient?.name || null,
          appointmentId: defaults?.appointmentId || null
        })
      }
      onClose()
      onSaved?.(result)
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
      title={editing ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <Button fullWidth size="large" variant="contained" type="submit" form="transaction-form" disabled={!valid || saving}>
          {saving ? (
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          ) : editing ? (
            'Salvar alterações'
          ) : n > 1 ? (
            `Lançar ${n} parcelas`
          ) : (
            `Lançar ${isIncome ? 'receita' : 'despesa'}`
          )}
        </Button>
      }
    >
      <Stack component="form" id="transaction-form" spacing={2} onSubmit={handleSubmit} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!editing && <TypeToggle value={form.type} onChange={changeType} />}

        <TextField
          label="Valor"
          value={form.amount}
          onChange={(e) => setForm((prev) => ({ ...prev, amount: maskMoney(e.target.value) }))}
          inputMode="numeric"
          required
          autoFocus={!defaults?.amount}
          InputProps={{
            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            sx: { fontSize: '1.3rem', fontWeight: 650 }
          }}
        />
        <TextField
          label="Descrição"
          placeholder={isIncome ? 'Ex.: Toxina botulínica' : 'Ex.: Compra de ácido hialurônico'}
          value={form.description}
          onChange={set('description')}
          required
        />
        <TextField select label="Categoria" value={form.category} onChange={set('category')}>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        {!editing && isIncome && (
          <Autocomplete
            options={patients || []}
            loading={!patients}
            value={form.patient}
            onChange={(_, value) => setForm((prev) => ({ ...prev, patient: value }))}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="Nenhuma paciente encontrada"
            renderInput={(params) => <TextField {...params} label="Paciente (opcional)" />}
          />
        )}

        <Stack direction="row" spacing={1.5}>
          <TextField
            label={n > 1 ? '1º vencimento' : 'Vencimento'}
            type="date"
            value={form.dueDate}
            onChange={set('dueDate')}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ flex: 1 }}
          />
          {!editing && isIncome && (
            <TextField select label="Parcelas" value={form.installments} onChange={set('installments')} sx={{ width: 110 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {i === 0 ? 'À vista' : `${i + 1}x`}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
        {n > 1 && amount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {n}x de {formatCurrency(amount / n)} — uma parcela por mês
          </Typography>
        )}

        {!editing && (
          <FormControlLabel
            control={<Switch checked={form.paid} onChange={(e) => setForm((prev) => ({ ...prev, paid: e.target.checked }))} />}
            label={
              <Typography variant="body2" fontWeight={600}>
                {isIncome ? (n > 1 ? '1ª parcela já recebida' : 'Já recebido') : 'Já pago'}
              </Typography>
            }
          />
        )}

        {(form.paid || editing) && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Forma de pagamento
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {afroditeApi.PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  onClick={() => setForm((prev) => ({ ...prev, method: prev.method === m ? '' : m }))}
                  sx={{
                    bgcolor: form.method === m ? brand.wine : brand.surface,
                    color: form.method === m ? '#fff' : brand.ink,
                    border: `1px solid ${form.method === m ? brand.wine : brand.line}`,
                    '&:hover': { bgcolor: form.method === m ? brand.wine : brand.blush }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <TextField label="Observações" value={form.notes} onChange={set('notes')} multiline minRows={2} />
      </Stack>
    </BottomSheet>
  )
}
