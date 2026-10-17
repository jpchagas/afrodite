import React from 'react'
import { Tab, Tabs } from '@mui/material'

// Abas de seção (sublinhado) usadas abaixo de cabeçalhos de perfil
export default function SectionTabs({ value, onChange, items }) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      variant="scrollable"
      scrollButtons={false}
      sx={{ mx: -1.25, mb: -1.5 }}
    >
      {items.map((label, idx) => (
        <Tab key={label} value={idx} label={label} />
      ))}
    </Tabs>
  )
}
