import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Stack, Typography } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import { brand } from '../theme/theme.js'
import BrandMark from './BrandMark.jsx'
import { HeaderIconButton } from './ScreenHeader.jsx'

/**
 * Estrutura das telas de autenticação (entrar, criar conta, recuperar senha):
 * botão voltar, marca, título serifado e conteúdo ocupando o restante.
 */
export default function AuthLayout({ title, subtitle, backTo = -1, icon, children }) {
  const navigate = useNavigate()
  return (
    <Box sx={{ minHeight: '100dvh', background: brand.cream }}>
      <Box
        sx={{
          maxWidth: 480,
          mx: 'auto',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          px: 3,
          pt: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          animation: 'afFadeUp 420ms cubic-bezier(.2,.7,.3,1) both'
        }}
      >
        <Box>
          <HeaderIconButton aria-label="Voltar" onClick={() => navigate(backTo)}>
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} />
          </HeaderIconButton>
        </Box>

        <Stack spacing={1} sx={{ mt: 4, mb: 4 }}>
          {icon || <BrandMark size={40} color={brand.wine} />}
          <Typography variant="h3" component="h1" sx={{ fontSize: '2.4rem', pt: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>

        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</Box>
      </Box>
    </Box>
  )
}

// Ícone de status grande (ex.: e-mail enviado) no lugar da marca
export function AuthIcon({ children }) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '18px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: brand.blush,
        color: brand.wine,
        '& svg': { fontSize: 28 }
      }}
    >
      {children}
    </Box>
  )
}
