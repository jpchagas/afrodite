import React from 'react'
import { Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded'
import { brand } from '../theme/theme.js'
import BrandMark from './BrandMark.jsx'
import { friendlyMessage } from '../utils/errors.js'

export function EmptyState({ icon, title, description, action, sx }) {
  return (
    <Box sx={{ textAlign: 'center', py: 5, px: 3, ...sx }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          borderRadius: '22px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: brand.blush,
          color: brand.rose,
          '& svg': { fontSize: 30 }
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 300, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  )
}

export function ErrorState({ error, onRetry, sx }) {
  return (
    <EmptyState
      icon={<CloudOffRoundedIcon />}
      title="Não foi possível carregar"
      description={friendlyMessage(error, 'Verifique sua conexão e tente novamente.')}
      action={
        onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Tentar novamente
          </Button>
        )
      }
      sx={sx}
    />
  )
}

export function ListSkeleton({ count = 4, height = 76, spacing = 1.25 }) {
  return (
    <Stack spacing={spacing}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={height} />
      ))}
    </Stack>
  )
}

export function FullScreenLoader() {
  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: brand.cream
      }}
    >
      <Stack alignItems="center" spacing={2.5}>
        <BrandMark size={44} color={brand.wine} />
        <CircularProgress size={22} thickness={5} sx={{ color: brand.rose }} />
      </Stack>
    </Box>
  )
}
