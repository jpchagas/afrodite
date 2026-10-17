import React, { createContext, useCallback, useContext, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

const ToastContext = createContext(null)

/**
 * Avisos rápidos globais: `const toast = useToast(); toast('Salvo')` ou
 * `toast('Falhou', { severity: 'error' })`.
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null)

  const toast = useCallback((message, { severity = 'success' } = {}) => {
    setCurrent({ message, severity, key: Date.now() })
  }, [])

  const handleClose = (_, reason) => {
    if (reason !== 'clickaway') setCurrent(null)
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Snackbar
        key={current?.key}
        open={!!current}
        autoHideDuration={2800}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px) !important' }}
      >
        {current ? (
          <Alert severity={current.severity} variant="filled" onClose={handleClose} sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de um ToastProvider')
  return ctx
}
