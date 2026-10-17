import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { FullScreenLoader } from './components/StateViews.jsx'
import SplashScreen from './screens/SplashScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import PlaceholderScreen from './screens/PlaceholderScreen.jsx'
import PatientsListScreen from './screens/patients/PatientsListScreen.jsx'
import PatientProfileScreen from './screens/patients/PatientProfileScreen.jsx'
import AnamneseScreen from './screens/patients/AnamneseScreen.jsx'
import PrescriptionsScreen from './screens/patients/PrescriptionsScreen.jsx'
import AgendaScreen from './screens/AgendaScreen.jsx'
import AppointmentDetailScreen from './screens/AppointmentDetailScreen.jsx'
import FinanceiroScreen from './screens/FinanceiroScreen.jsx'
import MaisScreen from './screens/MaisScreen.jsx'
import LeadsListScreen from './screens/leads/LeadsListScreen.jsx'
import LeadDetailScreen from './screens/leads/LeadDetailScreen.jsx'
import WhatsAppScreen from './screens/leads/WhatsAppScreen.jsx'

// Telas que exigem login
const PRIVATE_ROUTES = [
  ['/home', HomeScreen],
  ['/pacientes', PatientsListScreen],
  ['/pacientes/:id', PatientProfileScreen],
  ['/pacientes/:id/anamnese', AnamneseScreen],
  ['/pacientes/:id/prescricoes', PrescriptionsScreen],
  ['/agenda', AgendaScreen],
  ['/agenda/:id', AppointmentDetailScreen],
  ['/leads', LeadsListScreen],
  ['/leads/:id', LeadDetailScreen],
  ['/leads/:id/whatsapp', WhatsAppScreen],
  ['/mais', MaisScreen],
  ['/financeiro', FinanceiroScreen]
]

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// Telas públicas redirecionam para a Home quando já há sessão
function PublicOnlyRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/home" replace /> : children
}

function AppRoutes() {
  const { user, initializing } = useAuth()

  // Aguarda o Firebase restaurar a sessão antes de decidir o redirecionamento
  if (initializing) return <FullScreenLoader />

  return (
    <Routes>
      <Route path="/" element={<PublicOnlyRoute><SplashScreen /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><LoginScreen /></PublicOnlyRoute>} />
      <Route path="/criar-conta" element={<PlaceholderScreen title="Criar conta" />} />
      <Route path="/esqueci-senha" element={<PlaceholderScreen title="Recuperar senha" />} />

      {PRIVATE_ROUTES.map(([path, Screen]) => (
        <Route
          key={path}
          path={path}
          element={
            <PrivateRoute>
              <Screen />
            </PrivateRoute>
          }
        />
      ))}

      <Route path="*" element={<Navigate to={user ? '/home' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
