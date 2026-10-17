import React, { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import AddAPhotoRoundedIcon from '@mui/icons-material/AddAPhotoRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { todayKey } from '../../../services/dates.js'
import { friendlyMessage } from '../../../utils/errors.js'
import BottomSheet from '../../../components/BottomSheet.jsx'
import UploadProgress from '../../../components/UploadProgress.jsx'

export default function PhotoUploadSheet({ open, onClose, patientId, onUploaded }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [label, setLabel] = useState(afroditeApi.PHOTO_LABELS[0])
  const [date, setDate] = useState(todayKey())
  const [progress, setProgress] = useState(null) // { index, value }
  const [error, setError] = useState(null)

  const previews = files.map((f) => f.preview)
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [files]) // eslint-disable-line

  useEffect(() => {
    if (open) {
      setFiles([])
      setLabel(afroditeApi.PHOTO_LABELS[0])
      setDate(todayKey())
      setProgress(null)
      setError(null)
    }
  }, [open])

  function handlePick(e) {
    const picked = [...e.target.files].filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...picked.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  const uploading = progress !== null

  async function handleUpload() {
    setError(null)
    const uploaded = []
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ index: i, value: 0 })
        const photo = await afroditeApi.uploadPatientPhoto(patientId, files[i].file, { label, date }, (value) =>
          setProgress({ index: i, value })
        )
        uploaded.push(photo)
      }
      onUploaded?.(uploaded)
      onClose()
    } catch (err) {
      if (uploaded.length) onUploaded?.(uploaded)
      setFiles((prev) => prev.slice(uploaded.length))
      setError(friendlyMessage(err, 'Falha no envio. Tente novamente.'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={uploading ? undefined : onClose}
      title="Adicionar fotos"
      subtitle="Fotos grandes são reduzidas automaticamente antes do envio."
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!files.length || uploading} onClick={handleUpload}>
          {uploading ? (
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          ) : files.length > 1 ? (
            `Enviar ${files.length} fotos`
          ) : (
            'Enviar foto'
          )}
        </Button>
      }
    >
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handlePick} />
      <Stack spacing={2.25} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {files.map((f, i) => (
            <Box
              key={f.preview}
              sx={{
                aspectRatio: '1',
                borderRadius: '14px',
                backgroundImage: `url(${f.preview})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: progress && i < progress.index ? 0.45 : 1,
                transition: 'opacity 200ms'
              }}
            />
          ))}
          <ButtonBase
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            sx={{
              aspectRatio: '1',
              borderRadius: '14px',
              border: `1.5px dashed ${brand.roseLight}`,
              bgcolor: brand.cream,
              flexDirection: 'column',
              gap: 0.5,
              color: brand.wine
            }}
          >
            <AddAPhotoRoundedIcon />
            <Typography variant="caption" fontWeight={600}>
              {files.length ? 'Mais fotos' : 'Escolher'}
            </Typography>
          </ButtonBase>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary">
            Momento
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {afroditeApi.PHOTO_LABELS.map((l) => (
              <Chip
                key={l}
                label={l}
                onClick={() => setLabel(l)}
                disabled={uploading}
                sx={{
                  bgcolor: l === label ? brand.wine : brand.surface,
                  color: l === label ? '#fff' : brand.ink,
                  border: `1px solid ${l === label ? brand.wine : brand.line}`,
                  '&:hover': { bgcolor: l === label ? brand.wine : brand.blush }
                }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          label="Data das fotos"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          inputProps={{ max: todayKey() }}
          InputLabelProps={{ shrink: true }}
          disabled={uploading}
        />

        {progress && (
          <UploadProgress value={progress.value} label={`Enviando ${progress.index + 1} de ${files.length}`} />
        )}
      </Stack>
    </BottomSheet>
  )
}
