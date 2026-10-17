import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import NewLeadSheet from './NewLeadSheet.jsx'

const FILTERS = [
  { value: 'Todos', test: () => true },
  { value: 'Novos', test: (l) => l.status === 'Novo' },
  { value: 'Em contato', test: (l) => l.status === 'Em contato' || l.status === 'Qualificado' },
  { value: 'Propostas', test: (l) => l.status === 'Proposta' },
  { value: 'Convertidos', test: (l) => l.status === 'Convertido' }
]

export default function LeadsListScreen() {
  const navigate = useNavigate()
  const { data: leads, error, loading, reload, setData } = useAsync(() => afroditeApi.getLeads(), [])
  const [filter, setFilter] = useState('Todos')
  const [creating, setCreating] = useState(false)

  const filtered = (leads || []).filter(FILTERS.find((f) => f.value === filter).test)
  const pipeline = (leads || [])
    .filter((l) => l.status !== 'Convertido')
    .reduce((sum, l) => sum + (l.proposalValue || 0), 0)

  const tabs = FILTERS.map((f) => ({
    value: f.value,
    label: f.value,
    count: leads ? leads.filter(f.test).length : undefined
  }))

  return (
    <AppScreen
      nav
      fab={{ label: 'Novo lead', icon: <AddRoundedIcon />, onClick: () => setCreating(true) }}
      header={
        <ScreenHeader
          large
          title="Leads"
          actions={<NotificationBell />}
          subtitle={leads ? `${formatCurrency(pipeline, { cents: false })} em negociação` : ' '}
        >
          <PillTabs value={filter} onChange={setFilter} items={tabs} />
        </ScreenHeader>
      }
    >
      {loading && <ListSkeleton count={5} height={84} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {leads && filtered.length === 0 && (
        <EmptyState icon={<PersonSearchRoundedIcon />} title="Nenhum lead" description="Nada nesta etapa do funil." />
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
              <StatusChip status={lead.status} />
              <Typography variant="caption" sx={{ color: brand.muted }} noWrap>
                {lead.source}
              </Typography>
            </Box>
          </ListCard>
        ))}
      </Stack>

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
