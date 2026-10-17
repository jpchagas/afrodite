import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import * as afroditeApi from '../services/afroditeApi.js'
import AuthLayout, { AuthIcon } from '../components/AuthLayout.jsx'

export default function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState(null)

  const valid = /^\S+@\S+\.\S+$/.test(email.trim())

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!valid) return
    setSending(true)
    setError(null)
    try {
      await afroditeApi.requestPasswordReset(email)
      setSentTo(email.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        subtitle={`Se existir uma conta para ${sentTo}, você vai receber um link para criar uma nova senha.`}
        icon={
          <AuthIcon>
            <MarkEmailReadRoundedIcon />
          </AuthIcon>
        }
      >
        <Typography variant="body2" color="text.secondary">
          O link expira em 1 hora. Não encontrou? Confira a caixa de spam ou promoções.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 4 }}>
          <Button size="large" variant="contained" onClick={() => navigate('/login', { replace: true })}>
            Voltar para o login
          </Button>
          <Button size="large" variant="text" onClick={handleSubmit} disabled={sending}>
            {sending ? <CircularProgress size={20} /> : 'Reenviar e-mail'}
          </Button>
        </Box>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          autoComplete="email"
          autoFocus
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={!valid || sending}>
          {sending ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar link'}
        </Button>
      </Box>
    </AuthLayout>
  )
}
