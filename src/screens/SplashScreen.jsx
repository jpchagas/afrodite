import React from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { brand } from '../theme/theme.js'

export default function SplashScreen() {
  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        background: `linear-gradient(160deg, ${brand.wine} 0%, ${brand.rose} 100%)`,
        color: '#fff'
      }}
    >
      <Box
        component="img"
        src="/icons/icon-512.png"
        alt="Afrodite CRM"
        sx={{
          width: 112,
          height: 112,
          borderRadius: '28%',
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)'
        }}
      />
      <Typography variant="h5" fontWeight={700} letterSpacing={0.5}>
        Afrodite CRM
      </Typography>
      <CircularProgress size={28} sx={{ color: '#fff', mt: 2, opacity: 0.85 }} />
    </Box>
  )
}
