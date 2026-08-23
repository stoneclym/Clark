import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { compareTaskDates } from '../lib/taskDates.js'

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const dateDiff = compareTaskDates(a, b)
    if (dateDiff !== 0) return dateDiff

    return new Date(a.created_at || 0) - new Date(b.created_at || 0)
  })
}

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('done', false)
      .order('created_at', { ascending: true })
    if (data) setTasks(sortTasks(data))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
    // Unique topic per hook instance — a duplicate topic would return the
    // same channel object from supabase-js, which throws if a second mount
    // adds callbacks to an already-subscribed channel.
    const channel = supabase
      .channel(`tasks-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  const toggleTask = useCallback(async (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    const task = tasks.find(t => t.id === id)
    await supabase.from('tasks').update({ done: !task?.done }).eq('id', id)
  }, [tasks])

  const allTasks = sortTasks(tasks)

  return { tasks: allTasks, loading, toggleTask, refetch: fetchTasks }
}
