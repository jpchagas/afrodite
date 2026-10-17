import React from 'react'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { EmptyState } from '../components/StateViews.jsx'

export default function PlaceholderScreen({ title }) {
  const navigate = useNavigate()
  return (
    <AppScreen header={<ScreenHeader title={title} back />}>
      <EmptyState
        icon={<AutoAwesomeRoundedIcon />}
        title="Em breve"
        description="Esta área ainda está em construção e chega em uma próxima versão."
        action={
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        }
        sx={{ pt: 10 }}
      />
    </AppScreen>
  )
}
