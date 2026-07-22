import { useState, useEffect } from 'react'

function useMediaFlag(query) {
  const [flag, setFlag] = useState(() => window.matchMedia?.(query).matches ?? false)

  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const update = () => setFlag(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return flag
}

export const useReducedMotion = () => useMediaFlag('(prefers-reduced-motion: reduce)')
