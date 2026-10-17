import React, { useState } from 'react'
import { Box, Button, Card, Skeleton, Stack, Typography } from '@mui/material'
import AddAPhotoRoundedIcon from '@mui/icons-material/AddAPhotoRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { useAsync } from '../../../hooks/useAsync.js'
import { useToast } from '../../../context/ToastContext.jsx'
import PillTabs from '../../../components/PillTabs.jsx'
import { EmptyState, ErrorState } from '../../../components/StateViews.jsx'

const TABS = [
  { value: 'comparar', label: 'Antes e depois' },
  { value: 'galeria', label: 'Galeria' }
]

function Photo({ label, date }) {
  return (
    <Box
      sx={{
        aspectRatio: '3 / 4',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, #f6ecef 0%, ${brand.roseLight}88 100%)`,
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <ImageRoundedIcon sx={{ color: brand.rose, opacity: 0.45, fontSize: 32 }} />
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
          backdropFilter: 'blur(8px)'
        }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ color: brand.wineDark, display: 'block', lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
          {date}
        </Typography>
      </Box>
    </Box>
  )
}

export default function PhotosGallery({ patientId }) {
  const toast = useToast()
  const [tab, setTab] = useState('comparar')
  const { data: photos, error, loading, reload } = useAsync(
    () => afroditeApi.getPatientPhotos(patientId),
    [patientId]
  )

  const first = photos?.[0]
  const last = photos?.[photos.length - 1]

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
            <Photo label={first.label} date={first.date} />
            <Photo label={last.label} date={last.date} />
          </Box>
          <Typography variant="caption" color="text.secondary" component="p" textAlign="center" sx={{ mt: 1.25 }}>
            Comparando a primeira e a última foto registradas
          </Typography>
        </Card>
      )}

      {photos && photos.length > 0 && (tab === 'galeria' || photos.length === 1) && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          {photos.map((photo) => (
            <Photo key={photo.id} label={photo.label} date={photo.date} />
          ))}
        </Box>
      )}

      <Stack sx={{ mt: 2.5 }}>
        <Button
          size="large"
          variant="outlined"
          startIcon={<AddAPhotoRoundedIcon />}
          onClick={() => toast('Envio de fotos chega em breve.', { severity: 'info' })}
        >
          Adicionar fotos
        </Button>
      </Stack>
    </Box>
  )
}
