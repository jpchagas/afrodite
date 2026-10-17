import React, { useState } from 'react'
import { Box, Button, Stack } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import { brand } from '../../../theme/theme.js'
import { useToast } from '../../../context/ToastContext.jsx'
import PillTabs from '../../../components/PillTabs.jsx'
import ListCard from '../../../components/ListCard.jsx'
import StatusChip from '../../../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/StateViews.jsx'

const FILTERS = [
  { value: 'Todos', test: () => true },
  { value: 'Realizados', test: (p) => p.status === 'Concluído' },
  { value: 'Em andamento', test: (p) => p.status === 'Em andamento' }
]

function ProcIcon() {
  return (
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
      <SpaRoundedIcon sx={{ fontSize: 20 }} />
    </Box>
  )
}

// `state` vem de useAsync(getPatientProcedures) na tela de perfil
export default function ProceduresList({ state }) {
  const toast = useToast()
  const [filter, setFilter] = useState('Todos')
  const procedures = state.data

  const items = FILTERS.map((f) => ({
    value: f.value,
    label: f.value,
    count: procedures ? procedures.filter(f.test).length : undefined
  }))
  const filtered = procedures ? procedures.filter(FILTERS.find((f) => f.value === filter).test) : []

  return (
    <Box>
      <PillTabs value={filter} onChange={setFilter} items={items} sx={{ mb: 2 }} />

      {state.loading && <ListSkeleton count={3} height={72} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}
      {procedures && filtered.length === 0 && (
        <EmptyState icon={<SpaRoundedIcon />} title="Nenhum procedimento" description="Nada registrado nesta categoria." />
      )}

      <Stack spacing={1.25}>
        {filtered.map((proc, idx) => (
          <ListCard
            key={proc.id}
            index={idx}
            leading={<ProcIcon />}
            title={proc.name}
            subtitle={`${proc.date} • ${proc.area}`}
            trailing={<StatusChip status={proc.status} />}
          />
        ))}
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        onClick={() => toast('Cadastro de procedimentos chega em breve.', { severity: 'info' })}
        sx={{ mt: 2.5 }}
      >
        Novo procedimento
      </Button>
    </Box>
  )
}
