import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('done', false)
      .order('priority_rank', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (data) setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  const toggleTask = useCallback(async (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    const task = tasks.find(t => t.id === id)
    await supabase.from('tasks').update({ done: !task?.done }).eq('id', id)
  }, [tasks])

  const priorities = tasks.filter(t => t.priority)
  const allTasks = tasks

  return { tasks: allTasks, priorities, loading, toggleTask, refetch: fetchTasks }
}
