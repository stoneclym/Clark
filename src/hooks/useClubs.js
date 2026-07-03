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
    // Unique topic per hook instance — this hook mounts in both ClubsScreen
    // and CalendarCard, and supabase-js returns the same channel object for a
    // duplicate topic, which throws when the second mount adds callbacks to
    // an already-subscribed channel.
    const channel = supabase
      .channel(`clubs-realtime-${Math.random().toString(36).slice(2)}`)
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

  const deleteMeeting = useCallback(async (clubId) => {
    const club = clubs.find(c => c.id === clubId)
    if (!club?.next_meeting) return
    const whenText = club.next_meeting

    // Optimistic clear so the card updates instantly
    setClubs(prev => prev.map(c => c.id === clubId ? { ...c, next_meeting: null } : c))

    await supabase.from('completed_meetings').insert({
      club_id: clubId,
      club_name: club.name,
      when_text: whenText,
    })
    await supabase.from('clubs').update({ next_meeting: null }).eq('id', clubId)
  }, [clubs])

  return { clubs, loading, toggleClubTask, deleteMeeting }
}
