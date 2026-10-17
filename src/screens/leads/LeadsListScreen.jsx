import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ViewKanbanRoundedIcon from '@mui/icons-material/ViewKanbanRounded'
import ViewAgendaRoundedIcon from '@mui/icons-material/ViewAgendaRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader, { HeaderIconButton } from '../../components/ScreenHeader.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import FollowUpChip from '../../components/FollowUpChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import NewLeadSheet from './NewLeadSheet.jsx'
import PipelineBoard from './PipelineBoard.jsx'

const FILTERS = [
  { value: 'Todos', test: () => true },
  { value: 'Retomar', test: (l) => l.followUpState === 'overdue' || l.followUpState === 'today' },
  { value: 'Novos', test: (l) => l.status === 'Novo' },
  { value: 'Em contato', test: (l) => l.status === 'Em contato' || l.status === 'Qualificado' },
  { value: 'Propostas', test: (l) => l.status === 'Proposta' },
  { value: 'Convertidos', test: (l) => l.status === 'Convertido' },
  { value: 'Perdidos', test: (l) => l.status === 'Perdido' }
]

const URGENCY = { overdue: 0, today: 1 }

function normalize(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function LeadsListScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: leads, error, loading, reload, setData } = useAsync(() => afroditeApi.getLeads(), [])
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const view = params.get('visao') === 'funil' ? 'funil' : 'lista'
  const filter = FILTERS.some((f) => f.value === params.get('filtro')) ? params.get('filtro') : 'Todos'
  const setView = (v) => setParams({ ...(v === 'funil' ? { visao: 'funil' } : {}), ...(filter !== 'Todos' && v !== 'funil' ? { filtro: filter } : {}) }, { replace: true })
  const setFilter = (f) => setParams(f === 'Todos' ? {} : { filtro: f }, { replace: true })

  const searched = useMemo(() => {
    if (!leads) return []
    const term = normalize(search.trim())
    const digits = search.replace(/\D/g, '')
    if (!term) return leads
    return leads.filter(
      (l) =>
        normalize(l.name).includes(term) ||
        normalize(l.interest).includes(term) ||
        (digits.length >= 3 && l.phone?.replace(/\D/g, '').includes(digits))
    )
  }, [leads, search])

  const active = FILTERS.find((f) => f.value === filter)
  let filtered = searched.filter(active.test)
  if (filter === 'Retomar') {
    filtered = [...filtered].sort((a, b) => URGENCY[a.followUpState] - URGENCY[b.followUpState] || a.nextFollowUp.localeCompare(b.nextFollowUp))
  }

  const openLeads = (leads || []).filter(afroditeApi.isOpenLead)
  const pipeline = openLeads.reduce((sum, l) => sum + (l.proposalValue || 0), 0)
  const dueCount = (leads || []).filter(FILTERS[1].test).length

  const tabs = FILTERS.map((f) => ({
    value: f.value,
    label: f.value,
    count: leads ? searched.filter(f.test).length : undefined
  })).filter((t) => t.value !== 'Perdidos' || t.count)

  return (
    <AppScreen
      nav
      fab={{ label: 'Novo lead', icon: <AddRoundedIcon />, onClick: () => setCreating(true) }}
      header={
        <ScreenHeader
          large
          title="Leads"
          subtitle={
            leads
              ? `${formatCurrency(pipeline, { cents: false })} em negociação • ${openLeads.length} ${openLeads.length === 1 ? 'lead aberto' : 'leads abertos'}`
              : ' '
          }
          actions={
            <>
              <HeaderIconButton
                aria-label={view === 'funil' ? 'Ver em lista' : 'Ver funil'}
                onClick={() => setView(view === 'funil' ? 'lista' : 'funil')}
                sx={view === 'funil' ? { bgcolor: brand.wine, color: '#fff', '&:hover': { bgcolor: brand.wine } } : undefined}
              >
                {view === 'funil' ? <ViewAgendaRoundedIcon sx={{ fontSize: 20 }} /> : <ViewKanbanRoundedIcon sx={{ fontSize: 20 }} />}
              </HeaderIconButton>
              <NotificationBell />
            </>
          }
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome, interesse ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: view === 'lista' ? 1.5 : 0, '& .MuiOutlinedInput-root': { height: 44 } }}
          />
          {view === 'lista' && <PillTabs value={filter} onChange={setFilter} items={tabs} />}
        </ScreenHeader>
      }
    >
      {loading && <ListSkeleton count={5} height={84} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {leads && view === 'funil' && (
        <>
          {dueCount > 0 && (
            <Typography variant="body2" sx={{ mb: 1.5, color: '#865a14', fontWeight: 600 }}>
              {dueCount === 1 ? '1 lead para retomar hoje' : `${dueCount} leads para retomar hoje`}
            </Typography>
          )}
          <PipelineBoard
            leads={searched}
            onShowOutcome={(f) => setParams({ filtro: f }, { replace: true })}
          />
        </>
      )}

      {leads && view === 'lista' && (
        <>
          {filtered.length === 0 && (
            <EmptyState
              icon={<PersonSearchRoundedIcon />}
              title={filter === 'Retomar' ? 'Nenhum contato pendente' : 'Nenhum lead'}
              description={
                search
                  ? `Nada encontrado para "${search}".`
                  : filter === 'Retomar'
                    ? 'Todos os leads com próximo contato para hoje já foram atendidos.'
                    : 'Nada nesta etapa do funil.'
              }
            />
          )}

          <Stack spacing={1.25}>
            {filtered.map((lead, idx) => (
              <ListCard
                key={lead.id}
                index={idx}
                onClick={() => navigate(`/leads/${lead.id}`)}
                leading={<PersonAvatar name={lead.name} />}
                title={lead.name}
                subtitle={lead.interest}
                trailing={
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start', pt: 0.25, whiteSpace: 'nowrap' }}>
                    {lead.createdAtLabel}
                  </Typography>
                }
                chevron={false}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                  <StatusChip status={lead.status} />
                  <FollowUpChip lead={lead} />
                  {!lead.followUpState && (
                    <Typography variant="caption" sx={{ color: brand.muted }} noWrap>
                      {lead.status === 'Perdido' && lead.lostReason ? lead.lostReason : lead.source}
                    </Typography>
                  )}
                </Box>
              </ListCard>
            ))}
          </Stack>
        </>
      )}

      <NewLeadSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(lead) => {
          setData((prev) => [lead, ...(prev || [])])
          navigate(`/leads/${lead.id}`)
        }}
      />
    </AppScreen>
  )
}
