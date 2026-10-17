import React, { useEffect, useState } from 'react'
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded'
import { brand } from '../../theme/theme.js'
import { toneFor } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'

/**
 * Mover o lead no funil. "Perdido" pede o motivo; "Convertido" leva para a
 * conversão em paciente (onConvert).
 */
export default function MoveStageSheet({ open, onClose, lead, onMoved, onConvert }) {
  const [choice, setChoice] = useState(null)
  const [reason, setReason] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setChoice(null)
      setReason(null)
      setError(null)
    }
  }, [open])

  if (!lead) return null
  const currentIdx = afroditeApi.PIPELINE_STAGES.indexOf(lead.status)

  async function move(status, lostReason) {
    setSaving(true)
    setError(null)
    try {
      const updated = await afroditeApi.updateLeadStatus(lead.id, status, { lostReason })
      onClose()
      onMoved?.(updated, status)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível mover o lead.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title="Mover no funil"
      subtitle={`Etapa atual: ${lead.status}`}
      footer={
        choice === 'Perdido' && (
          <Button fullWidth size="large" variant="contained" disabled={!reason || saving} onClick={() => move('Perdido', reason)}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Marcar como perdido'}
          </Button>
        )
      }
    >
      <Stack spacing={1.5} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ borderRadius: '18px', border: `1px solid ${brand.line}`, overflow: 'hidden' }}>
          {afroditeApi.PIPELINE_STAGES.map((stage, idx) => {
            const current = stage === lead.status
            const done = currentIdx > -1 && idx < currentIdx
            const tone = toneFor(stage)
            return (
              <ButtonBase
                key={stage}
                disabled={saving || current}
                onClick={() => move(stage)}
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  px: 2,
                  py: 1.4,
                  borderTop: idx ? `1px solid ${brand.line}` : 'none',
                  bgcolor: current ? tone.bg : 'transparent'
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: done || current ? brand.wine : 'transparent',
                    border: `2px solid ${done || current ? brand.wine : brand.roseLight}`,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {done ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : current ? idx + 1 : ''}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: current ? 700 : 500, color: current ? tone.fg : 'text.primary' }}>
                  {stage}
                </Typography>
                {current && (
                  <Typography variant="caption" sx={{ ml: 'auto', color: tone.fg }}>
                    atual
                  </Typography>
                )}
              </ButtonBase>
            )
          })}
        </Box>

        {!lead.patientId && (
          <Button size="large" variant="outlined" startIcon={<HowToRegRoundedIcon />} onClick={onConvert} disabled={saving}>
            Converter em paciente
          </Button>
        )}

        {lead.status !== 'Perdido' && (
          <Box>
            <Button
              fullWidth
              variant="text"
              color="error"
              onClick={() => setChoice(choice === 'Perdido' ? null : 'Perdido')}
              disabled={saving}
            >
              Marcar como perdido
            </Button>
            {choice === 'Perdido' && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="overline" color="text.secondary">
                  Motivo
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {afroditeApi.LOST_REASONS.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      onClick={() => setReason(r)}
                      sx={{
                        bgcolor: reason === r ? '#9b2c3e' : brand.surface,
                        color: reason === r ? '#fff' : brand.ink,
                        border: `1px solid ${reason === r ? '#9b2c3e' : brand.line}`,
                        '&:hover': { bgcolor: reason === r ? '#9b2c3e' : '#fbe9ec' }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Stack>
    </BottomSheet>
  )
}
