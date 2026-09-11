import React, { createContext, useContext, useState, useCallback } from 'react'
import * as afroditeApi from '../services/afroditeApi.js'

const AuthContext = createContext(null)

const STORAGE_KEY = 'afrodite_auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw).user : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const signIn = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const result = await afroditeApi.login({ email, password })
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      setUser(result.user)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await afroditeApi.logout()
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}
