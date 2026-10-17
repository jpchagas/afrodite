import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, Card, CircularProgress, Skeleton, Stack, TextField } from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import { friendlyMessage } from '../../utils/errors.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import InfoField from '../../components/InfoField.jsx'
import { EmptyState, ErrorState } from '../../components/StateViews.jsx'

const TABS = ['Anamnese', 'Exames', 'Histórico']

const FIELDS = [
  { key: 'queixaPrincipal', label: 'Queixa principal' },
  { key: 'historicoMedico', label: 'Histórico médico' },
  { key: 'alergias', label: 'Alergias' },
  { key: 'procedimentosAnteriores', label: 'Procedimentos anteriores' }
]

export default function AnamneseScreen() {
  const { id } = useParams()
  const toast = useToast()
  const [tab, setTab] = useState(0)
  const [draft, setDraft] = useState(null) // null = modo leitura
  const [saving, setSaving] = useState(false)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const anamnese = useAsync(() => afroditeApi.getPatientAnamnese(id), [id])

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await afroditeApi.updatePatientAnamnese(id, draft)
      anamnese.setData(saved)
      setDraft(null)
      toast('Anamnese atualizada')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível salvar'), { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen
      header={
        <PatientHeader patient={patient.data} error={patient.error} title="Anamnese">
          <SectionTabs value={tab} onChange={setTab} items={TABS} />
        </PatientHeader>
      }
    >
      {tab === 0 && (
        <>
          {anamnese.loading && (
            <Stack spacing={1.25}>
              {FIELDS.map((f) => (
                <Skeleton key={f.key} variant="rounded" height={76} />
              ))}
            </Stack>
          )}
          {anamnese.error && <ErrorState error={anamnese.error} onRetry={anamnese.reload} />}

          {anamnese.data && !draft && (
            <>
              <Card sx={{ p: 2.25 }}>
                <Stack spacing={2}>
                  {FIELDS.map((f) => (
                    <InfoField key={f.key} label={f.label} value={anamnese.data[f.key]} />
                  ))}
                </Stack>
              </Card>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<EditRoundedIcon />}
                onClick={() => setDraft({ ...anamnese.data })}
                sx={{ mt: 2.5 }}
              >
                Editar anamnese
              </Button>
            </>
          )}

          {draft && (
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
              <Stack spacing={2}>
                {FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    value={draft[f.key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1.25} sx={{ mt: 2.5 }}>
                <Button fullWidth size="large" variant="outlined" onClick={() => setDraft(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button fullWidth size="large" variant="contained" type="submit" disabled={saving}>
                  {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar'}
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}

      {tab === 1 && (
        <EmptyState
          icon={<ScienceRoundedIcon />}
          title="Exames"
          description="Uma visão dedicada de exames chega em uma próxima versão."
        />
      )}

      {tab === 2 && (
        <EmptyState
          icon={<HistoryRoundedIcon />}
          title="Histórico"
          description='O histórico completo está na aba "Histórico" do perfil da paciente.'
        />
      )}
    </AppScreen>
  )
}
