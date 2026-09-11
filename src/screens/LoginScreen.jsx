import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { brand } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { signIn, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await signIn(email, password)
      navigate('/welcome', { replace: true })
    } catch {
      // erro já fica disponível via `error` do contexto
    }
  }

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: brand.cream
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(160deg, ${brand.wine} 0%, ${brand.rose} 100%)`,
          color: '#fff',
          px: 4,
          pt: 8,
          pb: 6,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32
        }}
      >
        <Box
          component="img"
          src="/icons/icon-192.png"
          alt="Afrodite"
          sx={{ width: 56, height: 56, borderRadius: '26%', mb: 2 }}
        />
        <Typography variant="h5" fontWeight={700}>
          Bem-vinda(o) de volta
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
          Acesse sua conta para gerenciar sua clínica
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          px: 4,
          pt: 5
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="username"
        />

        <TextField
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ mt: 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
          Ambiente de demonstração — use admin@afrodite.com / 123456
        </Typography>
      </Box>
    </Box>
  )
}
