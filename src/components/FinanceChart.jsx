import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, ButtonBase, Typography } from '@mui/material'
import { brand } from '../theme/theme.js'
import { formatCurrency } from '../utils/format.js'

// Cores validadas (validate_palette.js, superfície #fff): todas as checagens passam
export const SERIES = {
  income: { label: 'Receitas', color: '#9c4569' },
  expense: { label: 'Despesas', color: '#c08a2b' }
}

const HEIGHT = 168
const PAD_TOP = 8
const PAD_BOTTOM = 24
const AXIS_W = 44
const BAR_MAX = 20
const GAP = 2

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function niceMax(value) {
  if (value <= 0) return 1000
  const pow = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= value / 1) * pow
  return step
}

// Coluna com topo arredondado (4px) e base reta
function columnPath(x, y, w, h) {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}

/**
 * Receitas x despesas pagas por mês (colunas agrupadas, um eixo).
 * `series`: [{ monthKey, label, income, expense }]; tocar um mês o seleciona.
 */
export default function FinanceChart({ series, selected, onSelect }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(320)
  const [showTable, setShowTable] = useState(false)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = niceMax(Math.max(...series.flatMap((s) => [s.income, s.expense])))
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const plotW = width - AXIS_W
  const slot = plotW / series.length
  const barW = Math.min(BAR_MAX, (slot * 0.6 - GAP) / 2)
  const y = (v) => PAD_TOP + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]

  const focusKey = hover ?? selected
  const focus = series.find((s) => s.monthKey === focusKey) || series[series.length - 1]

  return (
    <Box>
      {/* Legenda + valores do mês em foco (rótulo direto seletivo) */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
          {focus.label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.75 }}>
          {Object.entries(SERIES).map(([key, s]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: s.color }} />
              <Typography variant="caption" color="text.secondary">
                {s.label}{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  {formatCurrency(focus[key], { cents: false })}
                </Box>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {showTable ? (
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', '& td, & th': { py: 0.75, borderBottom: `1px solid ${brand.line}` }, '& td:not(:first-of-type), & th:not(:first-of-type)': { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }}>
          <thead>
            <tr>
              <Box component="th" sx={{ textAlign: 'left', color: 'text.secondary', fontWeight: 600 }}>Mês</Box>
              <Box component="th" sx={{ color: 'text.secondary', fontWeight: 600 }}>Receitas</Box>
              <Box component="th" sx={{ color: 'text.secondary', fontWeight: 600 }}>Despesas</Box>
              <Box component="th" sx={{ color: 'text.secondary', fontWeight: 600 }}>Saldo</Box>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.monthKey}>
                <Box component="td" sx={{ textTransform: 'capitalize', fontWeight: s.monthKey === selected ? 700 : 400 }}>{s.label}</Box>
                <td>{formatCurrency(s.income, { cents: false })}</td>
                <td>{formatCurrency(s.expense, { cents: false })}</td>
                <Box component="td" sx={{ fontWeight: 650 }}>{formatCurrency(s.income - s.expense, { cents: false })}</Box>
              </tr>
            ))}
          </tbody>
        </Box>
      ) : (
        <Box ref={ref} sx={{ position: 'relative' }}>
          <svg width={width} height={HEIGHT} role="img" aria-label="Receitas e despesas pagas nos últimos 6 meses" style={{ display: 'block' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={AXIS_W} x2={width} y1={y(t)} y2={y(t)} stroke="rgba(74,39,54,0.10)" strokeWidth="1" />
                <text x={AXIS_W - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={brand.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t === 0 ? '0' : compact.format(t)}
                </text>
              </g>
            ))}
            {series.map((s, i) => {
              const cx = AXIS_W + slot * i + slot / 2
              const isSel = s.monthKey === selected
              return (
                <g key={s.monthKey}>
                  {isSel && <rect x={cx - slot / 2 + 4} y={PAD_TOP - 4} width={slot - 8} height={plotH + 8} rx="10" fill={brand.blush} />}
                  <path d={columnPath(cx - barW - GAP / 2, y(s.income), barW, y(0) - y(s.income))} fill={SERIES.income.color} />
                  <path d={columnPath(cx + GAP / 2, y(s.expense), barW, y(0) - y(s.expense))} fill={SERIES.expense.color} />
                  <text x={cx} y={HEIGHT - 6} textAnchor="middle" fontSize="11" fontWeight={isSel ? 700 : 500} fill={isSel ? brand.ink : brand.muted} style={{ textTransform: 'capitalize' }}>
                    {s.label}
                  </text>
                </g>
              )
            })}
          </svg>
          {/* Alvos de toque cobrem a coluna inteira de cada mês */}
          <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: AXIS_W, right: 0, display: 'flex' }}>
            {series.map((s) => (
              <ButtonBase
                key={s.monthKey}
                aria-label={`${s.label}: receitas ${formatCurrency(s.income, { cents: false })}, despesas ${formatCurrency(s.expense, { cents: false })}`}
                onClick={() => onSelect?.(s.monthKey)}
                onMouseEnter={() => setHover(s.monthKey)}
                onMouseLeave={() => setHover(null)}
                sx={{ flex: 1, borderRadius: '10px' }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button size="small" onClick={() => setShowTable((v) => !v)} sx={{ color: brand.wine, minHeight: 28 }}>
          {showTable ? 'Ver gráfico' : 'Ver tabela'}
        </Button>
      </Box>
    </Box>
  )
}
