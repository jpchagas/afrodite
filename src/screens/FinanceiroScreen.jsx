import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Button, Card, Chip, IconButton, Skeleton, Stack, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded'
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { brand, gradients, shadows } from '../theme/theme.js'
import { TONES } from '../theme/status.js'
import * as afroditeApi from '../services/afroditeApi.js'
import { formatDateKey, parseDateKey } from '../services/dates.js'
import { useAsync } from '../hooks/useAsync.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatLongDate } from '../utils/format.js'
import AppScreen from '../components/AppScreen.jsx'
import ScreenHeader, { HeaderIconButton } from '../components/ScreenHeader.jsx'
import PillTabs from '../components/PillTabs.jsx'
import ListCard from '../components/ListCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import FinanceChart, { SERIES } from '../components/FinanceChart.jsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews.jsx'
import TransactionFormSheet from './finance/TransactionFormSheet.jsx'
import TransactionDetailSheet from './finance/TransactionDetailSheet.jsx'
import CommissionRatesSheet from './finance/CommissionRatesSheet.jsx'

const TABS = [
  { value: 'resumo', label: 'Resumo' },
  { value: 'lancamentos', label: 'Lançamentos' },
  { value: 'comissoes', label: 'Comissões' }
]
const MONTH = /^\d{4}-\d{2}$/

function MonthSwitcher({ value, onChange }) {
  const isCurrent = value === afroditeApi.currentMonthKey()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <IconButton aria-label="Mês anterior" onClick={() => onChange(afroditeApi.addMonths(value, -1))} size="small">
        <ChevronLeftRoundedIcon />
      </IconButton>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="subtitle1">{afroditeApi.formatMonth(value)}</Typography>
        {!isCurrent && (
          <Button size="small" onClick={() => onChange(afroditeApi.currentMonthKey())} sx={{ minHeight: 22, py: 0, color: brand.wine }}>
            Voltar ao mês atual
          </Button>
        )}
      </Box>
      <IconButton aria-label="Próximo mês" onClick={() => onChange(afroditeApi.addMonths(value, 1))} size="small">
        <ChevronRightRoundedIcon />
      </IconButton>
    </Box>
  )
}

function TypeIcon({ type }) {
  const income = type === 'receita'
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '13px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: income ? '#f6e7ee' : '#f8eedc',
        color: income ? SERIES.income.color : '#8a6216',
        '& svg': { fontSize: 19 }
      }}
    >
      {income ? <NorthEastRoundedIcon /> : <SouthWestRoundedIcon />}
    </Box>
  )
}

function Amount({ t }) {
  const income = t.type === 'receita'
  return (
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums', color: income ? TONES.success.fg : 'text.primary' }}>
        {income ? '+' : '−'} {formatCurrency(t.amount)}
      </Typography>
      {t.displayStatus !== 'Pago' && <StatusChip status={t.displayStatus} sx={{ mt: 0.5 }} />}
    </Box>
  )
}

function TransactionRow({ t, index, onOpen, showDate }) {
  return (
    <ListCard
      index={index}
      onClick={() => onOpen(t)}
      chevron={false}
      leading={<TypeIcon type={t.type} />}
      title={t.description}
      subtitle={[showDate && formatDateKey(t.effectiveDate), t.category, t.patientName, t.method].filter(Boolean).join(' • ')}
      trailing={<Amount t={t} />}
    />
  )
}

function dayLabel(key) {
  return formatLongDate(parseDateKey(key), { weekday: 'short', day: '2-digit', month: 'short' })
}

// ---------- Resumo ----------

