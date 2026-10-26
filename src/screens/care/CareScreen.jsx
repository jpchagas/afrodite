import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import SectionTitle from '../../components/SectionTitle.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import CareTaskCard from './CareTaskCard.jsx'
import NewCareTaskSheet from './NewCareTaskSheet.jsx'

const TABS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'proximos', label: 'Próximos' },
  { value: 'concluidos', label: 'Concluídos' }
]

const EMPTY = {
  hoje: { title: 'Tudo em dia', description: 'Nenhum acompanhamento para hoje. Check-ins, retornos e manutenções aparecem aqui automaticamente.' },
  proximos: { title: 'Nada nos próximos dias', description: 'Ao registrar procedimentos, o plano de cuidados é criado sozinho.' },
  concluidos: { title: 'Nenhum acompanhamento concluído', description: 'Os contatos feitos ficam registrados aqui e no histórico da paciente.' }
}

export default function CareScreen() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const [creating, setCreating] = useState(false)
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'hoje'
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getCareTasks(tab), [tab, version])
  const counts = useAsync(() => afroditeApi.getCareCounts(), [version])
  const refresh = () => setVersion((v) => v + 1)

  const tabs = TABS.map((t) => ({
    ...t,
    count: t.value === 'hoje' ? counts.data?.today : t.value === 'proximos' ? counts.data?.upcoming : undefined
  }))
  const overdue = (data || []).filter((t) => t.overdue)
  const rest = (data || []).filter((t) => !t.overdue)

  const renderList = (items, offset = 0) => (
    <Stack spacing={1.25}>
      {items.map((t, idx) => (
        <CareTaskCard key={t.id} task={t} index={idx + offset} onChanged={refresh} />
      ))}
    </Stack>
  )

  return (
    <AppScreen
      nav
      fab={{ label: 'Nova tarefa', icon: <AddRoundedIcon />, onClick: () => setCreating(true) }}
      header={
        <ScreenHeader large back title="Acompanhamento" subtitle="Cuidado contínuo de cada paciente">
          <PillTabs value={tab} onChange={(v) => setParams(v === 'hoje' ? {} : { aba: v }, { replace: true })} items={tabs} />
        </ScreenHeader>
      }
    >
      {loading && <ListSkeleton count={4} height={120} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon={<VolunteerActivismRoundedIcon />} {...EMPTY[tab]} />}
      {data && tab === 'hoje' && overdue.length > 0 && (
        <>
          <SectionTitle sx={{ mt: 0 }}>Atrasados</SectionTitle>
          {renderList(overdue)}
          {rest.length > 0 && <SectionTitle>Hoje</SectionTitle>}
        </>
      )}
      {data && (tab !== 'hoje' || overdue.length === 0) && data.length > 0 && tab === 'hoje' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {data.length === 1 ? '1 paciente para acompanhar hoje' : `${data.length} pacientes para acompanhar hoje`}
        </Typography>
      )}
      {data && renderList(tab === 'hoje' ? rest : data, overdue.length)}

      <NewCareTaskSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          refresh()
          toast('Tarefa criada')
        }}
      />
    </AppScreen>
  )
}
