import React, { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, TextField } from '@mui/material'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { todayKey } from '../../../services/dates.js'
import { friendlyMessage } from '../../../utils/errors.js'
import BottomSheet from '../../../components/BottomSheet.jsx'

export default function EvolutionSheet({ open, onClose, patientId, appointmentId, onSaved }) {
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayKey())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setText('')
      setDate(todayKey())
      setError(null)
    }
  }, [open])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const saved = await afroditeApi.createEvolution(patientId, { text, date, appointmentId })
      onClose()
      onSaved?.(saved)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível salvar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Evolução clínica"
      subtitle="Registro datado no prontuário — não pode ser editado depois."
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!text.trim() || saving} onClick={handleSave}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar evolução'}
        </Button>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Evolução"
          placeholder="Ex.: Retorno 15 dias pós-toxina: resultado simétrico, sem intercorrências. Paciente satisfeita."
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={5}
          autoFocus
        />
        <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>
    </BottomSheet>
  )
}
