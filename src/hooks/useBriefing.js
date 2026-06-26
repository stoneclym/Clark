import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useBriefing() {
  const [briefing, setBriefing] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // Load the most recent briefing
    supabase
      .from('briefings')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setBriefing(data)
      })
  }, [])

  const generate = useCallback(async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-briefing')
      if (error) throw error
      setBriefing(data)
    } finally {
      setGenerating(false)
    }
  }, [])

  return { briefing, generating, generate }
}
