import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as afroditeApi from '../services/afroditeApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = ainda restaurando a sessão do Firebase; null = deslogado
  const [user, setUser] = useState(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => afroditeApi.onAuthChange(setUser), [])

  const signIn = useCallback(async (email, password, { remember = false } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const result = await afroditeApi.login({ email, password, remember })
      setUser(result.user)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Erros ficam com a tela de cadastro (não usam o `error` do login)
  const signUp = useCallback(async ({ name, email, password }) => {
    const result = await afroditeApi.register({ name, email, password })
    setUser(result.user)
    return result
  }, [])

  const signOut = useCallback(async () => {
    await afroditeApi.logout()
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        initializing: user === undefined,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}
