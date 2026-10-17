import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, InputAdornment, Fab, Stack, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader from '../../components/ScreenHeader.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import NewPatientSheet from './partials/NewPatientSheet.jsx'

const FILTERS = [
  { value: 'Todos', test: () => true },
  { value: 'Ativos', test: (p) => p.status !== 'Inativa' },
  { value: 'Inativos', test: (p) => p.status === 'Inativa' }
]

function normalize(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function PatientsListScreen() {
  const navigate = useNavigate()
  const { data: patients, error, loading, reload, setData } = useAsync(() => afroditeApi.getPatients(), [])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [creating, setCreating] = useState(false)

  const searched = useMemo(() => {
    if (!patients) return []
    const term = normalize(search.trim())
    const digits = search.replace(/\D/g, '')
    return patients.filter(
      (p) =>
        !term ||
        normalize(p.name).includes(term) ||
        (digits && (p.cpf?.replace(/\D/g, '').includes(digits) || p.phone?.replace(/\D/g, '').includes(digits)))
    )
  }, [patients, search])

  const filtered = searched.filter(FILTERS.find((f) => f.value === filter).test)

  const tabs = FILTERS.map((f) => ({
    value: f.value,
    label: f.value,
    count: patients ? searched.filter(f.test).length : undefined
  }))

  function handleCreated(patient) {
    setData((prev) => [...(prev || []), patient].sort((a, b) => a.name.localeCompare(b.name)))
    navigate(`/pacientes/${patient.id}`)
  }

  return (
    <AppScreen
      nav
      header={
        <ScreenHeader large title="Pacientes" actions={<NotificationBell />}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nome, CPF ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { height: 44 } }}
          />
          <PillTabs value={filter} onChange={setFilter} items={tabs} />
        </ScreenHeader>
      }
    >
      {loading && <ListSkeleton count={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {patients && filtered.length === 0 && (
        <EmptyState
          icon={<PeopleAltRoundedIcon />}
          title={search ? 'Nenhum resultado' : 'Nenhum paciente'}
          description={search ? `Nada encontrado para "${search}".` : 'Cadastre a primeira paciente no botão +.'}
        />
      )}

      <Stack spacing={1.25}>
        {filtered.map((patient, idx) => (
          <ListCard
            key={patient.id}
            index={idx}
            onClick={() => navigate(`/pacientes/${patient.id}`)}
            leading={<PersonAvatar name={patient.name} />}
            title={patient.name}
            subtitle={[patient.age && `${patient.age} anos`, patient.phone].filter(Boolean).join(' • ')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
              <StatusChip status={patient.status} />
              {patient.nextReturn !== '—' && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  Retorno {patient.nextReturn}
                </Typography>
              )}
            </Box>
          </ListCard>
        ))}
      </Stack>

      <Fab
        color="primary"
        aria-label="Nova paciente"
        onClick={() => setCreating(true)}
        sx={{ position: 'fixed', right: 20, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
      >
        <AddRoundedIcon />
      </Fab>

      <NewPatientSheet open={creating} onClose={() => setCreating(false)} onCreated={handleCreated} />
    </AppScreen>
  )
}
