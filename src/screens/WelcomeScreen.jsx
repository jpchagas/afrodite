import React from 'react'
import { Box, Typography, Card, CardContent, Avatar } from '@mui/material'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import BottomNav from '../components/BottomNav.jsx'

const SUMMARY = [
  { icon: <GroupsRoundedIcon />, label: 'Pacientes ativos', value: '—' },
  { icon: <EventAvailableRoundedIcon />, label: 'Consultas hoje', value: '—' },
  { icon: <LocalHospitalRoundedIcon />, label: 'Procedimentos no mês', value: '—' }
]

export default function WelcomeScreen() {
  const { user } = useAuth()

  return (
    <Box sx={{ minHeight: '100dvh', background: brand.cream, pb: 10 }}>
      <Box
        sx={{
          background: `linear-gradient(160deg, ${brand.wine} 0%, ${brand.rose} 100%)`,
          color: '#fff',
          px: 3,
          pt: 7,
          pb: 5,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32
        }}
      >
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Olá,
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {user?.name || 'Equipe Afrodite'}
        </Typography>
      </Box>

      <Box sx={{ px: 3, mt: -3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SUMMARY.map((item) => (
          <Card key={item.label} elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: brand.roseLight, color: brand.wineDark }}>
                {item.icon}
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {item.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Os dados acima serão preenchidos assim que a integração com o Afrodite estiver disponível.
        </Typography>
      </Box>

      <BottomNav />
    </Box>
  )
}
