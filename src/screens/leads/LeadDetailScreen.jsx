import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Card, Button, ButtonBase, Stack, Skeleton, LinearProgress } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import AddCommentRoundedIcon from '@mui/icons-material/AddCommentRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import { brand, gradients, shadows } from '../../theme/theme.js'
import { TONES } from '../../theme/status.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { formatDateKey, todayKey } from '../../services/dates.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useToast } from '../../context/ToastContext.jsx'
import { friendlyMessage } from '../../utils/errors.js'
import { formatCurrency } from '../../utils/format.js'
import AppScreen from '../../components/AppScreen.jsx'
import ScreenHeader, { HeaderIconButton } from '../../components/ScreenHeader.jsx'
import SectionTabs from '../../components/SectionTabs.jsx'
import PersonAvatar from '../../components/PersonAvatar.jsx'
import StatusChip from '../../components/StatusChip.jsx'
import FollowUpChip from '../../components/FollowUpChip.jsx'
import InfoField from '../../components/InfoField.jsx'
import ActivityTimeline from '../../components/ActivityTimeline.jsx'
import LogContactSheet from '../../components/LogContactSheet.jsx'
import NativeDateButton from '../../components/NativeDateButton.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/StateViews.jsx'
import EditLeadSheet from './EditLeadSheet.jsx'
import MoveStageSheet from './MoveStageSheet.jsx'
import ConvertLeadSheet from './ConvertLeadSheet.jsx'

const TABS = ['Resumo', 'Histórico', 'Proposta']

function QuickAction({ icon, label, onClick, href, color = brand.wine, bg = brand.blush }) {
  return (
    <ButtonBase
      component={href ? 'a' : 'button'}
      href={href}
      onClick={onClick}
      sx={{ flex: 1, flexDirection: 'column', gap: 0.75, py: 1, borderRadius: '16px' }}
    >
      <Box sx={{ width: 46, height: 46, borderRadius: '15px', display: 'grid', placeItems: 'center', bgcolor: bg, color, '& svg': { fontSize: 22 } }}>
        {icon}
      </Box>
      <Typography variant="caption" fontWeight={600}>
        {label}
      </Typography>
    </ButtonBase>
  )
}

