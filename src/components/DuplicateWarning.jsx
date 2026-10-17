import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Typography } from '@mui/material'

/**
 * Aviso de telefone já cadastrado. `matches`: { leads, patients } vindo de
 * afroditeApi.findContactsByPhone.
 */
export default function DuplicateWarning({ matches, onNavigate }) {
  const navigate = useNavigate()
  const items = [
    ...matches.patients.map((p) => ({ key: `p-${p.id}`, label: `Paciente: ${p.name}`, to: `/pacientes/${p.id}` })),
    ...matches.leads.map((l) => ({ key: `l-${l.id}`, label: `Lead: ${l.name} (${l.status})`, to: `/leads/${l.id}` }))
  ]
  if (!items.length) return null
  return (
    <Alert severity="warning" sx={{ alignItems: 'flex-start' }}>
      <Typography variant="body2" fontWeight={600}>
        Este telefone já está cadastrado
      </Typography>
      {items.map((i) => (
        <Box key={i.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2">{i.label}</Typography>
          <Button
            size="small"
            onClick={() => {
              onNavigate?.()
              navigate(i.to)
            }}
            sx={{ minHeight: 28, color: 'inherit', fontWeight: 700 }}
          >
            Abrir
          </Button>
        </Box>
      ))}
    </Alert>
  )
}
