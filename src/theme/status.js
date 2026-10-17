import { brand } from './theme.js'

// Tons de status compartilhados por pacientes, leads, pagamentos,
// procedimentos e agendamentos.
export const TONES = {
  success: { bg: '#e8f3ec', fg: '#2f6b47', dot: '#3f9364' },
  warning: { bg: '#fbf1df', fg: '#865a14', dot: '#d29a35' },
  info: { bg: '#e9eff9', fg: '#35548f', dot: '#5b7fc4' },
  brand: { bg: brand.blush, fg: brand.wine, dot: brand.rose },
  brandStrong: { bg: '#efdde5', fg: brand.wineDark, dot: brand.wine },
  neutral: { bg: '#f0ecee', fg: '#6f6468', dot: '#a99ea3' },
  danger: { bg: '#fbe9ec', fg: '#9b2c3e', dot: '#c94b5e' }
}

const STATUS_TONE = {
  // Pacientes
  Ativa: 'success',
  'Em acompanhamento': 'brandStrong',
  'Pós procedimento': 'brand',
  'Em avaliação': 'warning',
  Inativa: 'neutral',
  // Leads
  Novo: 'info',
  'Em contato': 'warning',
  Qualificado: 'brand',
  Proposta: 'brandStrong',
  Convertido: 'success',
  Perdido: 'danger',
  // Financeiro / procedimentos / prescrições
  Pago: 'success',
  Pendente: 'warning',
  Atrasado: 'danger',
  Concluído: 'success',
  'Em andamento': 'warning',
  'Em dia': 'success',
  // Agenda
  Agendado: 'info',
  'Em atendimento': 'warning'
}

export function toneFor(status) {
  return TONES[STATUS_TONE[status] || 'neutral']
}
