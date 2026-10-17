import React from 'react'
import { Box, Drawer, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'

export default function BottomSheet({ open, onClose, title, subtitle, children, footer }) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <Box sx={{ maxWidth: 560, width: '100%', mx: 'auto', maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.roseLight, mx: 'auto', mt: 1.25, opacity: 0.7 }} />
        {title && (
          <Box sx={{ px: 3, pt: 2, pb: 1 }}>
            <Typography variant="h5">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        <Box sx={{ px: 3, py: 1.5, overflowY: 'auto', flex: 1 }}>{children}</Box>
        {footer && <Box sx={{ px: 3, pt: 1, pb: 2.5 }}>{footer}</Box>}
      </Box>
    </Drawer>
  )
}
