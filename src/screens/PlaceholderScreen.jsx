import React from 'react'
import { Box, Typography } from '@mui/material'
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded'
import { brand } from '../theme/theme.js'
import BottomNav from '../components/BottomNav.jsx'

export default function PlaceholderScreen({ title }) {
  return (
    <Box sx={{ minHeight: '100dvh', background: brand.cream, pb: 10 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70dvh',
          gap: 2,
          px: 4,
          textAlign: 'center'
        }}
      >
        <ConstructionRoundedIcon sx={{ fontSize: 48, color: brand.rose }} />
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esta área ainda está em construção e chega em uma próxima versão.
        </Typography>
      </Box>
      <BottomNav />
    </Box>
  )
}
