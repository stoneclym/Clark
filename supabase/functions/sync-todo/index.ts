import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken } from '../_shared/microsoftGraph.js'
import { ensureClarkList, createTodoTask, updateTodoTask, completeTodoTask, pullDelta } from '../_shared/microsoftTodo.js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!settings?.microsoft_refresh_token) {
    return new Response(
      JSON.stringify({ error: 'Microsoft account not connected. Connect it in Settings first.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(supabase, settings)
    settings.microsoft_todo_list_id = await ensureClarkList(supabase, accessToken, settings)
  } catch (err) {
    console.error('sync-todo: setup failed:', err)
    return new Response(
      JSON.stringify({ error: `Microsoft sign-in expired: ${err instanceof Error ? err.message : String(err)}. Reconnect in Settings.` }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const listId = settings.microsoft_todo_list_id
  let pushed = 0
  let completed = 0
  const errors: string[] = []

  // Push: create/update every open task with a resolved due date.
  const { data: openTasks } = await supabase
    .from('tasks')
    .select('id, title, due_at, microsoft_todo_task_id')
    .eq('done', false)
    .not('due_at', 'is', null)

  for (const task of openTasks ?? []) {
    try {
      if (task.microsoft_todo_task_id) {
        await updateTodoTask(accessToken, listId, task.microsoft_todo_task_id, task)
      } else {
        const created = await createTodoTask(accessToken, listId, task)
        await supabase.from('tasks').update({
          microsoft_todo_task_id: created.id,
          microsoft_todo_synced_at: new Date().toISOString(),
        }).eq('id', task.id)
      }
      pushed++
    } catch (err) {
      errors.push(`push "${task.title}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Push completions: mark done in Microsoft To Do for tasks completed in Clark.
  const { data: doneTasks } = await supabase
    .from('tasks')
    .select('id, title, microsoft_todo_task_id')
    .eq('done', true)
    .not('microsoft_todo_task_id', 'is', null)

  for (const task of doneTasks ?? []) {
    try {
      await completeTodoTask(accessToken, listId, task.microsoft_todo_task_id)
      completed++
    } catch (err) {
      errors.push(`complete "${task.title}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Pull: reflect completions/deletions made directly in Microsoft To Do back into Clark.
  let pulled = 0
  try {
    const { items, deltaLink } = await pullDelta(accessToken, listId, settings.microsoft_todo_delta_link)

    for (const item of items) {
      const removed = Boolean(item['@removed'])
      const status = item.status
      if (!removed && status !== 'completed') continue

      const { data: matches } = await supabase
        .from('tasks')
        .select('id, done')
        .eq('microsoft_todo_task_id', item.id)
        .eq('done', false)

      for (const match of matches ?? []) {
        await supabase.from('tasks').update({ done: true }).eq('id', match.id)
        pulled++
      }
    }

    if (deltaLink) {
      await supabase.from('settings').update({ microsoft_todo_delta_link: deltaLink }).eq('id', settings.id)
    }
  } catch (err) {
    errors.push(`pull: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (errors.length > 0) {
    console.error('sync-todo: errors:', errors)
    return new Response(
      JSON.stringify({ error: errors.join('; '), pushed, completed, pulled }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ pushed, completed, pulled }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
