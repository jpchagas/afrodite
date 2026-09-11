import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import SplashScreen from './screens/SplashScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import PlaceholderScreen from './screens/PlaceholderScreen.jsx'

const SPLASH_DURATION_MS = 1600

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/welcome" replace /> : <LoginScreen />}
      />
      <Route
        path="/welcome"
        element={
          <PrivateRoute>
            <WelcomeScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/pacientes"
        element={
          <PrivateRoute>
            <PlaceholderScreen title="Pacientes" />
          </PrivateRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <PrivateRoute>
            <PlaceholderScreen title="Agenda" />
          </PrivateRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <PlaceholderScreen title="Perfil" />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/welcome' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash) return <SplashScreen />

  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
