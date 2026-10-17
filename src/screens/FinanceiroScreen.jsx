import React, { useState } from 'react'
import { Box, Card, Skeleton, Stack, Typography } from '@mui/material'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import PixRoundedIcon from '@mui/icons-material/PixRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import { brand, gradients, shadows } from '../theme/theme.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAsync } from '../hooks/useAsync.js'
import { capitalize, formatCurrency } from '../utils/format.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import PillTabs from '../components/PillTabs.jsx'
import ListCard from '../components/ListCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews.jsx'

const TABS = [
  { value: 'resumo', label: 'Resumo' },
  { value: 'pagamentos', label: 'Pagamentos' },
  { value: 'comissoes', label: 'Comissões' }
]

const METHOD_ICON = {
  Pix: <PixRoundedIcon />,
  'Cartão de crédito': <CreditCardRoundedIcon />,
  Boleto: <DescriptionRoundedIcon />
}

function IconTile({ children }) {
  return (
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine, '& svg': { fontSize: 20 } }}>
      {children}
    </Box>
  )
}

function Amount({ value, status }) {
  return (
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(value)}
      </Typography>
      {status && <StatusChip status={status} sx={{ mt: 0.5 }} />}
    </Box>
  )
}

function AsyncList({ state, empty, render, skeletonCount = 3 }) {
  if (state.loading) return <ListSkeleton count={skeletonCount} height={72} />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  if (state.data.length === 0) return empty
  return <Stack spacing={1.25}>{state.data.map(render)}</Stack>
}

function ResumoTab() {
  const summary = useAsync(() => afroditeApi.getFinanceSummary(), [])
  const launches = useAsync(() => afroditeApi.getFinanceLaunches(), [])
  const s = summary.data

  return (
    <>
      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          {s ? (
            <Card sx={{ p: 2, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
              <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
                Faturado
              </Typography>
              <Typography sx={{ fontSize: '1.35rem', fontWeight: 650, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(s.totalFaturado, { cents: false })}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {capitalize(s.monthLabel)}
              </Typography>
            </Card>
          ) : (
            <Skeleton variant="rounded" height={112} />
          )}
          <MetricCard
            loading={!s}
            label="A receber"
            value={s && formatCurrency(s.aReceber, { cents: false })}
            hint={s && `${s.aReceberClientes} ${s.aReceberClientes === 1 ? 'cliente' : 'clientes'}`}
            hintColor="#865a14"
          />
        </Box>
      )}

      <SectionTitle>Últimos recebimentos</SectionTitle>
      <AsyncList
        state={launches}
        empty={<EmptyState icon={<ReceiptLongRoundedIcon />} title="Sem lançamentos" description="Nenhum pagamento recebido ainda." />}
        render={(item, idx) => (
          <ListCard
            key={item.id}
            index={idx}
            leading={<IconTile><ReceiptLongRoundedIcon /></IconTile>}
            title={item.name}
            subtitle={`${item.patientName} • ${item.date}`}
            trailing={<Amount value={item.amount} />}
          />
        )}
      />
    </>
  )
}

function PagamentosTab() {
  const payments = useAsync(() => afroditeApi.getFinancePayments(), [])
  return (
    <AsyncList
      state={payments}
      skeletonCount={5}
      empty={<EmptyState icon={<CreditCardRoundedIcon />} title="Sem pagamentos" />}
      render={(p, idx) => (
        <ListCard
          key={p.id}
          index={idx}
          leading={<IconTile>{METHOD_ICON[p.method] || <CreditCardRoundedIcon />}</IconTile>}
          title={p.patientName}
          subtitle={`${p.method}${p.date !== '—' ? ` • ${p.date}` : ''}`}
          trailing={<Amount value={p.amount} status={p.status} />}
        />
      )}
    />
  )
}

function ComissoesTab() {
  const commissions = useAsync(() => afroditeApi.getFinanceCommissions(), [])
  const total = commissions.data?.reduce((sum, c) => sum + c.value, 0) || 0

  return (
    <>
      {commissions.data ? (
        <Card sx={{ p: 2.25, mb: 2, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
          <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
            Comissões no mês
          </Typography>
          <Typography sx={{ fontSize: '1.9rem', fontWeight: 650, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(total)}
          </Typography>
        </Card>
      ) : (
        commissions.loading && <Skeleton variant="rounded" height={96} sx={{ mb: 2 }} />
      )}
      <AsyncList
        state={commissions}
        empty={<EmptyState icon={<PercentRoundedIcon />} title="Sem comissões neste mês" />}
        render={(c, idx) => (
          <ListCard
            key={c.id}
            index={idx}
            leading={<IconTile><PercentRoundedIcon /></IconTile>}
            title={c.procedure}
            subtitle={`Base ${formatCurrency(c.base)} • ${c.pct}%`}
            trailing={
              <Typography variant="subtitle2" sx={{ color: brand.wine, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(c.value)}
              </Typography>
            }
          />
        )}
      />
    </>
  )
}

export default function FinanceiroScreen() {
  const [tab, setTab] = useState('resumo')

  return (
    <AppScreen
      nav
      header={
        <ScreenHeader large back title="Financeiro">
          <PillTabs value={tab} onChange={setTab} items={TABS} />
        </ScreenHeader>
      }
    >
      {tab === 'resumo' && <ResumoTab />}
      {tab === 'pagamentos' && <PagamentosTab />}
      {tab === 'comissoes' && <ComissoesTab />}
    </AppScreen>
  )
}
