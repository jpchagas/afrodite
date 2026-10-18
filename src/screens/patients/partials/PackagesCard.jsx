import React, { useState } from 'react'
import { Box, Button, Card, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material'
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded'
import { brand } from '../../../theme/theme.js'
import * as afroditeApi from '../../../services/afroditeApi.js'
import { useToast } from '../../../context/ToastContext.jsx'
import { friendlyMessage } from '../../../utils/errors.js'

/**
 * Pacotes de sessões da paciente. Com `appointmentId`, permite usar uma
 * sessão nesse atendimento (uma vez por pacote).
 */
export default function PackagesCard({ patientId, packages, onChange, appointmentId }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  if (!packages?.length) return null

  async function consume(pkg) {
    setBusy(pkg.id)
    try {
      const updated = await afroditeApi.consumePackageSession(patientId, pkg.id, { appointmentId })
      onChange(packages.map((p) => (p.id === pkg.id ? updated : p)))
      toast(`Sessão usada • restam ${updated.remaining}`)
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível usar a sessão'), { severity: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <InventoryRoundedIcon sx={{ fontSize: 19, color: brand.wine }} />
        <Typography variant="subtitle2">Pacotes</Typography>
      </Box>
      <Stack spacing={1.75}>
        {packages.map((p) => {
          const usedHere = appointmentId && (p.usage || []).some((u) => u.appointmentId === appointmentId)
          return (
            <Box key={p.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {p.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {p.usedSessions || 0} de {p.totalSessions} sessões
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={((p.usedSessions || 0) / p.totalSessions) * 100}
                sx={{ mt: 0.75, height: 6, borderRadius: 3, bgcolor: brand.blush, '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: brand.wine } }}
              />
              {appointmentId && p.remaining > 0 && (
                <Button
                  size="small"
                  variant={usedHere ? 'text' : 'outlined'}
                  disabled={usedHere || busy === p.id}
                  onClick={() => consume(p)}
                  sx={{ mt: 1 }}
                >
                  {busy === p.id ? <CircularProgress size={16} /> : usedHere ? 'Sessão usada neste atendimento' : 'Usar 1 sessão neste atendimento'}
                </Button>
              )}
              {p.remaining === 0 && (
                <Typography variant="caption" sx={{ color: '#2f6b47', fontWeight: 600 }}>
                  Pacote concluído
                </Typography>
              )}
            </Box>
          )
        })}
      </Stack>
    </Card>
  )
}
