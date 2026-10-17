import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@mui/material'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { brand } from '../theme/theme.js'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { HeaderIconButton } from './ScreenHeader.jsx'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { unread } = useNotifications()
  return (
    <HeaderIconButton
      aria-label={unread ? `Notificações (${unread} não lidas)` : 'Notificações'}
      onClick={() => navigate('/notificacoes')}
    >
      <Badge
        badgeContent={unread}
        max={9}
        sx={{ '& .MuiBadge-badge': { bgcolor: brand.wine, color: '#fff', fontWeight: 700, fontSize: 10, minWidth: 18, height: 18, top: -2, right: -2 } }}
      >
        <NotificationsNoneRoundedIcon sx={{ fontSize: 21 }} />
      </Badge>
    </HeaderIconButton>
  )
}
