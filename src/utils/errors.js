// Converte erros do Firebase/rede em mensagens amigáveis para a tela
const MESSAGES = {
  'permission-denied': 'Sua sessão expirou ou você não tem acesso a estes dados. Entre novamente.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  unavailable: 'Sem conexão com o servidor. Verifique sua internet.',
  'deadline-exceeded': 'O servidor demorou para responder. Tente novamente.',
  'not-found': 'Registro não encontrado.'
}

export function friendlyMessage(err, fallback = 'Algo deu errado. Tente novamente.') {
  if (!err) return fallback
  if (err.code && MESSAGES[err.code]) return MESSAGES[err.code]
  // Erros sem `code` vêm da própria camada de API e já estão em português
  return (!err.code && err.message) || fallback
}
