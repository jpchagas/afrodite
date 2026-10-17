import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import { formatFileSize } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import PatientHeader from '../../components/PatientHeader.jsx'
import PillTabs from '../../components/PillTabs.jsx'
import ListCard from '../../components/ListCard.jsx'
import BottomSheet from '../../components/BottomSheet.jsx'
import InfoField from '../../components/InfoField.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import DocumentUploadSheet from './partials/DocumentUploadSheet.jsx'

function DocIcon({ contentType }) {
  const isPdf = contentType === 'application/pdf'
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '13px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: isPdf ? '#fbe9ec' : brand.blush,
        color: isPdf ? '#c23b4e' : brand.wine
      }}
    >
      {isPdf ? <PictureAsPdfRoundedIcon sx={{ fontSize: 20 }} /> : <ImageRoundedIcon sx={{ fontSize: 20 }} />}
    </Box>
  )
}

export default function DocumentsScreen() {
  const { id } = useParams()
  const toast = useToast()
  const [filter, setFilter] = useState('Todos')
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const patient = useAsync(() => afroditeApi.getPatient(id), [id])
  const documents = useAsync(() => afroditeApi.getPatientDocuments(id), [id])

  const all = documents.data || []
  const categories = ['Todos', ...afroditeApi.DOCUMENT_CATEGORIES.filter((c) => all.some((d) => d.category === c))]
  const filtered = filter === 'Todos' ? all : all.filter((d) => d.category === filter)

  async function handleDelete() {
    setDeleting(true)
    try {
      await afroditeApi.deletePatientDocument(id, selected)
      documents.setData((prev) => prev.filter((d) => d.id !== selected.id))
      setSelected(null)
      toast('Documento excluído')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível excluir'), { severity: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppScreen header={<PatientHeader patient={patient.data} error={patient.error} title="Documentos" />}>
      {all.length > 0 && categories.length > 2 && (
        <PillTabs
          value={filter}
          onChange={setFilter}
          items={categories.map((c) => ({ value: c, label: c }))}
          sx={{ mb: 2 }}
        />
      )}

      {documents.loading && <ListSkeleton count={3} height={72} />}
      {documents.error && <ErrorState error={documents.error} onRetry={documents.reload} />}
      {documents.data && filtered.length === 0 && (
        <EmptyState
          icon={<FolderRoundedIcon />}
          title="Nenhum documento"
          description="Guarde aqui exames, termos de consentimento, laudos e receitas."
        />
      )}

      <Stack spacing={1.25}>
        {filtered.map((d, idx) => (
          <ListCard
            key={d.id}
            index={idx}
            onClick={() => setSelected(d)}
            leading={<DocIcon contentType={d.contentType} />}
            title={d.name}
            subtitle={[d.category, formatFileSize(d.size), d.createdAtLabel].filter(Boolean).join(' • ')}
          />
        ))}
      </Stack>

      <Button fullWidth size="large" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setUploading(true)} sx={{ mt: 3 }}>
        Adicionar documento
      </Button>

      <DocumentUploadSheet
        open={uploading}
        onClose={() => setUploading(false)}
        patientId={id}
        onUploaded={(d) => {
          documents.setData((prev) => [d, ...(prev || [])])
          setFilter('Todos')
          toast('Documento enviado')
        }}
      />

      <BottomSheet
        open={!!selected}
        onClose={deleting ? undefined : () => setSelected(null)}
        title={selected?.name}
        subtitle={selected?.category}
        footer={
          selected && (
            <Stack spacing={1.25}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<OpenInNewRoundedIcon />}
                component="a"
                href={selected.url}
                target="_blank"
                rel="noopener"
              >
                Abrir
              </Button>
              <Button
                fullWidth
                size="large"
                variant="text"
                color="error"
                startIcon={!deleting && <DeleteOutlineRoundedIcon />}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? <CircularProgress size={20} /> : 'Excluir documento'}
              </Button>
            </Stack>
          )
        }
      >
        {selected && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pb: 1 }}>
            <InfoField label="Tamanho" value={formatFileSize(selected.size)} />
            <InfoField label="Enviado" value={selected.createdAtLabel} />
          </Box>
        )}
      </BottomSheet>
    </AppScreen>
  )
}
