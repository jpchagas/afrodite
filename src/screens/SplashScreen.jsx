import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Stack } from '@mui/material'
import { brand } from '../theme/theme.js'
import BrandMark from '../components/BrandMark.jsx'

export default function SplashScreen() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: `
          radial-gradient(120% 60% at 15% 5%, ${brand.roseLight}40, transparent 60%),
          radial-gradient(140% 80% at 100% 0%, ${brand.rose}70, transparent 55%),
          linear-gradient(165deg, ${brand.wineDark} 0%, ${brand.wine} 55%, ${brand.rose} 100%)
        `
      }}
    >
      {/* marca d'água decorativa */}
      <Box
        sx={{
          position: 'absolute',
          top: '6%',
          right: '-20%',
          opacity: 0.1,
          transform: 'rotate(12deg)',
          animation: 'afFadeUp 1200ms ease both'
        }}
      >
        <BrandMark size={360} color="#ffffff" strokeWidth={1.2} />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          color: '#fff',
          width: '100%',
          maxWidth: 520,
          mx: 'auto',
          px: 4,
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
          animation: 'afFadeUp 700ms 150ms cubic-bezier(.2,.7,.3,1) both'
        }}
      >
        <Stack alignItems="flex-start" spacing={2}>
          <BrandMark size={46} color="#fff" />
          <Box>
            <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
              Clínicas de estética avançada
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              sx={{ fontSize: '3.4rem', lineHeight: 1, letterSpacing: '0.02em' }}
            >
              Afrodite
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 300, lineHeight: 1.6 }}>
            Tecnologia, ciência e beleza para uma jornada completa.
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ width: '100%', mt: 5 }}>
          <Button
            fullWidth
            size="large"
            variant="contained"
            color="inherit"
            onClick={() => navigate('/login')}
            sx={{ bgcolor: '#fff', color: brand.wineDark, '&:hover': { bgcolor: brand.cream } }}
          >
            Entrar
          </Button>
          <Button
            fullWidth
            size="large"
            variant="text"
            onClick={() => navigate('/criar-conta')}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            Criar conta
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
