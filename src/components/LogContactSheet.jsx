import React, { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { addDays, toDateKey, todayKey } from '../services/dates.js'
import { friendlyMessage } from '../utils/errors.js'
import BottomSheet from './BottomSheet.jsx'

const FOLLOW_UPS = [
  { label: 'Amanhã', days: 1 },
  { label: 'Em 3 dias', days: 3 },
  { label: 'Em 1 semana', days: 7 },
  { label: 'Em 15 dias', days: 15 }
]

function SelectChip({ selected, ...props }) {
  return (
    <Chip
      {...props}
      sx={{
        bgcolor: selected ? brand.wine : brand.surface,
        color: selected ? '#fff' : brand.ink,
        border: `1px solid ${selected ? brand.wine : brand.line}`,
        '&:hover': { bgcolor: selected ? brand.wine : brand.blush }
      }}
    />
  )
}

/**
 * Registrar contato (ligação, WhatsApp, visita, e-mail ou nota) em um lead
 * ou paciente. Em leads também define o próximo contato.
 * target: 'leads' | 'patients'
 */
export default function LogContactSheet({ open, onClose, target, id, currentFollowUp, onSaved }) {
  const isLead = target === 'leads'
  const [kind, setKind] = useState('ligacao')
  const [text, setText] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setKind('ligacao')
      setText('')
      setFollowUp(isLead ? toDateKey(addDays(new Date(), 3)) : '')
      setError(null)
    }
  }, [open, isLead])

  const needsText = kind === 'nota'
  const valid = !needsText || text.trim()

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await afroditeApi.logContact(target, id, {
        kind,
        text,
        ...(isLead ? { nextFollowUp: followUp || null } : {})
      })
      onClose()
      onSaved?.()
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível registrar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Registrar contato"
      subtitle={isLead && currentFollowUp ? 'O próximo contato substitui o atual.' : undefined}
      footer={
        <Button fullWidth size="large" variant="contained" disabled={!valid || saving} onClick={handleSave}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar no histórico'}
        </Button>
      }
    >
      <Stack spacing={2.25} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {afroditeApi.CONTACT_KINDS.map((k) => (
            <SelectChip key={k.value} label={k.label} selected={kind === k.value} onClick={() => setKind(k.value)} />
          ))}
        </Box>
        <TextField
          label={needsText ? 'Nota' : 'Resumo (opcional)'}
          placeholder={needsText ? 'Ex.: Prefere horários à tarde' : 'Ex.: Pediu valores do protocolo, vai pensar'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={3}
          autoFocus
        />
        {isLead && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Próximo contato
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {FOLLOW_UPS.map((f) => {
                const key = toDateKey(addDays(new Date(), f.days))
                return <SelectChip key={f.label} label={f.label} selected={followUp === key} onClick={() => setFollowUp(key)} />
              })}
              <SelectChip label="Sem data" selected={!followUp} onClick={() => setFollowUp('')} />
            </Box>
            <TextField
              type="date"
              label="Ou escolha a data"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              inputProps={{ min: todayKey() }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ mt: 1.5 }}
            />
          </Box>
        )}
      </Stack>
    </BottomSheet>
  )
}
