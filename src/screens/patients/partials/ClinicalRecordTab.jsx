import React, { useState } from 'react'
import { Box, Button, Card, CardActionArea, Stack, Typography } from '@mui/material'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import NoteAltRoundedIcon from '@mui/icons-material/NoteAltRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { useAsync } from '../../../hooks/useAsync.js'
import { useToast } from '../../../context/ToastContext.jsx'
import PillTabs from '../../../components/PillTabs.jsx'
import StatusChip from '../../../components/StatusChip.jsx'
import InfoField from '../../../components/InfoField.jsx'
import BottomSheet from '../../../components/BottomSheet.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/StateViews.jsx'
import ProcedureFormSheet from './ProcedureFormSheet.jsx'
import EvolutionSheet from './EvolutionSheet.jsx'

const FILTERS = [
  { value: 'Tudo', test: () => true },
  { value: 'Procedimentos', test: (i) => i.kind === 'procedimento' },
  { value: 'Evoluções', test: (i) => i.kind === 'evolucao' }
]

function quantityLabel(p) {
  if (p.quantity == null) return null
  return `${String(p.quantity).replace('.', ',')}${p.unit ? ` ${p.unit}` : ''}`
}

function ProcedureCard({ p, onOpen }) {
  return (
    <Card>
      <CardActionArea onClick={() => onOpen(p)} sx={{ p: 1.75, display: 'flex', gap: 1.5, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
          <SpaRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle2">{p.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {p.date}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" component="div">
            {[p.area, quantityLabel(p), p.product].filter(Boolean).join(' • ') || 'Sem detalhes registrados'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusChip status={p.status} />
            {p.lot && (
              <Typography variant="caption" sx={{ fontWeight: 600, color: brand.muted }}>
                Lote {p.lot}
              </Typography>
            )}
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  )
}

function EvolutionCard({ e }) {
  return (
    <Card sx={{ p: 1.75, display: 'flex', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: '#e9eff9', color: '#35548f' }}>
        <NoteAltRoundedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2">Evolução</Typography>
          <Typography variant="caption" color="text.secondary">
            {e.date}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
          {e.text}
        </Typography>
        {e.createdByName && (
          <Typography variant="caption" color="text.secondary">
            por {e.createdByName}
          </Typography>
        )}
      </Box>
    </Card>
  )
}

/**
 * Prontuário da paciente: procedimentos registrados e evoluções clínicas.
 * `alerts`: alertas clínicos (mostrados no registro de procedimento).
 */
export default function ClinicalRecordTab({ patientId, alerts, onChanged }) {
  const toast = useToast()
  const [filter, setFilter] = useState('Tudo')
  const [sheet, setSheet] = useState(null) // 'procedure' | 'evolution' | { edit: procedure }
  const [viewing, setViewing] = useState(null)
  const record = useAsync(() => afroditeApi.getClinicalRecord(patientId), [patientId])

  const items = (record.data || []).filter(FILTERS.find((f) => f.value === filter).test)

  return (
    <>
      <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
        <Button fullWidth variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSheet('procedure')}>
          Procedimento
        </Button>
        <Button fullWidth variant="outlined" startIcon={<NoteAltRoundedIcon />} onClick={() => setSheet('evolution')}>
          Evolução
        </Button>
      </Stack>
      <PillTabs
        value={filter}
        onChange={setFilter}
        items={FILTERS.map((f) => ({ value: f.value, label: f.value, count: record.data ? record.data.filter(f.test).length : undefined }))}
        sx={{ mb: 2 }}
      />
      {record.loading && <ListSkeleton count={3} height={84} />}
      {record.error && <ErrorState error={record.error} onRetry={record.reload} />}
      {record.data && items.length === 0 && (
        <EmptyState icon={<SpaRoundedIcon />} title="Prontuário vazio" description="Registre procedimentos realizados e a evolução clínica da paciente." />
      )}
      <Stack spacing={1.25}>
        {items.map((i) => (i.kind === 'procedimento' ? <ProcedureCard key={`p-${i.id}`} p={i} onOpen={setViewing} /> : <EvolutionCard key={`e-${i.id}`} e={i} />))}
      </Stack>

      <ProcedureFormSheet
        open={sheet === 'procedure' || !!sheet?.edit}
        onClose={() => setSheet(null)}
        patientId={patientId}
        procedure={sheet?.edit}
        alerts={alerts}
        onSaved={() => {
          record.reload()
          onChanged?.()
          toast(sheet?.edit ? 'Procedimento atualizado' : 'Procedimento registrado')
        }}
      />
      <EvolutionSheet
        open={sheet === 'evolution'}
        onClose={() => setSheet(null)}
        patientId={patientId}
        onSaved={() => {
          record.reload()
          toast('Evolução registrada')
        }}
      />
      <BottomSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
        subtitle={viewing && [viewing.date, viewing.professional].filter(Boolean).join(' • ')}
        footer={
          viewing && (
            <Button
              fullWidth
              size="large"
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              onClick={() => {
                setSheet({ edit: viewing })
                setViewing(null)
              }}
            >
              Editar registro
            </Button>
          )
        }
      >
        {viewing && (
          <Stack spacing={2} sx={{ pb: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <InfoField label="Áreas" value={viewing.area} />
              <InfoField label="Quantidade" value={quantityLabel(viewing)} />
              <InfoField label="Produto" value={viewing.product} />
              <InfoField label="Lote" value={viewing.lot} />
            </Box>
            <InfoField label="Técnica / pontos" value={viewing.technique} />
            <InfoField label="Cuidados pós-procedimento" value={viewing.postCare} />
            <InfoField label="Intercorrências / observações" value={viewing.notes} />
          </Stack>
        )}
      </BottomSheet>
    </>
  )
}
