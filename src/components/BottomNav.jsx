import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'

const TABS = [
  { label: 'Início', value: '/welcome', icon: <HomeRoundedIcon /> },
  { label: 'Pacientes', value: '/pacientes', icon: <PeopleAltRoundedIcon /> },
  { label: 'Agenda', value: '/agenda', icon: <CalendarMonthRoundedIcon /> },
  { label: 'Perfil', value: '/perfil', icon: <PersonRoundedIcon /> }
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Paper
      elevation={8}
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
    >
      <BottomNavigation
        showLabels
        value={location.pathname}
        onChange={(_, newValue) => navigate(newValue)}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            label={tab.label}
            value={tab.value}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
