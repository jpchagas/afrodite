import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import UndoRoundedIcon from '@mui/icons-material/UndoRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { formatDateKey, todayKey } from '../../services/dates.js'
import { friendlyMessage } from '../../utils/errors.js'
import { formatCurrency } from '../../utils/format.js'
import BottomSheet from '../../components/BottomSheet.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import InfoField from '../../components/InfoField.jsx'

/**
 * Detalhe do lançamento: marcar como pago (forma e data), voltar para
 * pendente, editar e excluir. `onChanged(updated | null)` — null = excluído.
 */
export default function TransactionDetailSheet({ transaction: t, onClose, onChanged, onEdit }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'pay' | 'delete'
  const [method, setMethod] = useState('')
  const [paidDate, setPaidDate] = useState(todayKey())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setMode(null)
    setMethod(t?.method || '')
    setPaidDate(todayKey())
    setError(null)
  }, [t])

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível atualizar.'))
    } finally {
      setBusy(false)
    }
  }

  const pay = () => run(async () => onChanged(await afroditeApi.markTransactionPaid(t.id, { paidDate, method: method || null }), 'pago'))
  const unpay = () => run(async () => onChanged(await afroditeApi.markTransactionPending(t.id), 'pendente'))
  const remove = () =>
    run(async () => {
      await afroditeApi.deleteTransaction(t.id)
      onChanged(null, 'excluido')
    })

  const isIncome = t?.type === 'receita'

  return (
    <BottomSheet
      open={!!t}
      onClose={busy ? undefined : onClose}
      title={t?.description}
      subtitle={t && `${isIncome ? 'Receita' : 'Despesa'} • ${t.category}`}
      footer={
        t && (
          <Stack spacing={1.25}>
            {t.status === 'Pendente' && mode !== 'pay' && (
              <Button fullWidth size="large" variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={() => setMode('pay')}>
                {isIncome ? 'Marcar como recebido' : 'Marcar como pago'}
              </Button>
            )}
            {mode === 'pay' && (
              <Button fullWidth size="large" variant="contained" disabled={busy} onClick={pay}>
                {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Confirmar pagamento'}
              </Button>
            )}
            {mode === 'delete' ? (
              <Stack direction="row" spacing={1.25}>
                <Button fullWidth variant="outlined" onClick={() => setMode(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button fullWidth variant="contained" color="error" onClick={remove} disabled={busy} sx={{ backgroundImage: 'none' }}>
                  {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Excluir'}
                </Button>
              </Stack>
            ) : (
              mode !== 'pay' && (
                <Stack direction="row" spacing={1.25}>
                  <Button fullWidth variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => onEdit(t)}>
                    Editar
                  </Button>
                  {t.status === 'Pago' ? (
                    <Button fullWidth variant="outlined" startIcon={<UndoRoundedIcon />} onClick={unpay} disabled={busy}>
                      Pendente
                    </Button>
                  ) : (
                    <Button fullWidth variant="text" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setMode('delete')}>
                      Excluir
                    </Button>
                  )}
                </Stack>
              )
            )}
          </Stack>
        )
      }
    >
      {t && (
        <Stack spacing={2} sx={{ pb: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '1.9rem', fontWeight: 650, letterSpacing: '-0.02em' }}>
              {isIncome ? '' : '− '}
              {formatCurrency(t.amount)}
            </Typography>
            <StatusChip status={t.displayStatus} />
          </Box>
          {mode === 'delete' && (
            <Alert severity="warning">Excluir este lançamento? Essa ação não pode ser desfeita.</Alert>
          )}
          {mode === 'pay' ? (
            <>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Forma de pagamento
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {afroditeApi.PAYMENT_METHODS.map((m) => (
                    <Chip
                      key={m}
                      label={m}
                      onClick={() => setMethod(m)}
                      sx={{
                        bgcolor: method === m ? brand.wine : brand.surface,
                        color: method === m ? '#fff' : brand.ink,
                        border: `1px solid ${method === m ? brand.wine : brand.line}`,
                        '&:hover': { bgcolor: method === m ? brand.wine : brand.blush }
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <TextField
                label="Data do pagamento"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <InfoField label="Vencimento" value={formatDateKey(t.dueDate)} />
              <InfoField label={isIncome ? 'Recebido em' : 'Pago em'} value={t.paidDate ? formatDateKey(t.paidDate) : '—'} />
              <InfoField label="Forma de pagamento" value={t.method} />
              {t.installment && <InfoField label="Parcela" value={`${t.installment.n} de ${t.installment.total}`} />}
            </Box>
          )}
          {t.patientId && mode !== 'pay' && (
            <Button
              variant="text"
              onClick={() => {
                onClose()
                navigate(`/pacientes/${t.patientId}`)
              }}
              sx={{ alignSelf: 'flex-start', color: brand.wine, px: 0 }}
            >
              Paciente: {t.patientName}
            </Button>
          )}
          {t.notes && mode !== 'pay' && <InfoField label="Observações" value={t.notes} />}
        </Stack>
      )}
    </BottomSheet>
  )
}
