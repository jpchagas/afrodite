import React from 'react'
import { Box, Button, Card, Typography } from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { brand, gradients, shadows } from '../theme/theme.js'
import BrandMark from './BrandMark.jsx'

export default function InsightCard({ title, text, actionLabel, onAction, sx }) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: gradients.wine,
        color: '#fff',
        border: 'none',
        boxShadow: shadows.raised,
        p: 2.5,
        ...sx
      }}
    >
      <Box sx={{ position: 'absolute', right: -28, bottom: -36, opacity: 0.1, transform: 'rotate(-12deg)' }}>
        <BrandMark size={150} color="#fff" strokeWidth={1.6} />
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#e9cf9f' }} />
          <Typography variant="overline" sx={{ color: '#e9cf9f', lineHeight: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" component="p" sx={{ fontSize: '1.45rem', mb: 2, pr: 3 }}>
          {text}
        </Typography>
        {actionLabel && (
          <Button
            size="small"
            variant="contained"
            onClick={onAction}
            sx={{
              bgcolor: '#fff',
              color: brand.wineDark,
              backgroundImage: 'none',
              '&:hover': { bgcolor: brand.cream, backgroundImage: 'none' }
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Card>
  )
}
