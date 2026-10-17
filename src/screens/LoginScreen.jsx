import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Link,
  CircularProgress
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import AppleIcon from '@mui/icons-material/Apple'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordField from '../components/PasswordField.jsx'

export default function LoginScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signIn, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await signIn(email, password, { remember: rememberMe })
      navigate('/home', { replace: true })
    } catch {
      // erro já fica disponível via `error` do contexto
    }
  }

  function handleChange(setter) {
    return (e) => {
      setter(e.target.value)
      if (error) clearError()
    }
  }

  return (
    <AuthLayout
      title="Bem-vinda de volta"
      subtitle="Entre para continuar cuidando da sua clínica."
      backTo="/"
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}
      >
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={handleChange(setEmail)}
          required
          fullWidth
          autoComplete="username"
          inputMode="email"
        />

        <PasswordField
          label="Senha"
          value={password}
          onChange={handleChange(setPassword)}
          required
          fullWidth
          autoComplete="current-password"
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Manter conectada</Typography>}
          />
          <Link
            component={RouterLink}
            to="/esqueci-senha"
            state={{ email }}
            variant="body2"
            underline="hover"
            sx={{ color: brand.wine, fontWeight: 600 }}
          >
            Esqueci a senha
          </Link>
        </Box>

        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Entrar'}
        </Button>

        <Divider sx={{ my: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            ou continue com
          </Typography>
        </Divider>

        <Stack direction="row" spacing={1.5}>
          {[
            { label: 'Google', icon: <GoogleIcon /> },
            { label: 'Apple', icon: <AppleIcon /> }
          ].map((p) => (
            <Button
              key={p.label}
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={p.icon}
              onClick={() => toast(`Login com ${p.label} chega em breve.`, { severity: 'info' })}
            >
              {p.label}
            </Button>
          ))}
        </Stack>

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 'auto', pt: 4 }}>
          Não tem uma conta?{' '}
          <Link component={RouterLink} to="/criar-conta" underline="hover" fontWeight={600} sx={{ color: brand.wine }}>
            Criar conta
          </Link>
        </Typography>

        {import.meta.env.DEV && (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Ambiente local — admin@afrodite.com / 123456
          </Typography>
        )}
      </Box>
    </AuthLayout>
  )
}
