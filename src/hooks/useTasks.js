import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { compareTaskDates } from '../lib/taskDates.js'

function priorityRank(task) {
  return Number.isFinite(Number(task.priority_rank)) ? Number(task.priority_rank) : Number.MAX_SAFE_INTEGER
}

function comparePriority(a, b) {
  if (a.priority !== b.priority) return a.priority ? -1 : 1
  const rankDiff = priorityRank(a) - priorityRank(b)
  if (rankDiff !== 0) return rankDiff
  return 0
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const dateDiff = compareTaskDates(a, b)
    if (dateDiff !== 0) return dateDiff

    const priorityDiff = comparePriority(a, b)
    if (priorityDiff !== 0) return priorityDiff

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

  const allTasks = sortTasks(tasks)
  const priorities = allTasks.filter(t => t.priority)

  return { tasks: allTasks, priorities, loading, toggleTask, refetch: fetchTasks }
}
