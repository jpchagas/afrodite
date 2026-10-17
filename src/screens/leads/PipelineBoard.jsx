import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, ButtonBase, Card, CardActionArea, Typography } from '@mui/material'
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded'
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded'
import { brand } from '../../theme/theme.js'
import { toneFor } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { formatCurrency } from '../../utils/format.js'
import FollowUpChip from '../../components/FollowUpChip.jsx'

function LeadMiniCard({ lead }) {
  const navigate = useNavigate()
  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardActionArea onClick={() => navigate(`/leads/${lead.id}`)} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" noWrap>
          {lead.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {lead.interest}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 650, color: brand.wine, fontVariantNumeric: 'tabular-nums' }}>
            {lead.proposalValue ? formatCurrency(lead.proposalValue, { cents: false }) : '—'}
          </Typography>
          <FollowUpChip lead={lead} sx={{ height: 22, fontSize: '0.68rem' }} />
        </Box>
      </CardActionArea>
    </Card>
  )
}

/**
 * Funil em colunas (uma por etapa aberta), com quantidade e valor por
 * etapa. Convertidos e perdidos aparecem como resumo ao final.
 */
export default function PipelineBoard({ leads, onShowOutcome }) {
  const outcomes = [
    { status: 'Convertido', icon: <HowToRegRoundedIcon />, filter: 'Convertidos' },
    { status: 'Perdido', icon: <DoNotDisturbOnRoundedIcon />, filter: 'Perdidos' }
  ]

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          overflowX: 'auto',
          mx: -2.5,
          px: 2.5,
          pb: 1,
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: '20px',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {afroditeApi.PIPELINE_STAGES.map((stage) => {
          const items = leads.filter((l) => l.status === stage)
          const total = items.reduce((sum, l) => sum + (l.proposalValue || 0), 0)
          const tone = toneFor(stage)
          return (
            <Box
              key={stage}
              sx={{
                flex: '0 0 272px',
                scrollSnapAlign: 'start',
                bgcolor: 'rgba(74, 39, 54, 0.035)',
                borderRadius: '20px',
                p: 1.25,
                alignSelf: 'flex-start'
              }}
            >
              <Box sx={{ px: 0.75, pt: 0.5, pb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tone.dot }} />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {stage}
                  </Typography>
                  <Typography variant="caption" sx={{ px: 0.9, borderRadius: 999, bgcolor: brand.surface, fontWeight: 700 }}>
                    {items.length}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(total, { cents: false })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {items.map((lead) => (
                  <LeadMiniCard key={lead.id} lead={lead} />
                ))}
                {!items.length && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Nenhum lead nesta etapa
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.5 }}>
        {outcomes.map((o) => {
          const items = leads.filter((l) => l.status === o.status)
          const tone = toneFor(o.status)
          return (
            <Card key={o.status}>
              <ButtonBase onClick={() => onShowOutcome(o.filter)} sx={{ width: '100%', p: 1.75, justifyContent: 'flex-start', gap: 1.25 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: tone.bg, color: tone.fg, '& svg': { fontSize: 18 } }}>
                  {o.icon}
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2">{items.length}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.status === 'Convertido' ? 'Convertidos' : 'Perdidos'}
                  </Typography>
                </Box>
              </ButtonBase>
            </Card>
          )
        })}
      </Box>
    </>
  )
}
