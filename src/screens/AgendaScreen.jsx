import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import { brand, shadows } from '../theme/theme.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAsync } from '../hooks/useAsync.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import ListCard from '../components/ListCard.jsx'
import PersonAvatar from '../components/PersonAvatar.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews.jsx'

function DayStrip({ days, value, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        mx: -2.5,
        px: 2.5,
        pb: 0.5,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      {days.map((d) => {
        const selected = d.key === value
        return (
          <ButtonBase
            key={d.key}
            onClick={() => onChange(d.key)}
            sx={{
              flex: '0 0 auto',
              width: 54,
              py: 1.1,
              borderRadius: '18px',
              flexDirection: 'column',
              gap: 0.25,
              bgcolor: selected ? brand.wine : brand.surface,
              color: selected ? '#fff' : brand.ink,
              border: `1px solid ${selected ? brand.wine : brand.line}`,
              boxShadow: selected ? shadows.raised : 'none',
              transition: 'all 200ms ease'
            }}
          >
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, opacity: selected ? 0.85 : 0.6 }}>
              {d.weekday}
            </Typography>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 650, lineHeight: 1.2 }}>{d.day}</Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

export default function AgendaScreen() {
  const navigate = useNavigate()
  const dayTabs = useMemo(() => afroditeApi.getAgendaDayTabs(), [])
  const [selectedDay, setSelectedDay] = useState(dayTabs[0]?.key)
  const { data: appointments, error, loading, reload } = useAsync(
    () => afroditeApi.getAppointmentsForDay(selectedDay),
    [selectedDay]
  )

  const selectedTab = dayTabs.find((d) => d.key === selectedDay)
  const count = appointments?.length

  return (
    <AppScreen
      nav
      header={
        <ScreenHeader large title="Agenda" eyebrow={selectedTab?.label === 'Hoje' ? 'Hoje' : selectedTab?.label}>
          <DayStrip days={dayTabs} value={selectedDay} onChange={setSelectedDay} />
        </ScreenHeader>
      }
    >
      {appointments && count > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {count} {count === 1 ? 'atendimento' : 'atendimentos'}
        </Typography>
      )}

      {loading && <ListSkeleton count={4} height={72} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {appointments && count === 0 && (
        <EmptyState
          icon={<EventBusyRoundedIcon />}
          title="Nenhum atendimento"
          description="Não há compromissos agendados para este dia."
        />
      )}

      <Stack spacing={1.25}>
        {appointments?.map((appt, idx) => (
          <Box key={appt.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
            <Box sx={{ width: 44, flexShrink: 0, pt: 2, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 650, color: brand.wine, fontVariantNumeric: 'tabular-nums' }}>
                {appt.time}
              </Typography>
              {appt.durationMin && (
                <Typography variant="caption" color="text.secondary">
                  {appt.durationMin}min
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ListCard
                index={idx}
                onClick={() => navigate(`/agenda/${appt.id}`)}
                leading={<PersonAvatar name={appt.patientName} size={40} />}
                title={appt.patientName}
                subtitle={appt.procedure}
                trailing={appt.status !== 'Agendado' && <StatusChip status={appt.status} />}
                chevron={appt.status === 'Agendado'}
              />
            </Box>
          </Box>
        ))}
      </Stack>
    </AppScreen>
  )
}
