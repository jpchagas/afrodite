import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Button, Card, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import { brand, gradients, shadows } from '../../theme/theme.js'
import { TONES } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { formatDateKey } from '../../services/dates.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import MetricCard from '../../components/MetricCard.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import SectionTitle from '../../components/SectionTitle.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import NewAppointmentSheet from '../agenda/NewAppointmentSheet.jsx'
import QuoteEditorSheet from './QuoteEditorSheet.jsx'
import CatalogItemSheet from './CatalogItemSheet.jsx'

const TABS = [
  { value: 'orcamentos', label: 'Orçamentos' },
  { value: 'oportunidades', label: 'Oportunidades' },
  { value: 'catalogo', label: 'Catálogo' }
]
const QUOTE_FILTERS = ['Todos', 'Rascunho', 'Enviado', 'Aprovado', 'Recusado', 'Expirado']

function IconTile({ children, tone = { bg: brand.blush, fg: brand.wine } }) {
  return (
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: tone.bg, color: tone.fg, '& svg': { fontSize: 20 } }}>
      {children}
    </Box>
  )
}

function QuotesTab({ version }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('Todos')
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getSalesSummary(), [version])

  if (loading) return <ListSkeleton count={4} height={80} />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const quotes = data.quotes.filter((q) => filter === 'Todos' || q.displayStatus === filter)
  return (
    <>
      <Card sx={{ p: 2.25, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
        <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
          Vendido no mês
        </Typography>
        <Typography sx={{ fontSize: '2rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          {formatCurrency(data.approvedValue, { cents: false })}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          {data.approvedCount} {data.approvedCount === 1 ? 'orçamento aprovado' : 'orçamentos aprovados'} • {data.sentCount} enviados
        </Typography>
      </Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.25 }}>
        <MetricCard label="Conversão no mês" value={data.conversionPct == null ? '—' : `${data.conversionPct}%`} hint="aprovados ÷ decididos" />
        <MetricCard
          label="Aguardando resposta"
          value={formatCurrency(data.openValue, { cents: false })}
          hint={`${data.openCount} ${data.openCount === 1 ? 'orçamento' : 'orçamentos'}`}
          onClick={() => setFilter('Enviado')}
        />
      </Box>

      <SectionTitle>Orçamentos</SectionTitle>
      <PillTabs
        value={filter}
        onChange={setFilter}
        items={QUOTE_FILTERS.map((f) => ({
          value: f,
          label: f,
          count: f === 'Todos' ? data.quotes.length : data.quotes.filter((q) => q.displayStatus === f).length
        })).filter((t) => t.value === 'Todos' || t.count)}
        sx={{ mb: 1.5 }}
      />
      {quotes.length === 0 && (
        <EmptyState icon={<RequestQuoteRoundedIcon />} title="Nenhum orçamento" description="Crie orçamentos a partir do catálogo e envie pelo WhatsApp." />
      )}
      <Stack spacing={1.25}>
        {quotes.map((q, idx) => (
          <ListCard
            key={q.id}
            index={idx}
            onClick={() => navigate(`/vendas/orcamentos/${q.id}`)}
            leading={<PersonAvatar name={q.clientName} />}
            title={q.clientName}
            subtitle={`${q.code} • ${q.items.map((i) => i.name).join(', ')}`}
            trailing={
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(q.total, { cents: false })}
                </Typography>
                <StatusChip status={q.displayStatus} sx={{ mt: 0.5 }} />
              </Box>
            }
            chevron={false}
          />
        ))}
      </Stack>
    </>
  )
}

function OpportunitiesTab({ onSchedule, version }) {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getSalesOpportunities(), [version])
  if (loading) return <ListSkeleton count={4} height={96} />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Pacientes perto da manutenção recomendada e sem horário marcado.
      </Typography>
      {data.maintenance.length === 0 && (
        <EmptyState icon={<AutorenewRoundedIcon />} title="Nenhuma manutenção pendente" description="Defina a manutenção recomendada no catálogo para gerar oportunidades." />
      )}
      <Stack spacing={1.25}>
        {data.maintenance.map((o, idx) => {
          const overdue = o.overdueDays > 0
          return (
            <Card key={o.id} sx={{ p: 1.75, animation: 'afFadeUp 420ms both', animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <PersonAvatar name={o.patientName} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {o.patientName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {o.procedure} • último em {formatDateKey(o.lastDate)}
                  </Typography>
                </Box>
                <Box
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 650,
                    whiteSpace: 'nowrap',
                    bgcolor: overdue ? TONES.danger.bg : TONES.warning.bg,
                    color: overdue ? TONES.danger.fg : TONES.warning.fg
                  }}
                >
                  {overdue ? `Venceu há ${o.overdueDays}d` : o.overdueDays === 0 ? 'Vence hoje' : `Vence em ${-o.overdueDays}d`}
                </Box>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<WhatsAppIcon />}
                  component="a"
                  href={afroditeApi.maintenanceWhatsAppUrl(o)}
                  target="_blank"
                  rel="noopener"
                  sx={{ color: '#1f8a4c' }}
                >
                  Chamar
                </Button>
                <Button fullWidth size="small" variant="contained" startIcon={<EventAvailableRoundedIcon />} onClick={() => onSchedule(o)}>
                  Agendar
                </Button>
              </Stack>
            </Card>
          )
        })}
      </Stack>

      {data.awaiting.length > 0 && (
        <>
          <SectionTitle>Orçamentos sem resposta</SectionTitle>
          <Stack spacing={1.25}>
            {data.awaiting.map((q, idx) => (
              <ListCard
                key={q.id}
                index={idx}
                onClick={() => navigate(`/vendas/orcamentos/${q.id}`)}
                leading={
                  <IconTile tone={{ bg: TONES.warning.bg, fg: TONES.warning.fg }}>
                    <HourglassBottomRoundedIcon />
                  </IconTile>
                }
                title={q.clientName}
                subtitle={`${formatCurrency(q.total, { cents: false })} • enviado em ${q.sentAt.toLocaleDateString('pt-BR')}`}
              />
            ))}
          </Stack>
        </>
      )}
    </>
  )
}

