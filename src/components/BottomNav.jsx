import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import { brand, shadows } from '../theme/theme.js'

const TABS = [
  { label: 'Início', value: '/home', icon: <HomeRoundedIcon /> },
  { label: 'Agenda', value: '/agenda', icon: <CalendarMonthRoundedIcon /> },
  { label: 'Pacientes', value: '/pacientes', icon: <PeopleAltRoundedIcon /> },
  { label: 'Leads', value: '/leads', icon: <PersonSearchRoundedIcon /> },
  { label: 'Mais', value: '/mais', icon: <GridViewRoundedIcon /> }
]

// Telas acessadas a partir do menu "Mais" mantêm essa aba destacada
const MAIS_ROUTES = ['/financeiro']

function NavIcon({ children }) {
  return (
    <Box
      className="af-nav-icon"
      sx={{
        width: 48,
        height: 30,
        borderRadius: 15,
        display: 'grid',
        placeItems: 'center',
        transition: 'background-color 200ms ease, transform 200ms ease',
        '& svg': { fontSize: 22 }
      }}
    >
      {children}
    </Box>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const path = location.pathname
  const activeTab = MAIS_ROUTES.some((r) => path.startsWith(r))
    ? '/mais'
    : TABS.find((t) => path.startsWith(t.value))?.value || false

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        px: 2,
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        zIndex: (theme) => theme.zIndex.appBar,
        pointerEvents: 'none'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 520,
          mx: 'auto',
          borderRadius: '24px',
          overflow: 'hidden',
          pointerEvents: 'auto',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'saturate(1.6) blur(20px)',
          WebkitBackdropFilter: 'saturate(1.6) blur(20px)',
          border: `1px solid ${brand.line}`,
          boxShadow: shadows.nav
        }}
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(_, newValue) => newValue !== activeTab && navigate(newValue)}
          sx={{
            '& .Mui-selected .af-nav-icon': { bgcolor: brand.blush }
          }}
        >
          {TABS.map((tab) => (
            <BottomNavigationAction
              key={tab.value}
              label={tab.label}
              value={tab.value}
              icon={<NavIcon>{tab.icon}</NavIcon>}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