export default function LeadDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState(0)
  const [sheet, setSheet] = useState(null) // 'edit' | 'move' | 'convert' | 'contact'
  const { data: lead, error, loading, reload, setData } = useAsync(() => afroditeApi.getLead(id), [id])
  const activities = useAsync(() => afroditeApi.getActivities('leads', id), [id])

  const refreshAll = () => {
    reload()
    activities.reload()
  }

  async function changeFollowUp(dateKey) {
    try {
      setData(await afroditeApi.setLeadFollowUp(id, dateKey))
      activities.reload()
      toast(dateKey ? `Próximo contato: ${formatDateKey(dateKey)}` : 'Próximo contato removido')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível atualizar'), { severity: 'error' })
    }
  }

  async function reopen() {
    try {
      setData(await afroditeApi.updateLeadStatus(id, 'Em contato'))
      activities.reload()
      toast('Lead reaberto')
    } catch (err) {
      toast(friendlyMessage(err, 'Não foi possível reabrir'), { severity: 'error' })
    }
  }

  const phoneDigits = lead?.phone?.replace(/\D/g, '')
  const open = lead && afroditeApi.isOpenLead(lead)

  return (
    <AppScreen
      header={
        <ScreenHeader
          back
          title="Lead"
          actions={
            lead && (
              <HeaderIconButton aria-label="Editar lead" onClick={() => setSheet('edit')}>
                <EditRoundedIcon sx={{ fontSize: 19 }} />
              </HeaderIconButton>
            )
          }
        >
          {!error && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {lead ? <PersonAvatar name={lead.name} size={60} /> : <Skeleton variant="circular" width={60} height={60} />}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {lead ? (
                  <>
                    <Typography variant="h5" component="h2" noWrap>
                      {lead.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {[lead.phone, lead.source].filter(Boolean).join(' • ')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                      <StatusChip status={lead.status} />
                      <FollowUpChip lead={lead} />
                    </Box>
                  </>
                ) : (
                  <>
                    <Skeleton width="60%" height={30} />
                    <Skeleton width="40%" />
                  </>
                )}
              </Box>
            </Box>
          )}
          <Box sx={{ mt: 1.5 }}>
            <SectionTabs value={tab} onChange={setTab} items={TABS} />
          </Box>
        </ScreenHeader>
      }
    >
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <Stack spacing={1.25}>
          <Skeleton variant="rounded" height={86} />
          <Skeleton variant="rounded" height={110} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      )}

      {lead && tab === 0 && (
        <Stack spacing={1.25}>
          <Card sx={{ display: 'flex', px: 1, py: 0.5 }}>
            <QuickAction
              icon={<WhatsAppIcon />}
              label="WhatsApp"
              onClick={() => navigate(`/leads/${lead.id}/whatsapp`)}
              color="#1f8a4c"
              bg="#e6f5ec"
            />
            <QuickAction icon={<PhoneRoundedIcon />} label="Ligar" href={phoneDigits ? `tel:${phoneDigits}` : undefined} />
            <QuickAction icon={<AddCommentRoundedIcon />} label="Registrar" onClick={() => setSheet('contact')} />
            <QuickAction icon={<SwapHorizRoundedIcon />} label="Mover" onClick={() => setSheet('move')} />
          </Card>

          {open && (
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: '13px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: lead.followUpState === 'overdue' ? TONES.danger.bg : lead.followUpState === 'today' ? TONES.warning.bg : brand.blush,
                  color: lead.followUpState === 'overdue' ? TONES.danger.fg : lead.followUpState === 'today' ? TONES.warning.fg : brand.wine
                }}
              >
                <ScheduleRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  Próximo contato
                </Typography>
                <Typography variant="subtitle2">
                  {lead.nextFollowUp ? `${formatDateKey(lead.nextFollowUp)} • ${lead.followUpLabel}` : 'Sem data definida'}
                </Typography>
              </Box>
              <NativeDateButton value={lead.nextFollowUp} min={todayKey()} onChange={changeFollowUp} label="Alterar próximo contato">
                <Button size="small" variant="outlined" tabIndex={-1}>
                  {lead.nextFollowUp ? 'Alterar' : 'Definir'}
                </Button>
              </NativeDateButton>
            </Card>
          )}

          {open && (
            <Card sx={{ p: 2.25, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
              <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
                Fechou?
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 1.5 }}>
                Converta em paciente para abrir a ficha clínica com todo o histórico deste lead.
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<HowToRegRoundedIcon />}
                onClick={() => setSheet('convert')}
                sx={{ bgcolor: '#fff', color: brand.wineDark, backgroundImage: 'none', '&:hover': { bgcolor: brand.cream, backgroundImage: 'none' } }}
              >
                Converter em paciente
              </Button>
            </Card>
          )}

          {lead.patientId && (
            <Card>
              <ButtonBase onClick={() => navigate(`/pacientes/${lead.patientId}`)} sx={{ width: '100%', p: 2, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: TONES.success.bg, color: TONES.success.fg }}>
                  <HowToRegRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">Convertido em paciente</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Abrir ficha da paciente
                  </Typography>
                </Box>
                <ChevronRightRoundedIcon sx={{ color: brand.roseLight }} />
              </ButtonBase>
            </Card>
          )}

          {lead.status === 'Perdido' && (
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  Motivo da perda
                </Typography>
                <Typography variant="subtitle2">{lead.lostReason || 'Não informado'}</Typography>
              </Box>
              <Button size="small" variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={reopen}>
                Reabrir
              </Button>
            </Card>
          )}

          <Card sx={{ p: 2.25 }}>
            <Stack spacing={2}>
              <InfoField label="Interesse" value={lead.interest} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <InfoField label="Origem" value={lead.source} />
                <InfoField label="Primeiro contato" value={lead.createdAtLabel} />
              </Box>
              {lead.email && <InfoField label="E-mail" value={lead.email} />}
              {lead.notes && <InfoField label="Notas" value={lead.notes} />}
            </Stack>
          </Card>
        </Stack>
      )}

      {lead && tab === 1 && (
        <>
          <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
            <Button fullWidth variant="contained" startIcon={<AddCommentRoundedIcon />} onClick={() => setSheet('contact')}>
              Registrar contato
            </Button>
            <Button fullWidth variant="outlined" startIcon={<WhatsAppIcon />} onClick={() => navigate(`/leads/${lead.id}/whatsapp`)}>
              Conversa
            </Button>
          </Stack>
          {activities.loading && <ListSkeleton count={4} height={56} />}
          {activities.error && <ErrorState error={activities.error} onRetry={activities.reload} />}
          {activities.data && activities.data.length === 0 && (
            <EmptyState icon={<HistoryRoundedIcon />} title="Sem histórico" description="Registre ligações, visitas e notas para acompanhar o relacionamento." />
          )}
          {activities.data && activities.data.length > 0 && <ActivityTimeline items={activities.data} />}
        </>
      )}

      {lead && tab === 2 && <PropostaTab lead={lead} onEdit={() => setSheet('edit')} />}

      <EditLeadSheet
        open={sheet === 'edit'}
        onClose={() => setSheet(null)}
        lead={lead}
        onSaved={(updated) => {
          setData(updated)
          activities.reload()
          toast('Lead atualizado')
        }}
      />
      <MoveStageSheet
        open={sheet === 'move'}
        onClose={() => setSheet(null)}
        lead={lead}
        onConvert={() => setSheet('convert')}
        onMoved={(updated, status) => {
          setData(updated)
          activities.reload()
          toast(status === 'Perdido' ? 'Lead marcado como perdido' : `Lead movido para "${status}"`)
        }}
      />
      <ConvertLeadSheet
        open={sheet === 'convert'}
        onClose={() => setSheet(null)}
        lead={lead}
        onConverted={(patientId) => {
          toast('Paciente criada a partir do lead')
          navigate(`/pacientes/${patientId}`)
        }}
      />
      <LogContactSheet
        open={sheet === 'contact'}
        onClose={() => setSheet(null)}
        target="leads"
        id={id}
        currentFollowUp={lead?.nextFollowUp}
        onSaved={() => {
          refreshAll()
          toast('Contato registrado')
        }}
      />
    </AppScreen>
  )
}

function PropostaTab({ lead, onEdit }) {
  const paidPct = lead.proposalValue ? Math.min(100, Math.round((lead.downPayment / lead.proposalValue) * 100)) : 0
  return (
    <Stack spacing={1.25}>
      <Card sx={{ p: 2.25 }}>
        <Typography variant="overline" color="text.secondary">
          Valor da proposta
        </Typography>
        <Typography sx={{ fontSize: '1.9rem', fontWeight: 650, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(lead.proposalValue)}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={paidPct}
          sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: brand.blush, '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundImage: `linear-gradient(90deg, ${brand.wine}, ${brand.rose})` } }}
        />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
          {paidPct}% pago como sinal
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Sinal pago
            </Typography>
            <Typography variant="subtitle1" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(lead.downPayment)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Saldo restante
            </Typography>
            <Typography variant="subtitle1" sx={{ color: brand.wine, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(Math.max(lead.proposalValue - lead.downPayment, 0))}
            </Typography>
          </Box>
        </Box>
      </Card>
      <Button size="large" variant="outlined" startIcon={<EditRoundedIcon />} onClick={onEdit}>
        Editar valores
      </Button>
    </Stack>
  )
}
