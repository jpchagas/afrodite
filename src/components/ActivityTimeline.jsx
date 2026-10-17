import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, ButtonBase, Typography } from '@mui/material'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import MailRoundedIcon from '@mui/icons-material/MailRounded'
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../theme/theme.js'
import { TONES } from '../theme/status.js'

const TYPES = {
  ligacao: { icon: <PhoneRoundedIcon />, label: 'Ligação', tone: TONES.brand },
  whatsapp: { icon: <WhatsAppIcon />, label: 'WhatsApp', tone: TONES.success },
  visita: { icon: <StorefrontRoundedIcon />, label: 'Visita', tone: TONES.brand },
  email: { icon: <MailRoundedIcon />, label: 'E-mail', tone: TONES.info },
  nota: { icon: <StickyNote2RoundedIcon />, label: 'Nota', tone: TONES.warning },
  status: { icon: <SwapHorizRoundedIcon />, label: 'Etapa', tone: TONES.neutral },
  criado: { icon: <FlagRoundedIcon />, label: 'Cadastro', tone: TONES.neutral },
  conversao: { icon: <HowToRegRoundedIcon />, label: 'Conversão', tone: TONES.success },
  perdido: { icon: <DoNotDisturbOnRoundedIcon />, label: 'Perdido', tone: TONES.danger },
  followup: { icon: <ScheduleRoundedIcon />, label: 'Próximo contato', tone: TONES.neutral },
  proposta: { icon: <RequestQuoteRoundedIcon />, label: 'Proposta', tone: TONES.brandStrong },
  agendamento: { icon: <EventAvailableRoundedIcon />, label: 'Agendamento', tone: TONES.info },
  procedimento: { icon: <SpaRoundedIcon />, label: 'Procedimento', tone: TONES.brand }
}

function formatWhen(date) {
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).replace('.', '')
  const hasTime = date.getHours() || date.getMinutes()
  return hasTime ? `${day} • ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : day
}

// Agrupa por mês ("Outubro de 2026")
function monthLabel(date) {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Linha do tempo do relacionamento. `items`: [{ id, type, date, title?, text, label?,
 * createdByName?, link?, future?, fromLead? }]
 */
export default function ActivityTimeline({ items }) {
  const navigate = useNavigate()
  let lastMonth = null

  return (
    <Box>
      {items.map((item, idx) => {
        const cfg = TYPES[item.type] || TYPES.nota
        const month = monthLabel(item.date)
        const showMonth = month !== lastMonth
        lastMonth = month
        const title = item.title || item.label || cfg.label
        const body = item.title ? item.text : item.text !== title ? item.text : null
        const content = (
          <Box sx={{ display: 'flex', gap: 1.5, width: '100%', textAlign: 'left', py: 1.25 }}>
            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: cfg.tone.bg,
                  color: cfg.tone.fg,
                  border: item.future ? `1.5px dashed ${cfg.tone.dot}` : 'none',
                  zIndex: 1,
                  '& svg': { fontSize: 17 }
                }}
              >
                {cfg.icon}
              </Box>
              {idx < items.length - 1 && (
                <Box sx={{ position: 'absolute', top: 34, bottom: -10, width: 2, bgcolor: brand.blush, borderRadius: 1 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.88rem' }}>
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', pt: 0.25 }}>
                  {formatWhen(item.date)}
                </Typography>
              </Box>
              {body && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {body}
                </Typography>
              )}
              {(item.createdByName || item.fromLead) && (
                <Typography variant="caption" sx={{ color: brand.muted, opacity: 0.85 }}>
                  {[item.fromLead && 'Como lead', item.createdByName && `por ${item.createdByName}`].filter(Boolean).join(' • ')}
                </Typography>
              )}
            </Box>
            {item.link && <ChevronRightRoundedIcon sx={{ color: brand.roseLight, alignSelf: 'center' }} />}
          </Box>
        )
        return (
          <React.Fragment key={item.id}>
            {showMonth && (
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: idx ? 1.5 : 0, mb: 0.25 }}>
                {month}
              </Typography>
            )}
            {item.link ? (
              <ButtonBase onClick={() => navigate(item.link)} sx={{ width: '100%', borderRadius: 2 }}>
                {content}
              </ButtonBase>
            ) : (
              content
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
