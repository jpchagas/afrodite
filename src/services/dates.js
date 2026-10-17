// Utilitários de data usados pela camada de API. No Firestore as datas de
// calendário são guardadas como 'YYYY-MM-DD' (dateKey, sempre no fuso local)
// e instantes (criação de lead/mensagem) como Timestamp.

const pad = (n) => String(n).padStart(2, '0')

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function parseDateKey(key, time = '00:00') {
  const [y, m, d] = key.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

export function addDays(base, days) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

// 'YYYY-MM-DD' → 'DD/MM/YYYY' (ou '—' quando vazio)
export function formatDateKey(key) {
  if (!key) return '—'
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}

export function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// 'Hoje • 10:34' / 'Ontem • 16:30' / '05/05'
export function formatRelativeLabel(date) {
  if (!date) return ''
  const key = toDateKey(date)
  if (key === todayKey()) return `Hoje • ${formatTime(date)}`
  if (key === toDateKey(addDays(new Date(), -1))) return `Ontem • ${formatTime(date)}`
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

// Prefixo 'YYYY-MM' do mês com deslocamento (0 = mês atual, -1 = anterior)
export function monthPrefix(offset = 0) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthName(offset = 0) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString('pt-BR', {
    month: 'long'
  })
}

export function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`
}
