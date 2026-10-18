import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  FormControlLabel,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { formatDateKey, todayKey } from '../../services/dates.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import BottomSheet from '../../components/BottomSheet.jsx'
import { ErrorState } from '../../components/StateViews.jsx'
import QuoteEditorSheet from './QuoteEditorSheet.jsx'

const REJECT_REASONS = ['Preço', 'Vai pensar / sem retorno', 'Fechou com outra clínica', 'Adiou o procedimento', 'Outro']

function chipSx(selected, color = brand.wine) {
  return {
    bgcolor: selected ? color : brand.surface,
    color: selected ? '#fff' : brand.ink,
    border: `1px solid ${selected ? color : brand.line}`,
    '&:hover': { bgcolor: selected ? color : brand.blush }
  }
}

export default function QuoteDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: quote, error, loading, reload, setData } = useAsync(() => afroditeApi.getQuote(id), [id])
  const [sheet, setSheet] = useState(null) // 'edit' | 'approve' | 'reject'
  const [approve, setApprove] = useState({ firstDueDate: todayKey(), paid: true, method: 'Pix' })
  const [reason, setReason] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sheetError, setSheetError] = useState(null)

  async function run(action) {
    setBusy(true)
    setSheetError(null)
    try {
      await action()
    } catch (err) {
      setSheetError(friendlyMessage(err, 'Não foi possível concluir.'))
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    // Abre o WhatsApp primeiro (o navegador só permite pop-up no clique)
    window.open(afroditeApi.quoteWhatsAppUrl(quote), '_blank', 'noopener')
    try {
      setData(await afroditeApi.markQuoteSent(id))
      toast('Orçamento enviado')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(afroditeApi.quoteShareText(quote))
      toast('Texto copiado')
    } catch {
      toast('Não foi possível copiar', { severity: 'error' })
    }
  }

  const decided = quote && ['Aprovado', 'Recusado'].includes(quote.status)
  const clientLink = quote && (quote.patientId ? `/pacientes/${quote.patientId}` : quote.leadId ? `/leads/${quote.leadId}` : null)

  return (
    <AppScreen header={<ScreenHeader back title={quote ? `Orçamento ${quote.code}` : 'Orçamento'} />}>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <Stack spacing={1.25}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      )}
      {quote && (
        <Stack spacing={1.25}>
          <Card>
            <CardActionArea
              disabled={!clientLink}
              onClick={() => clientLink && navigate(clientLink)}
              sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-start' }}
            >
              <PersonAvatar name={quote.clientName} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {quote.clientName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {quote.patientId ? 'Paciente' : 'Lead'} • {quote.clientPhone}
                </Typography>
              </Box>
              <StatusChip status={quote.displayStatus} />
              {clientLink && <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />}
            </CardActionArea>
          </Card>

          <Card sx={{ p: 2.25 }}>
            <Stack spacing={1.5}>
              {quote.items.map((i, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {i.name}
                      {i.qty > 1 ? ` × ${i.qty}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {i.category}
                      {i.category === 'Pacote' ? ` • ${i.sessions * i.qty} sessões` : ''}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatCurrency(i.unitPrice * i.qty)}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ borderTop: `1px solid ${brand.line}`, pt: 1.5 }}>
                {quote.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Desconto
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      − {formatCurrency(quote.discount)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle2">Total</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.02em' }}>{formatCurrency(quote.total)}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {quote.installments > 1 ? `Até ${quote.installments}x de ${formatCurrency(quote.total / quote.installments)} • ` : 'À vista • '}
                  válido até {formatDateKey(quote.validUntil)}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {quote.notes && (
            <Card sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Observações
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {quote.notes}
              </Typography>
            </Card>
          )}

          {quote.status === 'Aprovado' && (
            <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
              Aprovado — receitas lançadas no financeiro
              {quote.items.some((i) => i.category === 'Pacote') ? ' e pacote criado na ficha da paciente' : ''}.
            </Alert>
          )}
          {quote.status === 'Recusado' && <Alert severity="warning">Recusado{quote.rejectReason ? ` • ${quote.rejectReason}` : ''}</Alert>}

          {!decided && (
            <Stack spacing={1.25} sx={{ pt: 1 }}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={send}
                sx={{ backgroundImage: 'linear-gradient(135deg, #1fa855 0%, #25D366 100%)', boxShadow: '0 8px 20px -10px rgba(31,168,85,0.7)' }}
              >
                {quote.status === 'Rascunho' ? 'Enviar pelo WhatsApp' : 'Reenviar pelo WhatsApp'}
              </Button>
              {quote.status !== 'Rascunho' && (
                <Stack direction="row" spacing={1.25}>
                  <Button fullWidth size="large" variant="contained" onClick={() => setSheet('approve')}>
                    Aprovar
                  </Button>
                  <Button fullWidth size="large" variant="outlined" onClick={() => setSheet('reject')}>
                    Recusar
                  </Button>
                </Stack>
              )}
              <Stack direction="row" spacing={1.25}>
                <Button fullWidth variant="text" startIcon={<EditRoundedIcon />} onClick={() => setSheet('edit')}>
                  Editar
                </Button>
                <Button fullWidth variant="text" startIcon={<ContentCopyRoundedIcon />} onClick={copy}>
                  Copiar texto
                </Button>
              </Stack>
            </Stack>
          )}
          {quote.status === 'Aprovado' && quote.patientId && (
            <Button size="large" variant="outlined" onClick={() => navigate(`/financeiro?paciente=${quote.patientId}`)}>
              Ver no financeiro
            </Button>
          )}
        </Stack>
      )}

      <QuoteEditorSheet
        open={sheet === 'edit'}
        onClose={() => setSheet(null)}
        quote={quote}
        onSaved={(saved) => {
          setData(saved)
          toast('Orçamento atualizado')
        }}
      />

      <BottomSheet
        open={sheet === 'approve'}
        onClose={busy ? undefined : () => setSheet(null)}
        title="Aprovar orçamento"
        subtitle={
          quote &&
          `${formatCurrency(quote.total)}${quote.installments > 1 ? ` em ${quote.installments}x` : ''}${quote.leadId && !quote.patientId ? ' • o lead vira paciente' : ''}`
        }
        footer={
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { quote: approved } = await afroditeApi.approveQuote(id, approve)
                setData(approved)
                setSheet(null)
                toast('Venda fechada!')
              })
            }
          >
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Confirmar aprovação'}
          </Button>
        }
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          {sheetError && <Alert severity="error">{sheetError}</Alert>}
          <TextField
            label={quote?.installments > 1 ? 'Vencimento da 1ª parcela' : 'Vencimento'}
            type="date"
            value={approve.firstDueDate}
            onChange={(e) => setApprove((p) => ({ ...p, firstDueDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={<Switch checked={approve.paid} onChange={(e) => setApprove((p) => ({ ...p, paid: e.target.checked }))} />}
            label={<Typography variant="body2" fontWeight={600}>{quote?.installments > 1 ? '1ª parcela já recebida' : 'Já recebido'}</Typography>}
          />
          {approve.paid && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {afroditeApi.PAYMENT_METHODS.map((m) => (
                <Chip key={m} label={m} onClick={() => setApprove((p) => ({ ...p, method: m }))} sx={chipSx(approve.method === m)} />
              ))}
            </Box>
          )}
        </Stack>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'reject'}
        onClose={busy ? undefined : () => setSheet(null)}
        title="Recusar orçamento"
        footer={
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={!reason || busy}
            onClick={() =>
              run(async () => {
                setData(await afroditeApi.rejectQuote(id, reason))
                setSheet(null)
                toast('Orçamento marcado como recusado')
              })
            }
          >
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Marcar como recusado'}
          </Button>
        }
      >
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {sheetError && <Alert severity="error">{sheetError}</Alert>}
          <Typography variant="overline" color="text.secondary">
            Motivo
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {REJECT_REASONS.map((r) => (
              <Chip key={r} label={r} onClick={() => setReason(r)} sx={chipSx(reason === r, '#9b2c3e')} />
            ))}
          </Box>
        </Stack>
      </BottomSheet>
    </AppScreen>
  )
}
