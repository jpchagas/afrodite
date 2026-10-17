import React from 'react'
import { Box } from '@mui/material'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { TONES } from '../theme/status.js'

const TONE_BY_STATE = { overdue: TONES.danger, today: TONES.warning, upcoming: TONES.neutral }

// Selo do próximo contato de um lead ("Retomar hoje", "Atrasado 2 dias"...)
export default function FollowUpChip({ lead, sx }) {
  if (!lead?.followUpState) return null
  const tone = TONE_BY_STATE[lead.followUpState]
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        height: 24,
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        bgcolor: tone.bg,
        color: tone.fg,
        ...sx
      }}
    >
      <ScheduleRoundedIcon sx={{ fontSize: 14 }} />
      {lead.followUpLabel}
    </Box>
  )
}
