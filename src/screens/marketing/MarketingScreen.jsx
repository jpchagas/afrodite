import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Card, Chip, Stack, Switch, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import NewCampaignSheet from './NewCampaignSheet.jsx'

const TABS = [
  { value: 'campanhas', label: 'Campanhas' },
  { value: 'automacoes', label: 'Automações' }
]

const AUTOMATIONS = [
  {
    key: 'postProcedure',
    title: 'Plano de cuidados pós-procedimento',
    description: 'Ao registrar um procedimento, cria check-in em 24h, confirmação do retorno e lembrete de manutenção.'
  },
  { key: 'birthday', title: 'Aniversário', description: 'No dia do aniversário, cria a tarefa de parabéns com mensagem pronta.' },
  {
    key: 'reactivation',
    title: 'Reativação de pacientes',
    description: 'Cria tarefa para quem está sem visita há mais de',
    param: { options: [90, 120, 180] }
  },
  {
    key: 'leadNoContact',
    title: 'Leads sem contato',
    description: 'Leads abertos sem contato voltam para "Retomar hoje" depois de',
    param: { options: [2, 3, 7] }
  }
]

function CampaignsTab({ version }) {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getCampaigns(), [version])
  if (loading) return <ListSkeleton count={3} height={84} />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.length) {
    return (
      <EmptyState
        icon={<CampaignRoundedIcon />}
        title="Nenhuma campanha"
        description="Escolha um público (pacientes inativas, aniversariantes, leads perdidos…) e dispare mensagens personalizadas pelo WhatsApp."
      />
    )
  }
  return (
    <Stack spacing={1.25}>
      {data.map((c, idx) => (
        <ListCard
          key={c.id}
          index={idx}
          onClick={() => navigate(`/marketing/campanhas/${c.id}`)}
          leading={
            <Box sx={{ width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
              <CampaignRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
          }
          title={c.name}
          subtitle={`${c.segmentLabel} • ${c.stats.sent}/${c.stats.total} enviadas`}
          trailing={
            <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, fontSize: '0.72rem', fontWeight: 650, whiteSpace: 'nowrap', bgcolor: c.status === 'Concluída' ? '#e8f3ec' : '#fbf1df', color: c.status === 'Concluída' ? '#2f6b47' : '#865a14' }}>
              {c.status}
            </Box>
          }
        />
      ))}
    </Stack>
  )
}

function AutomationsTab() {
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(() => afroditeApi.getAutomations(), [])
  if (loading) return <ListSkeleton count={4} height={96} />
  if (error) return <ErrorState error={error} onRetry={reload} />

  async function change(key, changes, message) {
    const previous = data
    setData({ ...data, [key]: { ...data[key], ...changes } })
    try {
      await afroditeApi.updateAutomation(key, changes)
      toast(message)
    } catch (err) {
      setData(previous)
      toast(friendlyMessage(err, 'Não foi possível salvar'), { severity: 'error' })
    }
  }

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        As automações rodam todo dia às 8h e criam tarefas em Acompanhamento com a mensagem pronta. O envio automático pelo WhatsApp chega com a integração oficial.
      </Alert>
      <Stack spacing={1.25}>
        {AUTOMATIONS.map((a) => {
          const cfg = data[a.key]
          return (
            <Card key={a.key} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{a.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.description}
                    {a.param ? ` ${cfg.days} dias.` : ''}
                  </Typography>
                </Box>
                <Switch
                  checked={cfg.enabled}
                  onChange={(e) => change(a.key, { enabled: e.target.checked }, e.target.checked ? `${a.title}: ativada` : `${a.title}: desativada`)}
                  inputProps={{ 'aria-label': a.title }}
                />
              </Box>
              {a.param && cfg.enabled && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                  {a.param.options.map((d) => (
                    <Chip
                      key={d}
                      size="small"
                      label={`${d} dias`}
                      onClick={() => change(a.key, { days: d }, `${a.title}: ${d} dias`)}
                      sx={{
                        bgcolor: cfg.days === d ? brand.wine : brand.surface,
                        color: cfg.days === d ? '#fff' : brand.ink,
                        border: `1px solid ${cfg.days === d ? brand.wine : brand.line}`,
                        '&:hover': { bgcolor: cfg.days === d ? brand.wine : brand.blush }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Card>
          )
        })}
      </Stack>
    </>
  )
}

export default function MarketingScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'campanhas'

  return (
    <AppScreen
      nav
      fab={tab === 'campanhas' ? { label: 'Nova campanha', icon: <AddRoundedIcon />, onClick: () => setCreating(true) } : undefined}
      header={
        <ScreenHeader large back title="Marketing">
          <PillTabs value={tab} onChange={(v) => setParams(v === 'campanhas' ? {} : { aba: v }, { replace: true })} items={TABS} />
        </ScreenHeader>
      }
    >
      {tab === 'campanhas' && <CampaignsTab version={0} />}
      {tab === 'automacoes' && <AutomationsTab />}
      <NewCampaignSheet open={creating} onClose={() => setCreating(false)} onCreated={(c) => navigate(`/marketing/campanhas/${c.id}`)} />
    </AppScreen>
  )
}
