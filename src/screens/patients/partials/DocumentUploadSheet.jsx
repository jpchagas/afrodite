import React, { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, ButtonBase, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { friendlyMessage } from '../../../utils/errors.js'
import { formatFileSize } from '../../../utils/format.js'
import BottomSheet from '../../../components/BottomSheet.jsx'
import UploadProgress from '../../../components/UploadProgress.jsx'

export default function DocumentUploadSheet({ open, onClose, patientId, onUploaded }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(afroditeApi.DOCUMENT_CATEGORIES[0])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setName('')
      setCategory(afroditeApi.DOCUMENT_CATEGORIES[0])
      setProgress(null)
      setError(null)
    }
  }, [open])

  function handlePick(e) {
    const picked = e.target.files[0]
    e.target.value = ''
    if (!picked) return
    setError(null)
    setFile(picked)
    setName(picked.name.replace(/\.[^.]+$/, ''))
  }

  const uploading = progress !== null

  async function handleUpload() {
    setError(null)
    setProgress(0)
    try {
      const document = await afroditeApi.uploadPatientDocument(patientId, file, { name, category }, setProgress)
      onUploaded?.(document)
      onClose()
    } catch (err) {
      setError(friendlyMessage(err, 'Falha no envio. Tente novamente.'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={uploading ? undefined : onClose}
      title="Novo documento"
      subtitle="PDF ou imagem, até 20 MB."
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!file || !name.trim() || uploading} onClick={handleUpload}>
          {uploading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar documento'}
        </Button>
      }
    >
      <input ref={inputRef} type="file" accept="application/pdf,image/*" hidden onChange={handlePick} />
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <ButtonBase
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          sx={{
            borderRadius: '16px',
            border: `1.5px dashed ${brand.roseLight}`,
            bgcolor: brand.cream,
            p: 2,
            justifyContent: 'flex-start',
            gap: 1.5,
            textAlign: 'left'
          }}
        >
          <Box sx={{ width: 44, height: 44, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine, flexShrink: 0 }}>
            <UploadFileRoundedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {file ? file.name : 'Escolher arquivo'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {file ? formatFileSize(file.size) : 'Toque para selecionar'}
            </Typography>
          </Box>
        </ButtonBase>

        <TextField label="Nome do documento" value={name} onChange={(e) => setName(e.target.value)} disabled={uploading} required />
        <TextField select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploading}>
          {afroditeApi.DOCUMENT_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        {uploading && <UploadProgress value={progress} label="Enviando" />}
      </Stack>
    </BottomSheet>
  )
}
