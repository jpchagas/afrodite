import React from 'react'
import { Box, Typography } from '@mui/material'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { TONES } from '../theme/status.js'

/**
 * Alertas clínicos da paciente (alergias, gestação, anticoagulante...).
 * `alerts`: lista de textos (patient.clinicalAlerts) ou [{ label }].
 * `compact` mostra até 2 e resume o restante.
 */
export default function ClinicalAlerts({ alerts, compact = false, sx }) {
  const labels = (alerts || []).map((a) => (typeof a === 'string' ? a : a.label))
  if (!labels.length) return null
  const shown = compact ? labels.slice(0, 2) : labels
  const rest = labels.length - shown.length
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        px: 1.5,
        py: 1,
        borderRadius: '14px',
        bgcolor: TONES.danger.bg,
        color: TONES.danger.fg,
        ...sx
      }}
    >
      <WarningAmberRoundedIcon sx={{ fontSize: 18, mt: '1px' }} />
      <Typography variant="caption" sx={{ fontWeight: 650, lineHeight: 1.45 }}>
        {shown.join(' • ')}
        {rest > 0 && ` • +${rest}`}
      </Typography>
    </Box>
  )
}
