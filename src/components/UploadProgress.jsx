import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'

export default function UploadProgress({ value, label }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(value * 100)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value * 100}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: brand.blush,
          '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundImage: `linear-gradient(90deg, ${brand.wine}, ${brand.rose})` }
        }}
      />
    </Box>
  )
}
