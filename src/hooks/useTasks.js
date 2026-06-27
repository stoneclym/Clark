import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseTaskSortDate(task) {
  const value = task?.due_date_calc || task?.due_date
  if (!value || typeof value !== 'string') return null

  const relative = value.trim().toLowerCase()
  if (['yesterday', 'today', 'tomorrow'].includes(relative)) {
    const date = startOfLocalDay(new Date())
    if (relative === 'yesterday') date.setDate(date.getDate() - 1)
    if (relative === 'tomorrow') date.setDate(date.getDate() + 1)
    return { date, hasTime: false }
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) {
    return {
      date: new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])),
      hasTime: false,
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}[T\s]/.test(value)) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : { date, hasTime: true }
}

function isPastDue(stored, now) {
  if (!stored) return false
  return stored.hasTime ? stored.date < now : startOfLocalDay(stored.date) < startOfLocalDay(now)
}

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
  const now = new Date()

  return [...tasks].sort((a, b) => {
    const aStored = parseTaskSortDate(a)
    const bStored = parseTaskSortDate(b)
    const aPast = isPastDue(aStored, now)
    const bPast = isPastDue(bStored, now)

    if (aPast !== bPast) return aPast ? -1 : 1
    if (aStored && bStored) {
      const dateDiff = aStored.date - bStored.date
      if (dateDiff !== 0) return dateDiff
      const priorityDiff = comparePriority(a, b)
      if (priorityDiff !== 0) return priorityDiff
    }
    if (aStored !== bStored) return aStored ? -1 : 1

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
