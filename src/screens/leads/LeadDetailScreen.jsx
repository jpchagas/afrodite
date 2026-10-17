import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Card, Button, Stack, Skeleton, ButtonBase, LinearProgress } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import { brand } from '../../theme/theme.js'
import { toneFor } from '../../theme/status.js'
import { friendlyMessage } from '../../utils/errors.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader, { HeaderIconButton } from '../../components/ScreenHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import InfoField from '../../components/InfoField.jsx'
import { ErrorState } from '../../components/StateViews.jsx'

const TABS = ['Informações', 'Pagamentos', 'Funil']

export default function LeadDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const { data: lead, error, loading, reload, setData } = useAsync(() => afroditeApi.getLead(id), [id])

  return (
    <AppScreen
      header={
        <ScreenHeader
          back
          title="Lead"
          actions={
            lead && (
              <HeaderIconButton aria-label="Ligar" component="a" href={`tel:${lead.phone.replace(/\D/g, '')}`}>
                <PhoneRoundedIcon sx={{ fontSize: 19 }} />
              </HeaderIconButton>
            )
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {lead ? <PersonAvatar name={lead.name} size={60} /> : <Skeleton variant="circular" width={60} height={60} />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {lead ? (
                <>
                  <Typography variant="h5" component="h2" noWrap>
                    {lead.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {lead.phone}
                  </Typography>
                  <StatusChip status={lead.status} sx={{ mt: 0.75 }} />
                </>
              ) : (
                <>
                  <Skeleton width="60%" height={30} />
                  <Skeleton width="40%" />
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <SectionTabs value={tab} onChange={setTab} items={TABS} />
          </Box>
        </ScreenHeader>
      }
    >
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <Stack spacing={1.25}>
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={90} />
        </Stack>
      )}

      {lead && tab === 0 && (
        <Stack spacing={1.25}>
          <Card sx={{ p: 2.25 }}>
            <Stack spacing={2}>
              <InfoField label="Interesse" value={lead.interest} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <InfoField label="Origem" value={lead.source} />
                <InfoField label="Primeiro contato" value={lead.createdAtLabel} />
              </Box>
              {lead.notes && <InfoField label="Notas" value={lead.notes} />}
            </Stack>
          </Card>

          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<WhatsAppIcon />}
            onClick={() => navigate(`/leads/${lead.id}/whatsapp`)}
            sx={{
              mt: 1.5,
              backgroundImage: 'linear-gradient(135deg, #1fa855 0%, #25D366 100%)',
              boxShadow: '0 8px 20px -10px rgba(31,168,85,0.7)',
              '&:hover': { backgroundImage: 'linear-gradient(135deg, #1a8f48 0%, #1fa855 100%)' }
            }}
          >
            Conversar no WhatsApp
          </Button>
        </Stack>
      )}

      {lead && tab === 1 && <PagamentosTab lead={lead} />}
      {lead && tab === 2 && <FunilTab lead={lead} onUpdated={setData} />}
    </AppScreen>
  )
}

function PagamentosTab({ lead }) {
  const paidPct = lead.proposalValue ? Math.min(100, Math.round((lead.downPayment / lead.proposalValue) * 100)) : 0
  return (
    <Card sx={{ p: 2.25 }}>
      <Typography variant="overline" color="text.secondary">
        Valor da proposta
      </Typography>
      <Typography sx={{ fontSize: '1.9rem', fontWeight: 650, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(lead.proposalValue)}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={paidPct}
        sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: brand.blush, '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundImage: `linear-gradient(90deg, ${brand.wine}, ${brand.rose})` } }}
      />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
        {paidPct}% pago como sinal
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2.5 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Sinal pago
          </Typography>
          <Typography variant="subtitle1" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(lead.downPayment)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Saldo restante
          </Typography>
          <Typography variant="subtitle1" sx={{ color: brand.wine, fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(Math.max(lead.proposalValue - lead.downPayment, 0))}
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}

function FunilTab({ lead, onUpdated }) {
  const toast = useToast()
  const [saving, setSaving] = useState(null)
  const currentIdx = afroditeApi.LEAD_STATUSES.indexOf(lead.status)

  async function changeStatus(status) {
    if (status === lead.status || saving) return
    setSaving(status)
    try {
      onUpdated(await afroditeApi.updateLeadStatus(lead.id, status))
      toast(`Lead movido para "${status}"`)
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Toque em uma etapa para mover o lead no funil.
      </Typography>
      <Card sx={{ overflow: 'hidden' }}>
        {afroditeApi.LEAD_STATUSES.map((status, idx) => {
          const done = idx < currentIdx
          const current = idx === currentIdx
          const tone = toneFor(status)
          return (
            <ButtonBase
              key={status}
              onClick={() => changeStatus(status)}
              disabled={!!saving}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: 1.75,
                px: 2,
                py: 1.5,
                borderTop: idx ? `1px solid ${brand.line}` : 'none',
                bgcolor: current ? tone.bg : 'transparent',
                transition: 'background-color 200ms ease'
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: done || current ? brand.wine : 'transparent',
                  border: `2px solid ${done || current ? brand.wine : brand.roseLight}`,
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {done ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : current ? idx + 1 : ''}
              </Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: current ? 700 : 500, color: current ? tone.fg : done ? 'text.primary' : 'text.secondary' }}
              >
                {status}
              </Typography>
              {saving === status && <Typography variant="caption" sx={{ ml: 'auto' }}>Salvando…</Typography>}
            </ButtonBase>
          )
        })}
      </Card>
    </>
  )
}
