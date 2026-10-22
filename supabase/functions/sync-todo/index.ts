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
    .select('id, title, tag, due_at, microsoft_todo_task_id')
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
      if (err instanceof Error && (err as { status?: number }).status === 404) {
        // The linked Microsoft item was deleted directly in To Do — clear
        // the stale link so it gets recreated as a fresh item next sync.
        await supabase.from('tasks').update({ microsoft_todo_task_id: null }).eq('id', task.id)
      } else {
        errors.push(`push "${task.title}": ${err instanceof Error ? err.message : String(err)}`)
      }
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
      if (err instanceof Error && (err as { status?: number }).status === 404) {
        // Already gone on Microsoft's side (e.g. deleted directly in To
        // Do) — nothing left to complete. Clear the stale link instead of
        // retrying this exact failure forever.
        await supabase.from('tasks').update({ microsoft_todo_task_id: null }).eq('id', task.id)
      } else {
        errors.push(`complete "${task.title}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // Pull: reflect completions/deletions made directly in Microsoft To Do back
  // into Clark, and import tasks created directly in the "Clark" To Do list
  // that Clark doesn't know about yet.
  let pulled = 0
  let imported = 0
  try {
    const { items, deltaLink } = await pullDelta(accessToken, listId, settings.microsoft_todo_delta_link)

    for (const item of items) {
      const removed = Boolean(item['@removed'])
      const status = item.status

      if (removed || status === 'completed') {
        const { data: matches } = await supabase
          .from('tasks')
          .select('id, done')
          .eq('microsoft_todo_task_id', item.id)
          .eq('done', false)

        for (const match of matches ?? []) {
          await supabase.from('tasks').update({ done: true }).eq('id', match.id)
          pulled++
        }
        continue
      }

      // Still open in Microsoft To Do — if Clark has no record of this task
      // yet, it was created directly in the app, not in Clark. Import it.
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('microsoft_todo_task_id', item.id)
        .maybeSingle()

      if (!existing) {
        const dueAt = item.dueDateTime?.dateTime
          ? new Date(`${item.dueDateTime.dateTime}Z`).toISOString()
          : null
        const { error: insertError } = await supabase.from('tasks').insert({
          title: item.title || 'Untitled task',
          due_at: dueAt,
          due_date_calc: dueAt ? dueAt.slice(0, 10) : null,
          source: 'Microsoft To Do',
          microsoft_todo_task_id: item.id,
          microsoft_todo_synced_at: new Date().toISOString(),
        })
        if (insertError) {
          errors.push(`import "${item.title}": ${insertError.message}`)
        } else {
          imported++
        }
      }
    }

    if (deltaLink) {
      await supabase.from('settings').update({ microsoft_todo_delta_link: deltaLink }).eq('id', settings.id)
    }
  } catch (err) {
    errors.push(`pull: ${err instanceof Error ? err.message : String(err)}`)
  }

  await supabase.from('settings').update({
    microsoft_todo_last_error: errors.length > 0 ? errors.join('; ') : null,
  }).eq('id', settings.id)

  if (errors.length > 0) {
    console.error('sync-todo: errors:', errors)
    return new Response(
      JSON.stringify({ error: errors.join('; '), pushed, completed, pulled, imported }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ pushed, completed, pulled, imported }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
