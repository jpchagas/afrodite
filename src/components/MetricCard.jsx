import React from 'react'
import { Box, Card, CardActionArea, Skeleton, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'

export default function MetricCard({ icon, label, value, hint, hintColor, onClick, loading, sx }) {
  if (loading) return <Skeleton variant="rounded" height={118} sx={sx} />

  const content = (
    <Box sx={{ p: 2, height: '100%' }}>
      {icon && (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: brand.blush,
            color: brand.wine,
            mb: 1.5,
            '& svg': { fontSize: 20 }
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontSize: '1.45rem',
          fontWeight: 650,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: hintColor || brand.muted }}>
          {hint}
        </Typography>
      )}
    </Box>
  )

  return (
    <Card sx={{ height: '100%', ...sx }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
