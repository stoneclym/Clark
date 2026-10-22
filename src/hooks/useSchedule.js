import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildScheduleContext, formatDate } from '../lib/schedule.js'

export function useSchedule() {
  const [settings, setSettings] = useState(null)
  const [context, setContext] = useState(null)
  const [dateLabel, setDateLabel] = useState(formatDate())

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data: rows }) => {
        if (!rows || rows.length === 0) return
        setSettings(rows[0])
        setContext(buildScheduleContext(rows[0]))
      })

    setDateLabel(formatDate())
  }, [])

  // Refresh the schedule context every minute
  useEffect(() => {
    if (!settings) return
    const interval = setInterval(() => {
      setContext(buildScheduleContext(settings))
    }, 60_000)
    return () => clearInterval(interval)
  }, [settings])

  return {
    dayType: context?.dayType ?? null,
    currentPeriod: context?.currentPeriod ?? null,
    scheduleContext: context,
    dateLabel,
    settings,
  }
}
