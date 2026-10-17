import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import { brand, shadows } from '../theme/theme.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAsync } from '../hooks/useAsync.js'
import { useToast } from '../context/ToastContext.jsx'
import { addDays, formatDateKey, parseDateKey, toDateKey, todayKey } from '../services/dates.js'
import { formatLongDate } from '../utils/format.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader, { HeaderIconButton } from '../components/ScreenHeader.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import ListCard from '../components/ListCard.jsx'
import PersonAvatar from '../components/PersonAvatar.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews.jsx'
import NewAppointmentSheet from './agenda/NewAppointmentSheet.jsx'

const STRIP_DAYS = 14
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function DayStrip({ days, value, onChange, counts }) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [value])

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
        const hasAppointments = counts?.[d.key] > 0
        return (
          <ButtonBase
            key={d.key}
            ref={selected ? selectedRef : null}
            onClick={() => onChange(d.key)}
            aria-label={`${d.label}${hasAppointments ? `, ${counts[d.key]} atendimentos` : ''}`}
            sx={{
              flex: '0 0 auto',
              width: 54,
              pt: 1.1,
              pb: 0.75,
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
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: hasAppointments ? (selected ? '#fff' : brand.rose) : 'transparent'
              }}
            />
          </ButtonBase>
        )
      })}
    </Box>
  )
}

// Botão de calendário: o input nativo de data fica invisível por cima do
// botão (abre o seletor do sistema no celular; no desktop usa showPicker)
function DatePickerButton({ value, onChange }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <HeaderIconButton aria-hidden tabIndex={-1}>
        <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />
      </HeaderIconButton>
      <Box
        component="input"
        type="date"
        aria-label="Escolher data"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.target.showPicker?.()
          } catch {
            // navegadores sem showPicker abrem o seletor pelo próprio input
          }
        }}
        sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
      />
    </Box>
  )
}

export default function AgendaScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)

  const today = todayKey()
  const dia = params.get('dia')
  const selectedDay = dia && DATE_KEY.test(dia) ? dia : today

  // O dia escolhido fica na URL: voltar de um atendimento mantém o dia
  function setSelectedDay(key) {
    setParams(key === today ? {} : { dia: key }, { replace: true })
  }

  // A faixa mostra 14 dias a partir de hoje; datas fora dela (passadas ou
  // distantes) reposicionam a faixa para começar no dia escolhido
  const lastStripKey = toDateKey(addDays(parseDateKey(today), STRIP_DAYS - 1))
  const stripStart = selectedDay >= today && selectedDay <= lastStripKey ? today : selectedDay
  const dayTabs = useMemo(() => afroditeApi.getAgendaDayTabs(STRIP_DAYS, stripStart), [stripStart])
  const stripEnd = dayTabs[dayTabs.length - 1].key

  const { data: appointments, error, loading, reload, setData } = useAsync(
    () => afroditeApi.getAppointmentsForDay(selectedDay),
    [selectedDay]
  )
  const counts = useAsync(() => afroditeApi.getAppointmentCountsByDay(stripStart, stripEnd), [stripStart, stripEnd])

  const count = appointments?.length
  const selectedDate = parseDateKey(selectedDay)
  const eyebrow =
    selectedDay === today
      ? `Hoje • ${formatLongDate(selectedDate, { day: '2-digit', month: 'long' })}`
      : formatLongDate(selectedDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  function handleCreated(appt) {
    toast(`${appt.patientName} agendada para ${formatDateKey(appt.dateKey)} às ${appt.time}`)
    counts.setData((prev) => ({ ...(prev || {}), [appt.dateKey]: ((prev || {})[appt.dateKey] || 0) + 1 }))
    if (appt.dateKey === selectedDay) {
      setData((prev) => [...(prev || []), appt].sort((a, b) => a.time.localeCompare(b.time)))
    } else {
      // Leva a agenda até o dia agendado, mesmo que esteja fora da faixa
      setSelectedDay(appt.dateKey)
    }
  }

  return (
    <AppScreen
      nav
      fab={{ label: 'Novo agendamento', icon: <AddRoundedIcon />, onClick: () => setCreating(true) }}
      header={
        <ScreenHeader
          large
          title="Agenda"
          eyebrow={eyebrow}
          actions={
            <>
              {selectedDay !== today && (
                <Button size="small" onClick={() => setSelectedDay(today)} sx={{ color: brand.wine }}>
                  Hoje
                </Button>
              )}
              <DatePickerButton value={selectedDay} onChange={setSelectedDay} />
              <NotificationBell />
            </>
          }
        >
          <DayStrip days={dayTabs} value={selectedDay} onChange={setSelectedDay} counts={counts.data} />
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
          action={
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)}>
              Agendar atendimento
            </Button>
          }
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

      <NewAppointmentSheet
        open={creating}
        onClose={() => setCreating(false)}
        defaultDate={selectedDay}
        onCreated={handleCreated}
      />
    </AppScreen>
  )
}
