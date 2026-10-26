import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, LinearProgress, Skeleton, Stack, Typography } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { gradients, shadows } from '../../theme/theme.js'
import { TONES } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import MetricCard from '../../components/MetricCard.jsx'
import SectionTitle from '../../components/SectionTitle.jsx'
import ListCard from '../../components/ListCard.jsx'
import { ErrorState } from '../../components/StateViews.jsx'

const RECIPIENT_STATUS = {
  enviado: { label: 'Enviado', tone: TONES.success },
  pulado: { label: 'Pulado', tone: TONES.neutral },
  pendente: { label: 'Pendente', tone: TONES.warning }
}

export default function CampaignDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: campaign, error, loading, reload, setData } = useAsync(() => afroditeApi.getCampaign(id), [id])
  const results = useAsync(() => (campaign ? afroditeApi.getCampaignResults(campaign) : null), [campaign?.stats.sent])
  const [busy, setBusy] = useState(false)

  const nextIndex = campaign ? campaign.recipients.findIndex((r) => r.status === 'pendente') : -1
  const next = nextIndex >= 0 ? campaign.recipients[nextIndex] : null

  async function mark(status) {
    setBusy(true)
    try {
      setData(await afroditeApi.markCampaignRecipient(id, nextIndex, status))
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function send() {
    // Abre o WhatsApp no clique (exigência dos navegadores) e marca como enviado
    window.open(afroditeApi.campaignWhatsAppUrl(campaign, next), '_blank', 'noopener')
    mark('enviado')
  }

  const s = campaign?.stats
  return (
    <AppScreen header={<ScreenHeader back title={campaign?.name || 'Campanha'} />}>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && <Skeleton variant="rounded" height={220} />}
      {campaign && (
        <>
          <Card sx={{ p: 2.25, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
            <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
              {campaign.segmentLabel}
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              {s.sent} de {s.total}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              mensagens enviadas{s.skipped ? ` • ${s.skipped} ${s.skipped === 1 ? 'pulada' : 'puladas'}` : ''}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((s.sent + s.skipped) / s.total) * 100}
              sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#e9cf9f', borderRadius: 3 } }}
            />
          </Card>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.25 }}>
            <MetricCard loading={results.loading} label="Agendaram depois" value={results.data?.booked ?? 0} hint="pacientes, em até 30 dias" />
            <MetricCard loading={results.loading} label="Leads convertidos" value={results.data?.converted ?? 0} hint="viraram pacientes" />
          </Box>

          {next ? (
            <>
              <SectionTitle>Próximo envio</SectionTitle>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <PersonAvatar name={next.name} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {next.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {next.kind === 'lead' ? 'Lead' : 'Paciente'} • {next.phone}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {s.sent + s.skipped + 1}/{s.total}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: '#f1e3e9', borderRadius: '18px', borderBottomRightRadius: 6, px: 1.5, py: 1, mb: 1.75 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {afroditeApi.personalize(campaign.message, next)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.25}>
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    disabled={busy}
                    onClick={send}
                    sx={{ backgroundImage: 'linear-gradient(135deg, #1fa855 0%, #25D366 100%)', boxShadow: '0 8px 20px -10px rgba(31,168,85,0.7)' }}
                  >
                    Enviar e próximo
                  </Button>
                  <Button size="large" variant="outlined" startIcon={<SkipNextRoundedIcon />} disabled={busy} onClick={() => mark('pulado')}>
                    Pular
                  </Button>
                </Stack>
              </Card>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                O WhatsApp abre com a mensagem pronta — é só tocar em enviar e voltar para o próximo.
              </Typography>
            </>
          ) : (
            <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ mt: 2 }}>
              Campanha concluída — todos os destinatários foram atendidos.
            </Alert>
          )}

          <SectionTitle>Destinatários</SectionTitle>
          <Stack spacing={1.25}>
            {campaign.recipients.map((r, idx) => {
              const st = RECIPIENT_STATUS[r.status]
              return (
                <ListCard
                  key={`${r.kind}-${r.id}`}
                  index={idx}
                  onClick={() => navigate(r.kind === 'lead' ? `/leads/${r.id}` : `/pacientes/${r.id}`)}
                  leading={<PersonAvatar name={r.name} size={36} />}
                  title={r.name}
                  subtitle={r.kind === 'lead' ? 'Lead' : 'Paciente'}
                  trailing={
                    <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, fontSize: '0.72rem', fontWeight: 650, bgcolor: st.tone.bg, color: st.tone.fg }}>
                      {results.data?.names.includes(r.name) ? 'Agendou' : st.label}
                    </Box>
                  }
                  chevron={false}
                />
              )
            })}
          </Stack>
        </>
      )}
    </AppScreen>
  )
}
