import React from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { brand } from '../theme/theme.js'

/**
 * Filtros em formato de pílula. `items`: [{ value, label, count? }]
 */
export default function PillTabs({ value, onChange, items, sx }) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      variant="scrollable"
      scrollButtons={false}
      sx={{
        minHeight: 36,
        mx: -2.5,
        px: 2.5,
        '& .MuiTabs-flexContainer': { gap: 1 },
        '& .MuiTabs-indicator': { display: 'none' },
        '& .MuiTab-root': {
          minHeight: 36,
          py: 0.75,
          px: 1.75,
          borderRadius: 999,
          fontSize: '0.82rem',
          bgcolor: brand.surface,
          border: `1px solid ${brand.line}`,
          color: brand.muted,
          transition: 'all 180ms ease'
        },
        '& .MuiTab-root.Mui-selected': {
          bgcolor: brand.wine,
          borderColor: brand.wine,
          color: '#fff'
        },
        ...sx
      }}
    >
      {items.map((item) => (
        <Tab
          key={item.value}
          value={item.value}
          disableRipple
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              {item.label}
              {item.count != null && (
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.7rem',
                    px: 0.75,
                    borderRadius: 999,
                    lineHeight: '18px',
                    bgcolor: value === item.value ? 'rgba(255,255,255,0.22)' : brand.blush
                  }}
                >
                  {item.count}
                </Box>
              )}
            </Box>
          }
        />
      ))}
    </Tabs>
  )
}
