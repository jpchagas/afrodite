import React from 'react'
import { Avatar } from '@mui/material'
import { initials } from '../utils/format.js'

// Paletas suaves; a cor é escolhida de forma estável a partir do nome
const PALETTES = [
  { from: '#f6e6ec', to: '#e8c9d6', fg: '#4a2736' },
  { from: '#f3ebdf', to: '#e4d1b4', fg: '#6a4d27' },
  { from: '#ebe7f3', to: '#d4cbe6', fg: '#46396b' },
  { from: '#e5efe9', to: '#c9ddd0', fg: '#2c5741' },
  { from: '#f5e7e2', to: '#e8cbc0', fg: '#6b3a2c' }
]

function paletteFor(name = '') {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

export default function PersonAvatar({ name, size = 44, sx }) {
  const p = paletteFor(name)
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: p.fg,
        background: `linear-gradient(145deg, ${p.from} 0%, ${p.to} 100%)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
        ...sx
      }}
    >
      {initials(name)}
    </Avatar>
  )
}
