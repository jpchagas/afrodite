import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, CircularProgress, Stack, Typography } from '@mui/material'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import ChatRoundedIcon from '@mui/icons-material/ChatRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded'
import { brand } from '../theme/theme.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { friendlyMessage } from '../utils/errors.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import ListCard from '../components/ListCard.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews.jsx'

const TYPE_ICON = {
  lead: <PersonAddAltRoundedIcon />,
  mensagem: <ChatRoundedIcon />,
  agendamento: <EventAvailableRoundedIcon />,
  lembrete: <AlarmRoundedIcon />
}

function TypeIcon({ type, unread }) {
  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '13px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: unread ? brand.blush : '#f0ecee',
          color: unread ? brand.wine : brand.muted,
          '& svg': { fontSize: 20 }
        }}
      >
        {TYPE_ICON[type] || <NotificationsNoneRoundedIcon />}
      </Box>
      {unread && (
        <Box
          sx={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: brand.wine,
            border: `2px solid ${brand.surface}`
          }}
        />
      )}
    </Box>
  )
}

const PUSH_COPY = {
  disabled: { text: 'Receba avisos de novos leads e lembretes de atendimento mesmo com o app fechado.', action: 'Ativar' },
  enabled: { text: 'Notificações ativadas neste aparelho.', action: 'Desativar' },
  denied: { text: 'As notificações foram bloqueadas. Libere nas configurações do navegador para este site.' },
  unsupported: { text: 'Este navegador não suporta notificações. No iPhone, adicione o app à Tela de Início e abra por lá.' },
  local: { text: 'Push não funciona com os emuladores locais — teste no app publicado.' },
  unconfigured: { text: 'As notificações no celular estarão disponíveis em breve.' }
}

function PushCard() {
  const toast = useToast()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    afroditeApi.getPushStatus().then(setStatus, () => setStatus('unsupported'))
  }, [])

  if (!status) return null
  const copy = PUSH_COPY[status]

  async function toggle() {
    setBusy(true)
    try {
      if (status === 'enabled') {
        await afroditeApi.disablePushNotifications()
        toast('Notificações desativadas neste aparelho')
      } else {
        await afroditeApi.enablePushNotifications()
        toast('Notificações ativadas')
      }
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível ativar as notificações'), { severity: 'error' })
    } finally {
      setStatus(await afroditeApi.getPushStatus().catch(() => 'unsupported'))
      setBusy(false)
    }
  }

  return (
    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.75, mb: 1 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: '13px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: status === 'enabled' ? '#e8f3ec' : brand.blush,
          color: status === 'enabled' ? '#2f6b47' : brand.wine
        }}
      >
        <NotificationsActiveRoundedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">Notificações no celular</Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          {copy.text}
        </Typography>
      </Box>
      {copy.action && (
        <Button
          size="small"
          variant={status === 'enabled' ? 'text' : 'contained'}
          onClick={toggle}
          disabled={busy}
          sx={{ flexShrink: 0 }}
        >
          {busy ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : copy.action}
        </Button>
      )}
    </Card>
  )
}

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { items, error, loading, unread } = useNotifications()
  const [marking, setMarking] = useState(false)

  const unreadItems = (items || []).filter((n) => !n.read)
  const readItems = (items || []).filter((n) => n.read)

  function open(n) {
    if (!n.read) afroditeApi.markNotificationRead(n.id).catch(() => {})
    if (n.link) navigate(n.link)
  }

  async function markAll() {
    setMarking(true)
    try {
      await afroditeApi.markAllNotificationsRead(unreadItems.map((n) => n.id))
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
    } finally {
      setMarking(false)
    }
  }

  const renderList = (list, offset = 0) => (
    <Stack spacing={1.25}>
      {list.map((n, idx) => (
        <ListCard
          key={n.id}
          index={idx + offset}
          onClick={() => open(n)}
          leading={<TypeIcon type={n.type} unread={!n.read} />}
          title={n.title}
          trailing={
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start', pt: 0.25, whiteSpace: 'nowrap' }}>
              {n.timeLabel}
            </Typography>
          }
          chevron={false}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {n.body}
          </Typography>
        </ListCard>
      ))}
    </Stack>
  )

  return (
    <AppScreen
      header={
        <ScreenHeader
          back
          title="Notificações"
          actions={
            unread > 0 && (
              <Button size="small" onClick={markAll} disabled={marking} sx={{ color: brand.wine }}>
                Marcar todas como lidas
              </Button>
            )
          }
        />
      }
    >
      <PushCard />

      {loading && <ListSkeleton count={4} height={76} />}
      {error && <ErrorState error={error} />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<NotificationsNoneRoundedIcon />}
          title="Tudo em dia"
          description="Novos leads, agendamentos e lembretes de atendimento aparecem aqui."
        />
      )}

      {unreadItems.length > 0 && (
        <>
          <SectionTitle>Novas</SectionTitle>
          {renderList(unreadItems)}
        </>
      )}
      {readItems.length > 0 && (
        <>
          <SectionTitle>Anteriores</SectionTitle>
          {renderList(readItems, unreadItems.length)}
        </>
      )}
    </AppScreen>
  )
}
