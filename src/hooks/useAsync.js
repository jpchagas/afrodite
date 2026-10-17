import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Executa uma chamada assíncrona (ex.: afroditeApi) ao montar e sempre que
 * `deps` mudar. Ignora respostas de chamadas antigas, expõe o erro e permite
 * recarregar. `setData` serve para atualizações otimistas após escrita.
 *
 *   const { data, error, loading, reload, setData } = useAsync(() => api.getLead(id), [id])
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const callId = useRef(0)

  const run = useCallback(() => {
    const id = ++callId.current
    setState({ data: null, error: null, loading: true })
    Promise.resolve()
      .then(fn)
      .then(
        (data) => id === callId.current && setState({ data, error: null, loading: false }),
        (error) => {
          if (id !== callId.current) return
          console.error(error)
          setState({ data: null, error, loading: false })
        }
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
    return () => {
      callId.current++
    }
  }, [run])

  const setData = useCallback(
    (updater) =>
      setState((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater
      })),
    []
  )

  return { ...state, reload: run, setData }
}