function ResumoTab({ month, version, onSelectMonth, onOpen, onShowPending }) {
  const { data: o, error, reload } = useAsync(() => afroditeApi.getFinanceOverview(month), [month, version])
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!o) {
    return (
      <Stack spacing={1.25}>
        <Skeleton variant="rounded" height={136} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <Skeleton variant="rounded" height={110} />
          <Skeleton variant="rounded" height={110} />
        </Box>
        <Skeleton variant="rounded" height={250} />
      </Stack>
    )
  }
  const maxCategory = o.expenseByCategory[0]?.total || 1

  return (
    <>
      <Card sx={{ p: 2.25, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
        <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
          Saldo do mês
        </Typography>
        <Typography sx={{ fontSize: '2.2rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          {o.balance < 0 ? '− ' : ''}
          {formatCurrency(Math.abs(o.balance), { cents: false })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1.25, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Receitas <b>{formatCurrency(o.income, { cents: false })}</b>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Despesas <b>{formatCurrency(o.expense, { cents: false })}</b>
          </Typography>
        </Box>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.25 }}>
        <MetricCard
          label="A receber"
          value={formatCurrency(o.receivable.total, { cents: false })}
          hint={
            o.receivable.overdueCount
              ? `${o.receivable.overdueCount} em atraso • ${formatCurrency(o.receivable.overdueTotal, { cents: false })}`
              : `${o.receivable.count} ${o.receivable.count === 1 ? 'pendente' : 'pendentes'}`
          }
          hintColor={o.receivable.overdueCount ? TONES.danger.fg : undefined}
          onClick={onShowPending}
        />
        <MetricCard
          label="A pagar"
          value={formatCurrency(o.payable.total, { cents: false })}
          hint={
            o.payable.overdueCount
              ? `${o.payable.overdueCount} em atraso`
              : `${o.payable.count} ${o.payable.count === 1 ? 'conta' : 'contas'}`
          }
          hintColor={o.payable.overdueCount ? TONES.danger.fg : undefined}
          onClick={onShowPending}
        />
      </Box>

      <SectionTitle>Receitas x despesas</SectionTitle>
      <Card sx={{ p: 2 }}>
        <FinanceChart series={o.series} selected={month} onSelect={onSelectMonth} />
      </Card>

      {o.overdueReceivables.length > 0 && (
        <>
          <SectionTitle>Recebimentos em atraso</SectionTitle>
          <Stack spacing={1.25}>
            {o.overdueReceivables.map((t, idx) => (
              <TransactionRow key={t.id} t={t} index={idx} onOpen={onOpen} showDate />
            ))}
          </Stack>
        </>
      )}

      {o.expenseByCategory.length > 0 && (
        <>
          <SectionTitle>Despesas por categoria</SectionTitle>
          <Card sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              {o.expenseByCategory.slice(0, 6).map((c) => (
                <Box key={c.category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{c.category}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(c.total, { cents: false })}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#f8eedc' }}>
                    <Box sx={{ height: '100%', width: `${(c.total / maxCategory) * 100}%`, borderRadius: 3, bgcolor: SERIES.expense.color }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Card>
        </>
      )}
    </>
  )
}

// ---------- Lançamentos ----------

const FILTERS = [
  { value: 'Todos', test: () => true },
  { value: 'Receitas', test: (t) => t.type === 'receita' },
  { value: 'Despesas', test: (t) => t.type === 'despesa' },
  { value: 'Pendentes', test: (t) => t.status === 'Pendente' }
]

function LancamentosTab({ items, filter, onFilter, onOpen }) {
  const filtered = items.filter(FILTERS.find((f) => f.value === filter).test)
  const paidIn = items.filter((t) => t.type === 'receita' && t.status === 'Pago').reduce((s, t) => s + t.amount, 0)
  const paidOut = items.filter((t) => t.type === 'despesa' && t.status === 'Pago').reduce((s, t) => s + t.amount, 0)

  const groups = []
  for (const t of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.key === t.effectiveDate) last.items.push(t)
    else groups.push({ key: t.effectiveDate, items: [t] })
  }

  return (
    <>
      <PillTabs
        value={filter}
        onChange={onFilter}
        items={FILTERS.map((f) => ({ value: f.value, label: f.value, count: items.filter(f.test).length }))}
        sx={{ mb: 1.5 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Recebido <b style={{ color: TONES.success.fg }}>{formatCurrency(paidIn, { cents: false })}</b> • Pago{' '}
        <b>{formatCurrency(paidOut, { cents: false })}</b>
      </Typography>
      {filtered.length === 0 && (
        <EmptyState icon={<ReceiptLongRoundedIcon />} title="Nenhum lançamento" description="Use o botão + para lançar receitas e despesas." />
      )}
      {groups.map((g) => (
        <Box key={g.key} sx={{ mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {dayLabel(g.key)}
          </Typography>
          <Stack spacing={1.25}>
            {g.items.map((t, idx) => (
              <TransactionRow key={t.id} t={t} index={idx} onOpen={onOpen} />
            ))}
          </Stack>
        </Box>
      ))}
    </>
  )
}

// ---------- Comissões ----------

function ComissoesTab({ month, version }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const { data, error, loading, reload } = useAsync(() => afroditeApi.getCommissions(month), [month, version])

  return (
    <>
      {loading && <ListSkeleton count={3} height={72} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <Card sx={{ p: 2.25, mb: 2, background: gradients.wine, color: '#fff', border: 'none', boxShadow: shadows.raised }}>
            <Typography variant="overline" sx={{ color: '#e9cf9f' }}>
              Comissões do mês
            </Typography>
            <Typography sx={{ fontSize: '1.9rem', fontWeight: 650, letterSpacing: '-0.03em' }}>{formatCurrency(data.total)}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Calculadas sobre as receitas recebidas
            </Typography>
          </Card>
          {data.rows.length === 0 && (
            <EmptyState icon={<PercentRoundedIcon />} title="Sem comissões neste mês" description="Nenhuma receita recebida em categorias com comissão." />
          )}
          <Stack spacing={1.25}>
            {data.rows.map((r, idx) => (
              <ListCard
                key={r.category}
                index={idx}
                leading={
                  <Box sx={{ width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center', bgcolor: brand.blush, color: brand.wine }}>
                    <PercentRoundedIcon sx={{ fontSize: 19 }} />
                  </Box>
                }
                title={r.category}
                subtitle={`${r.count} ${r.count === 1 ? 'receita' : 'receitas'} • base ${formatCurrency(r.base, { cents: false })} • ${r.pct}%`}
                trailing={
                  <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(r.value)}
                  </Typography>
                }
              />
            ))}
          </Stack>
          <Button fullWidth size="large" variant="outlined" startIcon={<TuneRoundedIcon />} onClick={() => setEditing(true)} sx={{ mt: 2.5 }}>
            Editar percentuais
          </Button>
          <CommissionRatesSheet
            open={editing}
            onClose={() => setEditing(false)}
            rates={data.rates}
            onSaved={() => {
              reload()
              toast('Percentuais atualizados')
            }}
          />
        </>
      )}
    </>
  )
}

// ---------- Tela ----------

function downloadCsv(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function FinanceiroScreen() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState('Todos')
  const [form, setForm] = useState(null) // { transaction? } aberto
  const [selected, setSelected] = useState(null)

  const month = MONTH.test(params.get('mes') || '') ? params.get('mes') : afroditeApi.currentMonthKey()
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba') : 'resumo'
  const patientId = params.get('paciente')

  const update = (changes) => {
    const next = { mes: month, aba: tab, ...changes }
    setParams(
      Object.fromEntries(
        Object.entries(next).filter(([k, v]) => v && !(k === 'mes' && v === afroditeApi.currentMonthKey()) && !(k === 'aba' && v === 'resumo'))
      ),
      { replace: true }
    )
  }
  const refresh = () => setVersion((v) => v + 1)

  const monthItems = useAsync(
    () => (!patientId && tab === 'lancamentos' ? afroditeApi.getMonthTransactions(month) : null),
    [month, tab, version, patientId]
  )
  const patientData = useAsync(() => (patientId ? afroditeApi.getPatientTransactions(patientId) : null), [patientId, version])

  async function exportCsv() {
    try {
      const items = patientId ? patientData.data?.items || [] : await afroditeApi.getMonthTransactions(month)
      if (!items.length) {
        toast('Nenhum lançamento para exportar', { severity: 'info' })
        return
      }
      downloadCsv(patientId ? `financeiro-paciente.csv` : `financeiro-${month}.csv`, afroditeApi.transactionsToCsv(items))
    } catch {
      toast('Não foi possível exportar', { severity: 'error' })
    }
  }

  function handleChanged(updated, action) {
    setSelected(updated) // null quando excluído (fecha o detalhe)
    refresh()
    toast(action === 'pago' ? 'Pagamento registrado' : action === 'pendente' ? 'Voltou para pendente' : 'Lançamento excluído')
  }

  const patientName = patientData.data?.items[0]?.patientName

  return (
    <AppScreen
      nav
      fab={{ label: 'Novo lançamento', icon: <AddRoundedIcon />, onClick: () => setForm({}) }}
      header={
        <ScreenHeader
          large
          back
          title="Financeiro"
          actions={
            <HeaderIconButton aria-label="Exportar CSV" onClick={exportCsv}>
              <FileDownloadRoundedIcon sx={{ fontSize: 20 }} />
            </HeaderIconButton>
          }
        >
          {patientId ? (
            <Chip
              label={`Paciente: ${patientName || '…'}`}
              onDelete={() => setParams({}, { replace: true })}
              sx={{ bgcolor: brand.blush, color: brand.wine }}
            />
          ) : (
            <>
              <MonthSwitcher value={month} onChange={(m) => update({ mes: m })} />
              <PillTabs value={tab} onChange={(t) => update({ aba: t })} items={TABS} />
            </>
          )}
        </ScreenHeader>
      }
    >
      {patientId ? (
        <>
          {patientData.loading && <ListSkeleton count={4} height={72} />}
          {patientData.error && <ErrorState error={patientData.error} onRetry={patientData.reload} />}
          {patientData.data && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mb: 2 }}>
                <MetricCard label="Pago" value={formatCurrency(patientData.data.paid, { cents: false })} />
                <MetricCard
                  label="Em aberto"
                  value={formatCurrency(patientData.data.pending, { cents: false })}
                  hint={patientData.data.overdue ? `${formatCurrency(patientData.data.overdue, { cents: false })} em atraso` : undefined}
                  hintColor={TONES.danger.fg}
                />
              </Box>
              {patientData.data.items.length === 0 && (
                <EmptyState icon={<ReceiptLongRoundedIcon />} title="Sem lançamentos" description="Nenhuma cobrança registrada para esta paciente." />
              )}
              <Stack spacing={1.25}>
                {patientData.data.items.map((t, idx) => (
                  <TransactionRow key={t.id} t={t} index={idx} onOpen={setSelected} showDate />
                ))}
              </Stack>
            </>
          )}
        </>
      ) : (
        <>
          {tab === 'resumo' && (
            <ResumoTab
              month={month}
              version={version}
              onSelectMonth={(m) => update({ mes: m })}
              onOpen={setSelected}
              onShowPending={() => {
                setFilter('Pendentes')
                update({ aba: 'lancamentos' })
              }}
            />
          )}
          {tab === 'lancamentos' && (
            <>
              {monthItems.loading && <ListSkeleton count={5} height={72} />}
              {monthItems.error && <ErrorState error={monthItems.error} onRetry={monthItems.reload} />}
              {monthItems.data && <LancamentosTab items={monthItems.data} filter={filter} onFilter={setFilter} onOpen={setSelected} />}
            </>
          )}
          {tab === 'comissoes' && <ComissoesTab month={month} version={version} />}
        </>
      )}

      <TransactionFormSheet
        open={!!form}
        onClose={() => setForm(null)}
        transaction={form?.transaction}
        defaults={form?.defaults}
        onSaved={(result) => {
          refresh()
          if (Array.isArray(result)) {
            toast(result.length > 1 ? `${result.length} parcelas lançadas` : 'Lançamento registrado')
            // Leva ao mês do lançamento para que ele apareça na lista
            const m = result[0].monthKey
            if (!patientId && m !== month) update({ mes: m, aba: 'lancamentos' })
          } else {
            toast('Lançamento atualizado')
          }
        }}
      />
      <TransactionDetailSheet
        transaction={selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
        onEdit={(t) => {
          setSelected(null)
          setForm({ transaction: t })
        }}
      />
    </AppScreen>
  )
}
