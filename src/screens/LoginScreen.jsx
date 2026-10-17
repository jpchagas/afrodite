import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Link,
  CircularProgress
} from '@mui/material'
import Visibility from '@mui/icons-material/VisibilityRounded'
import VisibilityOff from '@mui/icons-material/VisibilityOffRounded'
import GoogleIcon from '@mui/icons-material/Google'
import AppleIcon from '@mui/icons-material/Apple'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import BrandMark from '../components/BrandMark.jsx'
import { HeaderIconButton } from '../components/ScreenHeader.jsx'

export default function LoginScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signIn, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <Box sx={{ minHeight: '100dvh', background: brand.cream }}>
      <Box
        sx={{
          maxWidth: 480,
          mx: 'auto',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          px: 3,
          pt: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          animation: 'afFadeUp 420ms cubic-bezier(.2,.7,.3,1) both'
        }}
      >
        <Box>
          <HeaderIconButton aria-label="Voltar" onClick={() => navigate('/')}>
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} />
          </HeaderIconButton>
        </Box>

        <Stack spacing={1} sx={{ mt: 4, mb: 4 }}>
          <BrandMark size={40} color={brand.wine} />
          <Typography variant="h3" component="h1" sx={{ fontSize: '2.4rem', pt: 1 }}>
            Bem-vinda de volta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Entre para continuar cuidando da sua clínica.
          </Typography>
        </Stack>

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

          <TextField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handleChange(setPassword)}
            required
            fullWidth
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
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
      </Box>
    </Box>
  )
}
