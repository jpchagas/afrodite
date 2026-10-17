import React from 'react'
import { Box, Chip } from '@mui/material'
import { toneFor } from '../theme/status.js'

export default function StatusChip({ status, sx }) {
  if (!status) return null
  const tone = toneFor(status)
  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            component="span"
            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tone.dot, flexShrink: 0 }}
          />
          {status}
        </Box>
      }
      sx={{ bgcolor: tone.bg, color: tone.fg, '& .MuiChip-label': { px: 1.1 }, ...sx }}
    />
  )
}
