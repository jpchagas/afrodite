import React from 'react'
import { Box, Typography } from '@mui/material'

export default function InfoField({ label, value, sx }) {
  return (
    <Box sx={sx}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.8 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}
