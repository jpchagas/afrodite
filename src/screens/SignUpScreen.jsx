import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Link, TextField, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordField from '../components/PasswordField.jsx'

const MIN_PASSWORD = 6

export default function SignUpScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError(null)
  }
  const touch = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  const errors = {
    name: form.name.trim().length < 3 ? 'Informe seu nome completo' : null,
    email: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? 'Informe um e-mail válido' : null,
    password: form.password.length < MIN_PASSWORD ? `Mínimo de ${MIN_PASSWORD} caracteres` : null,
    confirm: form.confirm !== form.password ? 'As senhas não conferem' : null
  }
  const valid = !Object.values(errors).some(Boolean)
  const show = (field) => touched[field] && errors[field]

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true, confirm: true })
    if (!valid) return
    setSaving(true)
    try {
      const { user } = await signUp(form)
      toast(`Conta criada. Bem-vinda, ${user.name.split(' ')[0]}!`)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto. Você entra logo em seguida.">
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}
      >
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Nome completo"
          value={form.name}
          onChange={set('name')}
          onBlur={touch('name')}
          error={!!show('name')}
          helperText={show('name') || ' '}
          autoComplete="name"
          autoFocus
          required
        />
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={set('email')}
          onBlur={touch('email')}
          error={!!show('email')}
          helperText={show('email') || ' '}
          autoComplete="email"
          required
        />
        <PasswordField
          label="Senha"
          value={form.password}
          onChange={set('password')}
          onBlur={touch('password')}
          error={!!show('password')}
          helperText={show('password') || `Mínimo de ${MIN_PASSWORD} caracteres`}
          autoComplete="new-password"
          required
        />
        <PasswordField
          label="Confirmar senha"
          value={form.confirm}
          onChange={set('confirm')}
          onBlur={touch('confirm')}
          error={!!show('confirm')}
          helperText={show('confirm') || ' '}
          autoComplete="new-password"
          required
        />

        <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ mt: 0.5 }}>
          {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Criar conta'}
        </Button>

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 'auto', pt: 4 }}>
          Já tem uma conta?{' '}
          <Link component={RouterLink} to="/login" replace underline="hover" fontWeight={600} sx={{ color: brand.wine }}>
            Entrar
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  )
}
