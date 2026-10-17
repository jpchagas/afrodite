import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardActionArea, Skeleton, Stack, Typography } from '@mui/material'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import { brand, gradients, shadows } from '../theme/theme.js'
import { useAuth } from '../context/AuthContext.jsx'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAsync } from '../hooks/useAsync.js'
import { formatCurrency, formatLongDate, greeting } from '../utils/format.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import MetricCard from '../components/MetricCard.jsx'
import InsightCard from '../components/InsightCard.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import ListCard from '../components/ListCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import PersonAvatar from '../components/PersonAvatar.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import { ErrorState, ListSkeleton, EmptyState } from '../components/StateViews.jsx'

function RevenueCard({ summary, onClick }) {
  if (!summary) return <Skeleton variant="rounded" height={132} />
  const growth = summary.monthRevenueGrowthPct
  const up = growth == null || growth >= 0
  return (
    <Card sx={{ background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
      <CardActionArea onClick={onClick} sx={{ p: 2.5 }}>
        <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
          Faturamento do mês
        </Typography>
        <Typography
          sx={{ fontSize: '2.1rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(summary.monthRevenue, { cents: false })}
        </Typography>
        {growth != null && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
              px: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.14)',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {up ? <TrendingUpRoundedIcon sx={{ fontSize: 16 }} /> : <TrendingDownRoundedIcon sx={{ fontSize: 16 }} />}
            {growth > 0 ? '+' : ''}
            {growth}% vs. mês anterior
          </Box>
        )}
      </CardActionArea>
    </Card>
  )
}

export default function HomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const summary = useAsync(() => afroditeApi.getDashboardSummary(), [])
  const today = afroditeApi.getAgendaDayTabs(1)[0].key
  const agenda = useAsync(() => afroditeApi.getAppointmentsForDay(today), [today])

  const s = summary.data
  const firstName = user?.name || 'Dra.'
  const now = Date.now()
  const upcoming = (agenda.data || [])
    .filter((a) => a.status !== 'Concluído')
    .filter((a) => a.status === 'Em atendimento' || a.date.getTime() + (a.durationMin || 0) * 60_000 >= now)
    .slice(0, 3)

  return (
    <AppScreen
      nav
      header={
        <ScreenHeader
          large
          eyebrow={formatLongDate(new Date(), { weekday: 'long', day: '2-digit', month: 'long' })}
          title={`${greeting()}, ${firstName}`}
          actions={
            <>
            <NotificationBell />
            <Box
              component="button"
              onClick={() => navigate('/mais')}
              aria-label="Perfil"
              sx={{ border: 0, p: 0, background: 'none', cursor: 'pointer', borderRadius: '50%' }}
            >
              <PersonAvatar name={user?.name} size={40} />
            </Box>
            </>
          }
        />
      }
    >
      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : (
        <>
          <RevenueCard summary={s} onClick={() => navigate('/financeiro')} />

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mt: 1.25 }}>
            <MetricCard
              loading={!s}
              icon={<EventAvailableRoundedIcon />}
              value={s?.appointmentsToday}
              label="Consultas hoje"
              onClick={() => navigate('/agenda')}
            />
            <MetricCard
              loading={!s}
              icon={<PersonAddAltRoundedIcon />}
              value={s?.newLeads24h}
              label="Leads em 24h"
              onClick={() => navigate('/leads')}
            />
            <MetricCard
              loading={!s}
              icon={<DescriptionRoundedIcon />}
              value={s?.pendingProposals}
              label="Propostas"
              onClick={() => navigate('/leads')}
            />
          </Box>
        </>
      )}

      <SectionTitle
        action={
          <Button size="small" onClick={() => navigate('/agenda')} sx={{ color: brand.wine }}>
            Ver agenda
          </Button>
        }
      >
        Próximos atendimentos
      </SectionTitle>

      {agenda.loading && <ListSkeleton count={3} height={72} />}
      {agenda.error && <ErrorState error={agenda.error} onRetry={agenda.reload} />}
      {agenda.data && upcoming.length === 0 && (
        <EmptyState
          icon={<EventAvailableRoundedIcon />}
          title="Agenda livre"
          description="Nenhum atendimento restante para hoje."
          sx={{ py: 3 }}
        />
      )}
      <Stack spacing={1.25}>
        {upcoming.map((appt, idx) => (
          <ListCard
            key={appt.id}
            index={idx}
            onClick={() => navigate(`/agenda/${appt.id}`)}
            leading={<PersonAvatar name={appt.patientName} />}
            title={appt.patientName}
            subtitle={`${appt.time} • ${appt.procedure}`}
            trailing={appt.status !== 'Agendado' && <StatusChip status={appt.status} />}
          />
        ))}
      </Stack>

      <Box sx={{ mt: 3.5 }}>
        {s ? (
          <InsightCard
            title="Insights da IA"
            text={s.aiInsight.text}
            actionLabel="Ver oportunidades"
            onAction={() => navigate('/pacientes')}
          />
        ) : (
          !summary.error && <Skeleton variant="rounded" height={170} />
        )}
      </Box>
    </AppScreen>
  )
}
