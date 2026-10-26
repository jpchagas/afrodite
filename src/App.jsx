import React from 'react'
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import { FullScreenLoader } from './components/StateViews.jsx'
import SplashScreen from './screens/SplashScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import SignUpScreen from './screens/SignUpScreen.jsx'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen.jsx'
import PatientsListScreen from './screens/patients/PatientsListScreen.jsx'
import PatientProfileScreen from './screens/patients/PatientProfileScreen.jsx'
import AnamneseScreen from './screens/patients/AnamneseScreen.jsx'
import PrescriptionsScreen from './screens/patients/PrescriptionsScreen.jsx'
import DocumentsScreen from './screens/patients/DocumentsScreen.jsx'
import AgendaScreen from './screens/AgendaScreen.jsx'
import AppointmentDetailScreen from './screens/AppointmentDetailScreen.jsx'
import FinanceiroScreen from './screens/FinanceiroScreen.jsx'
import MaisScreen from './screens/MaisScreen.jsx'
import LeadsListScreen from './screens/leads/LeadsListScreen.jsx'
import LeadDetailScreen from './screens/leads/LeadDetailScreen.jsx'
import WhatsAppScreen from './screens/leads/WhatsAppScreen.jsx'
import NotificationsScreen from './screens/NotificationsScreen.jsx'
import SalesScreen from './screens/sales/SalesScreen.jsx'
import QuoteDetailScreen from './screens/sales/QuoteDetailScreen.jsx'
import CareScreen from './screens/care/CareScreen.jsx'
import MarketingScreen from './screens/marketing/MarketingScreen.jsx'
import CampaignDetailScreen from './screens/marketing/CampaignDetailScreen.jsx'

// Telas que exigem login
const PRIVATE_ROUTES = [
  ['/home', HomeScreen],
  ['/pacientes', PatientsListScreen],
  ['/pacientes/:id', PatientProfileScreen],
  ['/pacientes/:id/anamnese', AnamneseScreen],
  ['/pacientes/:id/prescricoes', PrescriptionsScreen],
  ['/pacientes/:id/documentos', DocumentsScreen],
  ['/agenda', AgendaScreen],
  ['/agenda/:id', AppointmentDetailScreen],
  ['/leads', LeadsListScreen],
  ['/leads/:id', LeadDetailScreen],
  ['/leads/:id/whatsapp', WhatsAppScreen],
  ['/mais', MaisScreen],
  ['/financeiro', FinanceiroScreen],
  ['/notificacoes', NotificationsScreen],
  ['/vendas', SalesScreen],
  ['/vendas/orcamentos/:id', QuoteDetailScreen],
  ['/cuidados', CareScreen],
  ['/marketing', MarketingScreen],
  ['/marketing/campanhas/:id', CampaignDetailScreen]
]

// Remonta a tela quando o :id da URL muda (ex.: de um lead para outro pela
// notificação), para não herdar aba, formulários abertos ou dados do anterior
function KeyedByParams({ Screen }) {
  const params = useParams()
  return <Screen key={JSON.stringify(params)} />
}

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
      <Route path="/criar-conta" element={<PublicOnlyRoute><SignUpScreen /></PublicOnlyRoute>} />
      <Route path="/esqueci-senha" element={<PublicOnlyRoute><ForgotPasswordScreen /></PublicOnlyRoute>} />

      {PRIVATE_ROUTES.map(([path, Screen]) => (
        <Route
          key={path}
          path={path}
          element={
            <PrivateRoute>
              <KeyedByParams Screen={Screen} />
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
        <NotificationsProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </NotificationsProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
