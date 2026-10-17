import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded'
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'

const TABS = ['Ativas', 'Histórico']

function RxIcon() {
  return (
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
      <MedicationRoundedIcon sx={{ fontSize: 20 }} />
    </Box>
  )
}

export default function PrescriptionsScreen() {
  const { id } = useParams()
  const toast = useToast()
  const [tab, setTab] = useState(0)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const prescriptions = useAsync(() => afroditeApi.getPatientPrescriptions(id), [id])

  const filtered = (prescriptions.data || []).filter((p) => (tab === 0 ? p.active : !p.active))

  return (
    <AppScreen
      header={
        <PatientHeader patient={patient.data} error={patient.error} title="Prescrições">
          <SectionTabs value={tab} onChange={setTab} items={TABS} />
        </PatientHeader>
      }
    >
      {prescriptions.loading && <ListSkeleton count={3} height={84} />}
      {prescriptions.error && <ErrorState error={prescriptions.error} onRetry={prescriptions.reload} />}
      {prescriptions.data && filtered.length === 0 && (
        <EmptyState
          icon={<MedicationRoundedIcon />}
          title={tab === 0 ? 'Nenhuma prescrição ativa' : 'Histórico vazio'}
        />
      )}

      <Stack spacing={1.25}>
        {filtered.map((rx, idx) => (
          <ListCard
            key={rx.id}
            index={idx}
            leading={<RxIcon />}
            title={rx.name}
            subtitle={rx.detail}
            trailing={<StatusChip status={rx.status} />}
          >
            {rx.nextSession && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: brand.wine }}>
                <EventRepeatRoundedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={600}>
                  Próxima sessão {rx.nextSession}
                </Typography>
              </Box>
            )}
          </ListCard>
        ))}
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="contained"
        startIcon={<AddRoundedIcon />}
        onClick={() => toast('Nova prescrição chega em breve.', { severity: 'info' })}
        sx={{ mt: 3 }}
      >
        Nova prescrição
      </Button>
    </AppScreen>
  )
}
