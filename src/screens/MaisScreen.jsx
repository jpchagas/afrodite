import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography
} from '@mui/material'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import SellRoundedIcon from '@mui/icons-material/SellRounded'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import PersonAvatar from '../components/PersonAvatar.jsx'
import SectionTitle from '../components/SectionTitle.jsx'

const ROLE_LABEL = { medica: 'Médica responsável', recepcao: 'Recepção', admin: 'Administração' }

function MenuIcon({ children, color = brand.wine, bg = brand.blush }) {
  return (
    <ListItemIcon sx={{ minWidth: 48 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: bg, color, '& svg': { fontSize: 19 } }}>
        {children}
      </Box>
    </ListItemIcon>
  )
}

export default function MaisScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  const items = [
    { icon: <PaidRoundedIcon />, label: 'Financeiro', onClick: () => navigate('/financeiro') },
    { icon: <SellRoundedIcon />, label: 'Vendas' },
    { icon: <CampaignRoundedIcon />, label: 'Marketing' },
    { icon: <SettingsRoundedIcon />, label: 'Configurações' }
  ]

  return (
    <AppScreen nav header={<ScreenHeader large title="Mais" />}>
      <Card sx={{ p: 2.25, display: 'flex', alignItems: 'center', gap: 2 }}>
        <PersonAvatar name={user?.name} size={56} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="p" noWrap>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {[ROLE_LABEL[user?.role], user?.email].filter(Boolean).join(' • ')}
          </Typography>
        </Box>
      </Card>

      <SectionTitle>Gestão</SectionTitle>
      <Card sx={{ overflow: 'hidden' }}>
        <List disablePadding>
          {items.map((item, idx) => (
            <React.Fragment key={item.label}>
              <ListItemButton onClick={item.onClick} disabled={!item.onClick} sx={{ py: 1.25 }}>
                <MenuIcon>{item.icon}</MenuIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.92rem' }}
                />
                {item.onClick ? (
                  <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
                ) : (
                  <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 999, bgcolor: '#f0ecee', fontWeight: 600 }}>
                    Em breve
                  </Typography>
                )}
              </ListItemButton>
              {idx < items.length - 1 && <Divider component="li" sx={{ ml: 8 }} />}
            </React.Fragment>
          ))}
        </List>
      </Card>

      <Card sx={{ mt: 2, overflow: 'hidden' }}>
        <ListItemButton onClick={handleLogout} sx={{ py: 1.25 }}>
          <MenuIcon color="#b3364a" bg="#fbe9ec">
            <LogoutRoundedIcon />
          </MenuIcon>
          <ListItemText primary="Sair" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.92rem', color: '#b3364a' }} />
        </ListItemButton>
      </Card>

      <Typography variant="caption" color="text.secondary" component="p" textAlign="center" sx={{ mt: 4, opacity: 0.7 }}>
        Afrodite CRM • versão 0.1.0
      </Typography>
    </AppScreen>
  )
}
