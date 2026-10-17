import React from 'react'
import { Box, Typography } from '@mui/material'

export default function SectionTitle({ children, action, sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mt: 3.5,
        mb: 1.5,
        minHeight: 32,
        ...sx
      }}
    >
      <Typography variant="subtitle1" sx={{ fontSize: '1.02rem' }}>
        {children}
      </Typography>
      {action}
    </Box>
  )
}
