import React, { createContext, useContext, useEffect, useState } from 'react'
import * as afroditeApi from '../services/afroditeApi.js'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'

const NotificationsContext = createContext(null)

/**
 * Mantém uma única assinatura em tempo real das notificações do usuário
 * logado; o sino e a tela de notificações leem daqui. Notificações que
 * chegam com o app aberto também aparecem como aviso (toast).
 */
export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [state, setState] = useState({ items: null, error: null })

  useEffect(() => {
    if (!user) {
      setState({ items: null, error: null })
      return undefined
    }
    return afroditeApi.subscribeNotifications(
      (items, added) => {
        setState({ items, error: null })
        if (added.length) {
          toast(added.length === 1 ? added[0].title : `${added.length} novas notificações`, { severity: 'info' })
        }
      },
      (error) => setState({ items: null, error })
    )
  }, [user?.email, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = state.items
  const value = {
    items,
    error: state.error,
    loading: !!user && !items && !state.error,
    unread: items ? items.filter((n) => !n.read).length : 0
  }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider')
  return ctx
}
