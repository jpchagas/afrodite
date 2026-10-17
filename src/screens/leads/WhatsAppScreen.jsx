import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton
} from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import ScheduleSendRoundedIcon from '@mui/icons-material/ScheduleSendRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded'
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded'
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import { brand, gradients } from '../../theme/theme.js'
import { friendlyMessage } from '../../utils/errors.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import BottomSheet from '../../components/BottomSheet.jsx'
import { ErrorState } from '../../components/StateViews.jsx'

// Ações rápidas: `route` navega; `message` registra a mensagem na conversa;
// `status` também move o lead no funil.
const QUICK_ACTIONS = [
  { icon: <EventAvailableRoundedIcon />, label: 'Agendar consulta', route: '/agenda' },
  { icon: <ScheduleSendRoundedIcon />, label: 'Enviar disponibilidade', message: 'Seguem os horários disponíveis desta semana para a sua avaliação. Qual fica melhor para você?' },
  { icon: <DescriptionRoundedIcon />, label: 'Enviar material', message: 'Material informativo.pdf', attachment: { name: 'Material informativo.pdf', size: '1.8MB' } },
  { icon: <FolderSharedRoundedIcon />, label: 'Protocolos e informações', message: 'Protocolos e cuidados.pdf', attachment: { name: 'Protocolos e cuidados.pdf', size: '1.1MB' } },
  { icon: <NotificationsActiveRoundedIcon />, label: 'Enviar lembrete', message: 'Passando para lembrar do seu horário conosco. Qualquer dúvida, estamos à disposição!' },
  { icon: <AssignmentReturnRoundedIcon />, label: 'Retornos e exames', message: 'Seguem as orientações sobre retorno e os exames recomendados antes do procedimento.' },
  { icon: <FilterAltRoundedIcon />, label: 'Mover para "Em contato"', status: 'Em contato' },
  { icon: <SummarizeRoundedIcon />, label: 'Consultar prontuários', route: '/pacientes' }
]

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function Bubble({ msg }) {
  const mine = msg.from === 'clinica'
  return (
    <Box
      sx={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        background: mine ? '#f1e3e9' : brand.surface,
        borderRadius: '18px',
        borderBottomRightRadius: mine ? 6 : 18,
        borderBottomLeftRadius: mine ? 18 : 6,
        px: 1.5,
        py: 1,
        boxShadow: '0 1px 1px rgba(36,22,28,0.06)',
        opacity: msg.pending ? 0.6 : 1,
        animation: 'afFadeUp 260ms ease both'
      }}
    >
      {msg.attachment ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.5, pr: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: brand.surface }}>
            <PictureAsPdfRoundedIcon sx={{ color: '#c23b4e' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {msg.attachment.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF • {msg.attachment.size}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.text}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
          {msg.time}
        </Typography>
        {mine && <DoneAllRoundedIcon sx={{ fontSize: 14, color: msg.pending ? brand.muted : brand.rose }} />}
      </Box>
    </Box>
  )
}

export default function WhatsAppScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const lead = useAsync(() => afroditeApi.getLead(id), [id])
  const messages = useAsync(() => afroditeApi.getLeadMessages(id), [id])
  const [draft, setDraft] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const scrollRef = useRef(null)

  const count = messages.data?.length
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [count])

  // Mostra a mensagem na hora (pendente) e confirma quando o Firestore gravar
  async function send({ text, attachment }) {
    const tempId = `tmp-${Date.now()}`
    messages.setData((prev) => [
      ...(prev || []),
      { id: tempId, from: 'clinica', text, attachment, time: nowTime(), pending: true }
    ])
    try {
      const saved = await afroditeApi.sendLeadMessage(id, { text, attachment })
      messages.setData((prev) => prev.map((m) => (m.id === tempId ? saved : m)))
      return true
    } catch (err) {
      messages.setData((prev) => prev.filter((m) => m.id !== tempId))
      toast(friendlyMessage(err, 'Mensagem não enviada'), { severity: 'error' })
      return false
    }
  }

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    send({ text })
  }

  async function handleQuickAction(action) {
    setDrawerOpen(false)
    if (action.route) {
      navigate(action.route)
      return
    }
    if (action.status) {
      try {
        lead.setData(await afroditeApi.updateLeadStatus(id, action.status))
        toast(`Lead movido para "${action.status}"`)
      } catch (err) {
        toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
      }
      return
    }
    if (await send({ text: action.message, attachment: action.attachment })) {
      toast(`${action.label} — enviado`)
    }
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#f3ece9' }}>
      <Box
        sx={{
          background: gradients.wine,
          color: '#fff',
          pt: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          pb: 1.25,
          px: 1
        }}
      >
        <Box sx={{ maxWidth: 560, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#fff' }} aria-label="Voltar">
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {lead.data ? (
            <PersonAvatar name={lead.data.name} size={40} />
          ) : (
            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {lead.data?.name || 'Carregando…'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }} noWrap component="div">
              {lead.data ? `${lead.data.phone} • ${lead.data.status}` : ' '}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {messages.loading &&
            [60, 45, 70].map((w, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={46}
                width={`${w}%`}
                sx={{ alignSelf: i % 2 ? 'flex-start' : 'flex-end', borderRadius: '18px' }}
              />
            ))}
          {messages.error && <ErrorState error={messages.error} onRetry={messages.reload} />}
          {messages.data?.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${brand.line}`,
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          pt: 1.25,
          px: 1.25
        }}
      >
        <Box sx={{ maxWidth: 560, mx: 'auto', display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: brand.wine, bgcolor: brand.blush, '&:hover': { bgcolor: brand.blush } }} aria-label="Ações rápidas">
            <AddRoundedIcon />
          </IconButton>
          <InputBase
            fullWidth
            multiline
            maxRows={4}
            placeholder="Mensagem"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            sx={{ bgcolor: brand.cream, borderRadius: '20px', px: 2, py: 1.1, fontSize: '0.92rem', border: `1px solid ${brand.line}` }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Enviar"
            sx={{
              color: '#fff',
              background: gradients.wine,
              '&.Mui-disabled': { background: brand.roseLight, color: '#fff' }
            }}
          >
            <SendRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      <BottomSheet open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Ações rápidas">
        <List disablePadding sx={{ mx: -1.5 }}>
          {QUICK_ACTIONS.map((action) => (
            <ListItemButton key={action.label} onClick={() => handleQuickAction(action)} sx={{ borderRadius: '14px', py: 1 }}>
              <ListItemIcon sx={{ minWidth: 48 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine, '& svg': { fontSize: 19 } }}>
                  {action.icon}
                </Box>
              </ListItemIcon>
              <ListItemText primary={action.label} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.92rem' }} />
            </ListItemButton>
          ))}
        </List>
      </BottomSheet>
    </Box>
  )
}
