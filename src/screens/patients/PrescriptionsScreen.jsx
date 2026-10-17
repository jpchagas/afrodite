import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
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
import BottomSheet from '../../components/BottomSheet.jsx'
import InfoField from '../../components/InfoField.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import NewPrescriptionSheet from './partials/NewPrescriptionSheet.jsx'

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
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState(null)
  const [completing, setCompleting] = useState(false)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const prescriptions = useAsync(() => afroditeApi.getPatientPrescriptions(id), [id])

  const filtered = (prescriptions.data || []).filter((p) => (tab === 0 ? p.active : !p.active))

  async function handleComplete() {
    setCompleting(true)
    try {
      await afroditeApi.completePrescription(id, selected.id)
      prescriptions.setData((prev) =>
        prev.map((rx) => (rx.id === selected.id ? { ...rx, active: false, status: 'Concluído', nextSession: null } : rx))
      )
      toast('Prescrição concluída')
      setSelected(null)
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível concluir'), { severity: 'error' })
    } finally {
      setCompleting(false)
    }
  }

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
            onClick={() => setSelected(rx)}
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
        onClick={() => setCreating(true)}
        sx={{ mt: 3 }}
      >
        Nova prescrição
      </Button>

      <NewPrescriptionSheet
        open={creating}
        onClose={() => setCreating(false)}
        patientId={id}
        onCreated={(rx) => {
          prescriptions.setData((prev) => [rx, ...(prev || [])])
          setTab(0)
          toast('Prescrição salva')
        }}
      />

      <BottomSheet
        open={!!selected}
        onClose={completing ? undefined : () => setSelected(null)}
        title={selected?.name}
        subtitle={selected?.kind}
        footer={
          selected?.active && (
            <Button
              fullWidth
              size="large"
              variant="outlined"
              startIcon={!completing && <TaskAltRoundedIcon />}
              disabled={completing}
              onClick={handleComplete}
            >
              {completing ? <CircularProgress size={22} /> : 'Marcar como concluída'}
            </Button>
          )
        }
      >
        {selected && (
          <Stack spacing={2} sx={{ pb: 1 }}>
            <InfoField label="Posologia / orientação" value={selected.detail} />
            {selected.nextSession && <InfoField label="Próxima sessão" value={selected.nextSession} />}
            <InfoField label="Status" value={selected.status} />
          </Stack>
        )}
      </BottomSheet>
    </AppScreen>
  )
}
