import React from 'react'
import { Box, Fab } from '@mui/material'
import { brand } from '../theme/theme.js'
import BottomNav from './BottomNav.jsx'

export const CONTENT_MAX_WIDTH = 560

/**
 * Estrutura padrão de tela: fundo, largura máxima (centraliza no desktop),
 * espaço para a BottomNav e animação de entrada do conteúdo.
 *
 * `fab` ({ label, icon, onClick }) renderiza o botão flutuante FORA do
 * conteúdo animado: elementos com animação de `transform` viram referência
 * para filhos `position: fixed`, o que deslocaria o botão para o meio da tela.
 */
export default function AppScreen({ header, nav = false, fab, children, contentSx }) {
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
      {fab && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: nav ? 'calc(env(safe-area-inset-bottom, 0px) + 100px)' : 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            zIndex: (theme) => theme.zIndex.speedDial,
            pointerEvents: 'none'
          }}
        >
          <Box sx={{ maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Fab color="primary" aria-label={fab.label} onClick={fab.onClick} sx={{ pointerEvents: 'auto' }}>
              {fab.icon}
            </Fab>
          </Box>
        </Box>
      )}
      {nav && <BottomNav />}
    </Box>
  )
}
