import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useGrades() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('grades')
      .select('*')
      .order('class_order', { ascending: true })
      .then(({ data }) => {
        if (data) setGrades(data)
        setLoading(false)
      })

    const channel = supabase
      .channel('grades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => {
        supabase.from('grades').select('*').order('class_order').then(({ data }) => {
          if (data) setGrades(data)
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return { grades, loading }
}
