import React, { useState } from 'react'
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CircularProgress,
  Dialog,
  IconButton,
  Skeleton,
  Stack,
  Typography
} from '@mui/material'
import AddAPhotoRoundedIcon from '@mui/icons-material/AddAPhotoRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { useAsync } from '../../../hooks/useAsync.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { friendlyMessage } from '../../../utils/errors.js'
import PillTabs from '../../../components/PillTabs.jsx'
import { EmptyState, ErrorState } from '../../../components/StateViews.jsx'
import PhotoUploadSheet from './PhotoUploadSheet.jsx'

const TABS = [
  { value: 'comparar', label: 'Antes e depois' },
  { value: 'galeria', label: 'Galeria' }
]

function Photo({ photo, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{
        width: '100%',
        aspectRatio: '3 / 4',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, #f6ecef 0%, ${brand.roseLight}88 100%)`,
        display: 'grid',
        placeItems: 'center'
      }}
    >
      {photo.url ? (
        <Box
          component="img"
          src={photo.url}
          alt={`${photo.label} — ${photo.date}`}
          loading="lazy"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <ImageRoundedIcon sx={{ color: brand.rose, opacity: 0.45, fontSize: 32 }} />
      )}
      <Box
        sx={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 8,
          px: 1.25,
          py: 0.75,
          borderRadius: '10px',
          bgcolor: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(8px)',
          textAlign: 'left'
        }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ color: brand.wineDark, display: 'block', lineHeight: 1.3 }}>
          {photo.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
          {photo.date}
        </Typography>
      </Box>
    </ButtonBase>
  )
}

function PhotoViewer({ photo, onClose, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(photo)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Dialog fullScreen open={!!photo} onClose={onClose} PaperProps={{ sx: { bgcolor: '#120b0e', color: '#fff' } }}>
      {photo && (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 'calc(env(safe-area-inset-top, 0px) + 10px)', pb: 1 }}>
            <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar">
              <CloseRoundedIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{photo.label}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {photo.date}
              </Typography>
            </Box>
            <IconButton onClick={() => setConfirming(true)} sx={{ color: '#fff' }} aria-label="Excluir foto">
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 1, minHeight: 0 }}>
            {photo.url ? (
              <Box component="img" src={photo.url} alt={photo.label} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 2 }} />
            ) : (
              <Typography sx={{ opacity: 0.6 }}>Foto de demonstração sem arquivo</Typography>
            )}
          </Box>
          {confirming && (
            <Box sx={{ p: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', bgcolor: 'rgba(255,255,255,0.06)' }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Excluir esta foto? Essa ação não pode ser desfeita.
              </Typography>
              <Stack direction="row" spacing={1.25}>
                <Button fullWidth variant="outlined" onClick={() => setConfirming(false)} disabled={deleting} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'transparent' }}>
                  Cancelar
                </Button>
                <Button fullWidth variant="contained" color="error" onClick={handleDelete} disabled={deleting} sx={{ backgroundImage: 'none' }}>
                  {deleting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Excluir'}
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  )
}

export default function PhotosGallery({ patientId }) {
  const toast = useToast()
  const [tab, setTab] = useState('comparar')
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(null)
  const { data: photos, error, loading, reload, setData } = useAsync(
    () => afroditeApi.getPatientPhotos(patientId),
    [patientId]
  )

  const first = photos?.[0]
  const last = photos?.[photos.length - 1]

  function handleUploaded(added) {
    setData((prev) => [...(prev || []), ...added].sort((a, b) => a.dateKey.localeCompare(b.dateKey)))
    toast(added.length > 1 ? `${added.length} fotos enviadas` : 'Foto enviada')
  }

  async function handleDelete(photo) {
    try {
      await afroditeApi.deletePatientPhoto(patientId, photo)
      setData((prev) => prev.filter((p) => p.id !== photo.id))
      setViewing(null)
      toast('Foto excluída')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível excluir'), { severity: 'error' })
    }
  }

  return (
    <Box>
      <PillTabs value={tab} onChange={setTab} items={TABS} sx={{ mb: 2 }} />

      {loading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: '3 / 4', height: 'auto' }} />
          ))}
        </Box>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
      {photos && photos.length === 0 && (
        <EmptyState icon={<PhotoLibraryRoundedIcon />} title="Sem fotos" description="Registre a evolução da paciente com fotos de antes e depois." />
      )}

      {photos && photos.length > 1 && tab === 'comparar' && (
        <Card sx={{ p: 1.25 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            <Photo photo={first} onClick={() => setViewing(first)} />
            <Photo photo={last} onClick={() => setViewing(last)} />
          </Box>
          <Typography variant="caption" color="text.secondary" component="p" textAlign="center" sx={{ mt: 1.25 }}>
            Comparando a primeira e a última foto registradas
          </Typography>
        </Card>
      )}

      {photos && photos.length > 0 && (tab === 'galeria' || photos.length === 1) && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          {photos.map((photo) => (
            <Photo key={photo.id} photo={photo} onClick={() => setViewing(photo)} />
          ))}
        </Box>
      )}

      <Stack sx={{ mt: 2.5 }}>
        <Button size="large" variant="outlined" startIcon={<AddAPhotoRoundedIcon />} onClick={() => setUploading(true)}>
          Adicionar fotos
        </Button>
      </Stack>

      <PhotoUploadSheet open={uploading} onClose={() => setUploading(false)} patientId={patientId} onUploaded={handleUploaded} />
      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} onDelete={handleDelete} />
    </Box>
  )
}
