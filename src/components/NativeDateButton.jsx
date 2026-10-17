import React from 'react'
import { Box } from '@mui/material'

/**
 * Envolve um botão com um input de data nativo invisível por cima: no
 * celular abre o seletor do sistema; no desktop usa showPicker().
 */
export default function NativeDateButton({ value, min, onChange, label = 'Escolher data', children, sx }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', ...sx }}>
      {children}
      <Box
        component="input"
        type="date"
        aria-label={label}
        value={value || ''}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.target.showPicker?.()
          } catch {
            // sem showPicker: o próprio input abre o seletor
          }
        }}
        sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
      />
    </Box>
  )
}
