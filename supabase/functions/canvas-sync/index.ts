import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: settings } = await supabase
    .from('settings')
    .select('canvas_token, canvas_url')
    .single()

  if (!settings?.canvas_token || !settings?.canvas_url) {
    return new Response(JSON.stringify({ error: 'Canvas not configured' }), { status: 400 })
  }

  const canvasUrl = settings.canvas_url.replace(/\/$/, '')
  const token = settings.canvas_token

  const headers = { Authorization: `Bearer ${token}` }

  // Fetch upcoming assignments across all courses
  const res = await fetch(
    `${canvasUrl}/api/v1/planner/items?per_page=50&filter=new_activity`,
    { headers },
  )

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Canvas API error: ${res.status}` }), { status: 502 })
  }

  const items: Array<Record<string, unknown>> = await res.json()

  const tasks = items
    .filter((item) => item.plannable_type === 'assignment' || item.plannable_type === 'quiz')
    .map((item) => {
      const plannable = item.plannable as Record<string, unknown>
      const course = item.context_name as string || 'Canvas'
      const dueAt = plannable?.due_at as string | null

      return {
        title: plannable?.title as string || 'Canvas assignment',
        category: 'Class',
        tag: course,
        due_date: dueAt ? new Date(dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD',
        due_date_calc: dueAt ? new Date(dueAt).toISOString().split('T')[0] : null,
        priority: false,
        source: 'Canvas',
        done: (item.planner_override as Record<string, unknown>)?.marked_complete ?? false,
      }
    })

  if (tasks.length) {
    await supabase
      .from('tasks')
      .upsert(tasks, { onConflict: 'title,source', ignoreDuplicates: true })
  }

  return new Response(JSON.stringify({ synced: tasks.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
