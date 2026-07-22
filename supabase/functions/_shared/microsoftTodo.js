// Microsoft Graph "To Do" wrappers. All Clark-managed reminders live in a
// dedicated "Clark" list (not the user's default To Do list) so they're
// visually separate from the user's own to-dos.
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const LIST_NAME = 'Clark'

async function graphFetch(accessToken, path, init = {}) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Graph ${init.method || 'GET'} ${path} failed (${res.status}): ${detail}`)
  }
  return res.status === 204 ? null : res.json()
}

/** Finds (or creates) the dedicated "Clark" To Do list, persisting its id on settings. */
export async function ensureClarkList(supabase, accessToken, settings) {
  if (settings?.microsoft_todo_list_id) return settings.microsoft_todo_list_id

  const { value: lists } = await graphFetch(accessToken, '/me/todo/lists')
  const existing = lists?.find(l => l.displayName === LIST_NAME)
  const list = existing || await graphFetch(accessToken, '/me/todo/lists', {
    method: 'POST',
    body: JSON.stringify({ displayName: LIST_NAME }),
  })

  await supabase.from('settings').update({ microsoft_todo_list_id: list.id }).eq('id', settings.id)
  return list.id
}

function toGraphDateTime(isoString) {
  // Graph's dateTimeTimeZone wants a timezone-less datetime string + a
  // separate IANA/Windows timeZone field — strip the trailing "Z".
  return { dateTime: isoString.replace(/Z$/, ''), timeZone: 'UTC' }
}

function taskPayload(task) {
  const due = toGraphDateTime(task.due_at)
  return {
    title: task.title,
    dueDateTime: due,
    reminderDateTime: due,
    isReminderOn: true,
  }
}

export async function createTodoTask(accessToken, listId, task) {
  return graphFetch(accessToken, `/me/todo/lists/${listId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(taskPayload(task)),
  })
}

export async function updateTodoTask(accessToken, listId, todoTaskId, task) {
  return graphFetch(accessToken, `/me/todo/lists/${listId}/tasks/${todoTaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(taskPayload(task)),
  })
}

export async function completeTodoTask(accessToken, listId, todoTaskId) {
  return graphFetch(accessToken, `/me/todo/lists/${listId}/tasks/${todoTaskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  })
}

/**
 * Best-effort push of a single newly-created task to Microsoft To Do, for
 * parse-brain-dump/ask-clark to call inline so a new reminder shows up as a
 * phone notification within seconds instead of waiting for the next
 * scheduled sync-todo pass. Never throws — swallows and logs failures (a
 * disconnected/expired Microsoft account shouldn't break task creation).
 */
export async function pushSingleTaskBestEffort(supabase, getValidAccessToken, settings, task) {
  if (!task?.due_at || !settings?.microsoft_refresh_token) return
  try {
    const accessToken = await getValidAccessToken(supabase, settings)
    if (!accessToken) return
    const listId = await ensureClarkList(supabase, accessToken, settings)
    const created = await createTodoTask(accessToken, listId, task)
    await supabase.from('tasks').update({
      microsoft_todo_task_id: created.id,
      microsoft_todo_synced_at: new Date().toISOString(),
    }).eq('id', task.id)
  } catch (err) {
    console.error('pushSingleTaskBestEffort failed:', err)
  }
}

/**
 * Pulls everything changed since the last delta cursor (or a full snapshot
 * if `deltaLink` is null, on first sync). Returns { items, deltaLink } where
 * each item is either a normal todoTask or a `{ id, '@removed': {...} }` tombstone.
 */
export async function pullDelta(accessToken, listId, deltaLink) {
  let path = deltaLink
    ? deltaLink.replace(GRAPH_BASE, '')
    : `/me/todo/lists/${listId}/tasks/delta`

  const items = []
  let nextDeltaLink = deltaLink

  while (path) {
    const page = await graphFetch(accessToken, path)
    items.push(...(page.value || []))
    if (page['@odata.deltaLink']) {
      nextDeltaLink = page['@odata.deltaLink']
      path = null
    } else if (page['@odata.nextLink']) {
      path = page['@odata.nextLink'].replace(GRAPH_BASE, '')
    } else {
      path = null
    }
  }

  return { items, deltaLink: nextDeltaLink }
}
