import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { getDayType, getCurrentPeriod, formatDate } from '../lib/schedule.js'

export function useSchedule() {
  const [settings, setSettings] = useState(null)
  const [dayType, setDayType] = useState(null)
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [dateLabel, setDateLabel] = useState(formatDate())

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data: rows }) => {
        if (!rows || rows.length === 0) return
        const row = rows[0]
        setSettings(row)

        const type = getDayType(
          row.first_day,
          row.first_day_type,
          row.no_school_dates || [],
        )
        setDayType(type)

        const schedule = type === 'A' ? row.a_schedule : row.b_schedule
        if (schedule?.length) {
          const period = getCurrentPeriod(schedule)
          setCurrentPeriod(period)
        }
      })

    setDateLabel(formatDate())
  }, [])

  // Refresh current period every minute
  useEffect(() => {
    if (!settings) return
    const interval = setInterval(() => {
      const type = getDayType(
        settings.first_day,
        settings.first_day_type,
        settings.no_school_dates || [],
      )
      const schedule = type === 'A' ? settings.a_schedule : settings.b_schedule
      if (schedule?.length) setCurrentPeriod(getCurrentPeriod(schedule))
    }, 60_000)
    return () => clearInterval(interval)
  }, [settings])

  return { dayType, currentPeriod, dateLabel, settings }
}
