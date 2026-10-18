import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../../theme/theme.js'
import { TONES } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import InfoField from '../../components/InfoField.jsx'
import SectionTitle from '../../components/SectionTitle.jsx'
import ClinicalAlerts from '../../components/ClinicalAlerts.jsx'
import BottomSheet from '../../components/BottomSheet.jsx'
import { EmptyState, ErrorState } from '../../components/StateViews.jsx'

function formatStamp(date) {
  if (!date) return null
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function AnamneseView({ data }) {
  const flags = afroditeApi.ANAMNESE_FLAGS.filter((f) => data.flags?.[f.key])
  const fitz = afroditeApi.FITZPATRICK.find((f) => f.value === data.fitzpatrick)
  return (
    <Stack spacing={1.25}>
      <Card sx={{ p: 2.25 }}>
        <Typography variant="overline" color="text.secondary">
          Condições e contraindicações
        </Typography>
        {flags.length ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
            {flags.map((f) => (
              <Box
                key={f.key}
                component="span"
                sx={{
                  px: 1.1,
                  py: 0.4,
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  bgcolor: f.critical ? TONES.danger.bg : TONES.warning.bg,
                  color: f.critical ? TONES.danger.fg : TONES.warning.fg
                }}
              >
                {f.label}
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, color: TONES.success.fg }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 17 }} /> Nenhuma condição marcada
          </Typography>
        )}
        <InfoField label="Fototipo (Fitzpatrick)" value={fitz?.label} sx={{ mt: 2 }} />
      </Card>
      <Card sx={{ p: 2.25 }}>
        <Stack spacing={2}>
          {afroditeApi.ANAMNESE_TEXT_FIELDS.map((f) => (
            <InfoField key={f.key} label={f.label} value={data[f.key]} />
          ))}
        </Stack>
      </Card>
    </Stack>
  )
}

export default function AnamneseScreen() {
  const { id } = useParams()
  const toast = useToast()
  const [draft, setDraft] = useState(null) // null = leitura
  const [saving, setSaving] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [openVersion, setOpenVersion] = useState(null)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const anamnese = useAsync(() => afroditeApi.getPatientAnamnese(id), [id])
  const versions = useAsync(() => (versionsOpen ? afroditeApi.getAnamneseVersions(id) : null), [id, versionsOpen])

  const alerts = afroditeApi.clinicalAlerts(draft || anamnese.data)

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await afroditeApi.updatePatientAnamnese(id, draft)
      anamnese.setData(saved)
      patient.setData((p) => (p ? { ...p, clinicalAlerts: afroditeApi.clinicalAlerts(saved).map((a) => a.label) } : p))
      setDraft(null)
      toast('Anamnese atualizada')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível salvar'), { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const setText = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))
  const toggleFlag = (key) => setDraft((prev) => ({ ...prev, flags: { ...prev.flags, [key]: !prev.flags?.[key] } }))

  return (
    <AppScreen header={<PatientHeader patient={patient.data} error={patient.error} title="Anamnese" />}>
      {anamnese.loading && (
        <Stack spacing={1.25}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      )}
      {anamnese.error && <ErrorState error={anamnese.error} onRetry={anamnese.reload} />}

      {anamnese.data && !draft && (
        <>
          <AnamneseView data={anamnese.data} />
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
            {anamnese.data.updatedAt
              ? `Atualizada em ${formatStamp(anamnese.data.updatedAt)}${anamnese.data.updatedByName ? ` por ${anamnese.data.updatedByName}` : ''}`
              : 'Ainda não preenchida'}
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<EditRoundedIcon />}
              onClick={() => setDraft({ ...anamnese.data, flags: { ...anamnese.data.flags } })}
            >
              {anamnese.data.updatedAt ? 'Editar anamnese' : 'Preencher anamnese'}
            </Button>
            {anamnese.data.updatedAt && (
              <Button fullWidth variant="text" startIcon={<HistoryRoundedIcon />} onClick={() => setVersionsOpen(true)}>
                Versões anteriores
              </Button>
            )}
          </Stack>
        </>
      )}

      {draft && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
          {alerts.length > 0 && <ClinicalAlerts alerts={alerts} sx={{ mb: 1.5 }} />}
          <SectionTitle sx={{ mt: 0 }}>Condições e contraindicações</SectionTitle>
          <Card sx={{ px: 1.5, py: 0.75 }}>
            {afroditeApi.ANAMNESE_FLAGS.map((f) => (
              <FormControlLabel
                key={f.key}
                sx={{ display: 'flex', mr: 0 }}
                control={<Checkbox checked={!!draft.flags?.[f.key]} onChange={() => toggleFlag(f.key)} />}
                label={
                  <Typography variant="body2" sx={{ fontWeight: f.critical ? 600 : 400 }}>
                    {f.label}
                  </Typography>
                }
              />
            ))}
          </Card>
          <TextField
            select
            fullWidth
            label="Fototipo (Fitzpatrick)"
            value={draft.fitzpatrick || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, fitzpatrick: e.target.value || null }))}
            sx={{ mt: 2 }}
          >
            <MenuItem value="">Não avaliado</MenuItem>
            {afroditeApi.FITZPATRICK.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
          <SectionTitle>Histórico</SectionTitle>
          <Stack spacing={2}>
            {afroditeApi.ANAMNESE_TEXT_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                value={draft[f.key] || ''}
                onChange={setText(f.key)}
                placeholder={f.key === 'alergias' ? 'Ex.: Dipirona, látex — ou "Nega"' : undefined}
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

      <BottomSheet
        open={versionsOpen}
        onClose={() => {
          setVersionsOpen(false)
          setOpenVersion(null)
        }}
        title={openVersion ? `Versão de ${formatStamp(openVersion.savedAt)}` : 'Versões anteriores'}
        subtitle={openVersion?.updatedByName ? `por ${openVersion.updatedByName}` : 'Cada edição guarda a versão anterior.'}
      >
        {openVersion ? (
          <Box sx={{ pb: 2 }}>
            <AnamneseView data={openVersion} />
            <Button sx={{ mt: 1.5 }} onClick={() => setOpenVersion(null)}>
              Voltar às versões
            </Button>
          </Box>
        ) : (
          <Stack spacing={1} sx={{ pb: 2 }}>
            {versions.loading && <Skeleton variant="rounded" height={56} />}
            {versions.data?.length === 0 && <EmptyState icon={<HistoryRoundedIcon />} title="Sem versões anteriores" sx={{ py: 2 }} />}
            {versions.data?.map((v) => (
              <ButtonBase
                key={v.id}
                onClick={() => setOpenVersion(v)}
                sx={{ justifyContent: 'space-between', p: 1.5, borderRadius: '14px', border: `1px solid ${brand.line}`, textAlign: 'left' }}
              >
                <Box>
                  <Typography variant="subtitle2">{formatStamp(v.savedAt) || 'Versão inicial'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {v.updatedByName || '—'} • {afroditeApi.clinicalAlerts(v).length} alerta(s)
                  </Typography>
                </Box>
                <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
              </ButtonBase>
            ))}
          </Stack>
        )}
      </BottomSheet>
    </AppScreen>
  )
}
