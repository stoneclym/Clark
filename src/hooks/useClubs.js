import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClubs() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClubs = useCallback(async () => {
    const { data } = await supabase
      .from('clubs')
      .select('*, club_tasks(*)')
      .order('display_order', { ascending: true })
    if (data) setClubs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClubs()
    const channel = supabase
      .channel('clubs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clubs' }, fetchClubs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_tasks' }, fetchClubs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchClubs])

  return { clubs, loading }
}
