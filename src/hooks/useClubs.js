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

  const toggleClubTask = useCallback(async (taskId, currentDone) => {
    // Optimistic update so the checkbox responds instantly
    setClubs(prev => prev.map(club => ({
      ...club,
      club_tasks: club.club_tasks?.map(t =>
        t.id === taskId ? { ...t, done: !currentDone } : t
      ),
    })))
    await supabase.from('club_tasks').update({ done: !currentDone }).eq('id', taskId)
  }, [])

  return { clubs, loading, toggleClubTask }
}
