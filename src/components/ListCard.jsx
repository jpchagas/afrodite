import React from 'react'
import { Box, Card, CardActionArea, Typography } from '@mui/material'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../theme/theme.js'

/**
 * Linha de lista em formato de card: elemento à esquerda (avatar, horário,
 * ícone), título, subtítulo, conteúdo extra e elemento à direita.
 * `index` escalona a animação de entrada.
 */
export default function ListCard({
  leading,
  title,
  subtitle,
  children,
  trailing,
  onClick,
  chevron = !!onClick,
  index = 0
}) {
  const content = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 1.75, width: '100%' }}>
      {leading}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.92rem' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {subtitle}
          </Typography>
        )}
        {children}
      </Box>
      {trailing}
      {chevron && <ChevronRightRoundedIcon sx={{ color: brand.roseLight, ml: -0.5 }} />}
    </Box>
  )

  return (
    <Card
      sx={{
        animation: 'afFadeUp 420ms cubic-bezier(.2,.7,.3,1) both',
        animationDelay: `${Math.min(index, 8) * 45}ms`
      }}
    >
      {onClick ? <CardActionArea onClick={onClick}>{content}</CardActionArea> : content}
    </Card>
  )
}