function CatalogTab({ version, onEdit }) {
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getCatalog(), [version])
  if (loading) return <ListSkeleton count={5} height={72} />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.length) {
    return <EmptyState icon={<MenuBookRoundedIcon />} title="Catálogo vazio" description="Cadastre procedimentos, pacotes e produtos com preço." />
  }
  return afroditeApi.CATALOG_CATEGORIES.map((cat) => {
    const items = data.filter((c) => c.category === cat)
    if (!items.length) return null
    return (
      <Box key={cat}>
        <SectionTitle sx={{ mt: 2 }}>{cat === 'Pacote' ? 'Pacotes' : cat === 'Produto' ? 'Produtos' : cat === 'Consulta' ? 'Consultas' : 'Procedimentos'}</SectionTitle>
        <Stack spacing={1.25}>
          {items.map((c, idx) => (
            <Box key={c.id} sx={{ opacity: c.active ? 1 : 0.55 }}>
              <ListCard
                index={idx}
                onClick={() => onEdit(c)}
                title={c.name}
                subtitle={[
                  c.category === 'Pacote' && `${c.sessions} sessões`,
                  c.durationMin && `${c.durationMin} min`,
                  c.maintenanceDays && `manutenção ${c.maintenanceDays} dias`,
                  !c.active && 'inativo'
                ]
                  .filter(Boolean)
                  .join(' • ')}
                trailing={
                  <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(c.price, { cents: false })}
                  </Typography>
                }
              />
            </Box>
          ))}
        </Stack>
      </Box>
    )
  })
}

export default function SalesScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const [sheet, setSheet] = useState(null) // 'quote' | { catalog: item|null } | { schedule: opportunity }
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'orcamentos'

  const fab =
    tab === 'catalogo'
      ? { label: 'Novo item do catálogo', icon: <AddRoundedIcon />, onClick: () => setSheet({ catalog: null }) }
      : { label: 'Novo orçamento', icon: <AddRoundedIcon />, onClick: () => setSheet('quote') }

  return (
    <AppScreen
      nav
      fab={tab === 'oportunidades' ? undefined : fab}
      header={
        <ScreenHeader large back title="Vendas">
          <PillTabs value={tab} onChange={(t) => setParams(t === 'orcamentos' ? {} : { aba: t }, { replace: true })} items={TABS} />
        </ScreenHeader>
      }
    >
      {tab === 'orcamentos' && <QuotesTab version={version} />}
      {tab === 'oportunidades' && <OpportunitiesTab version={version} onSchedule={(o) => setSheet({ schedule: o })} />}
      {tab === 'catalogo' && <CatalogTab version={version} onEdit={(c) => setSheet({ catalog: c })} />}

      <QuoteEditorSheet
        open={sheet === 'quote'}
        onClose={() => setSheet(null)}
        onSaved={(q) => navigate(`/vendas/orcamentos/${q.id}`)}
      />
      <CatalogItemSheet
        open={!!sheet && 'catalog' in sheet}
        onClose={() => setSheet(null)}
        item={sheet?.catalog || null}
        onSaved={() => {
          setVersion((v) => v + 1)
          toast('Catálogo atualizado')
        }}
      />
      <NewAppointmentSheet
        open={!!sheet?.schedule}
        onClose={() => setSheet(null)}
        patient={sheet?.schedule && { id: sheet.schedule.patientId, name: sheet.schedule.patientName }}
        defaultProcedure={sheet?.schedule?.procedure}
        onCreated={(appt) => {
          setVersion((v) => v + 1)
          toast(`${appt.patientName} agendada para ${formatDateKey(appt.dateKey)} às ${appt.time}`)
        }}
      />
    </AppScreen>
  )
}
