import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, IconButton, Typography, useScrollTrigger } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import { brand, shadows } from '../theme/theme.js'
import { CONTENT_MAX_WIDTH } from './AppScreen.jsx'

export function HeaderIconButton({ children, sx, ...props }) {
  return (
    <IconButton
      {...props}
      sx={{
        width: 40,
        height: 40,
        bgcolor: brand.surface,
        border: `1px solid ${brand.line}`,
        boxShadow: shadows.card,
        color: brand.ink,
        '&:hover': { bgcolor: brand.surface },
        ...sx
      }}
    >
      {children}
    </IconButton>
  )
}

/**
 * Cabeçalho fixo com fundo translúcido. `large` mostra o título grande
 * (telas raiz das abas); sem `large`, o título fica compacto ao lado do
 * botão voltar. `children` é renderizado abaixo (busca, abas, perfil).
 */
export default function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  back = false,
  onBack,
  actions,
  large = false,
  children
}) {
  const navigate = useNavigate()
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 6 })

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(248, 244, 242, 0.82)',
        backdropFilter: 'saturate(1.6) blur(18px)',
        WebkitBackdropFilter: 'saturate(1.6) blur(18px)',
        borderBottom: `1px solid ${scrolled ? brand.line : 'transparent'}`,
        transition: 'border-color 200ms ease'
      }}
    >
      <Box
        sx={{
          maxWidth: CONTENT_MAX_WIDTH,
          mx: 'auto',
          px: 2.5,
          pt: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          pb: children ? 1.5 : 1.25
        }}
      >
        {(back || actions || !large) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 40 }}>
            {back && (
              <HeaderIconButton aria-label="Voltar" onClick={onBack || (() => navigate(-1))}>
                <ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} />
              </HeaderIconButton>
            )}
            {!large && (
              <Typography variant="subtitle1" noWrap sx={{ flex: 1, fontWeight: 650 }}>
                {title}
              </Typography>
            )}
            {large && <Box sx={{ flex: 1 }} />}
            {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
          </Box>
        )}

        {large && (
          <Box sx={{ mt: back || actions ? 1.5 : 0.5 }}>
            {eyebrow && (
              <Typography variant="overline" sx={{ color: brand.gold, display: 'block' }}>
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h4" component="h1" sx={{ color: brand.ink }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {children && <Box sx={{ mt: 2 }}>{children}</Box>}
      </Box>
    </Box>
  )
}
