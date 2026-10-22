import { useState, useEffect } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

/** Reactive desktop/mobile breakpoint — desktop gets its own layout
    (three-column dashboard, no tab bar/sheets/glass); below 1024px the
    existing mobile layout renders entirely unchanged. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.(DESKTOP_QUERY).matches ?? false)

  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP_QUERY)
    if (!mq) return
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}
