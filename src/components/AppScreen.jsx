import React from 'react'
import { Box } from '@mui/material'
import { brand } from '../theme/theme.js'
import BottomNav from './BottomNav.jsx'

export const CONTENT_MAX_WIDTH = 560

/**
 * Estrutura padrão de tela: fundo, largura máxima (centraliza no desktop),
 * espaço para a BottomNav e animação de entrada do conteúdo.
 */
export default function AppScreen({ header, nav = false, children, contentSx }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: brand.cream,
        pb: nav
          ? 'calc(env(safe-area-inset-bottom, 0px) + 112px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 32px)'
      }}
    >
      {header}
      <Box
        sx={{
          maxWidth: CONTENT_MAX_WIDTH,
          mx: 'auto',
          px: 2.5,
          pt: 2,
          animation: 'afFadeUp 380ms cubic-bezier(.2,.7,.3,1) both',
          ...contentSx
        }}
      >
        {children}
      </Box>
      {nav && <BottomNav />}
    </Box>
  )
}
