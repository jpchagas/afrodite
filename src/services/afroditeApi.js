// Camada de acesso ao sistema Afrodite.
// Por enquanto simula (mock) a resposta da API. Quando os endpoints reais
// existirem, troque a implementação de `login` por uma chamada fetch/axios,
// mantendo a mesma assinatura para não precisar mexer nas telas.

const MOCK_DELAY = 700

const MOCK_USERS = [
  { email: 'admin@afrodite.com', password: '123456', name: 'Equipe Afrodite' }
]

export function login({ email, password }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      )
      if (user) {
        resolve({ token: 'mock-token-afrodite', user: { email: user.email, name: user.name } })
      } else {
        reject(new Error('E-mail ou senha inválidos'))
      }
    }, MOCK_DELAY)
  })
}

export function logout() {
  return Promise.resolve()
}
