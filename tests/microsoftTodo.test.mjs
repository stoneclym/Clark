/**
 * Unit tests for the Microsoft Graph/To Do helper logic that doesn't require
 * a live Microsoft OAuth connection — payload shaping, list find-or-create,
 * delta-query pagination, and the best-effort single-task push wrapper.
 * Graph itself is mocked via a stubbed global fetch.
 *
 * Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ensureClarkList,
  createTodoTask,
  pullDelta,
  pushSingleTaskBestEffort,
} from '../supabase/functions/_shared/microsoftTodo.js'

function mockSupabase(overrides = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const chain = {
        table,
        _payload: null,
        update(payload) { chain._payload = payload; calls.push({ table, op: 'update', payload }); return chain },
        eq() { return chain },
        then(resolve) { resolve({ data: null, error: null }) },
      }
      return chain
    },
    ...overrides,
  }
}

test('createTodoTask shapes the Graph payload from due_at, no Z suffix on the datetime', async () => {
  let capturedBody = null
  globalThis.fetch = async (url, init) => {
    capturedBody = JSON.parse(init.body)
    assert.equal(url, 'https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks')
    assert.equal(init.method, 'POST')
    assert.equal(init.headers.Authorization, 'Bearer tok-123')
    return { ok: true, status: 201, json: async () => ({ id: 'todo-1' }) }
  }

  const result = await createTodoTask('tok-123', 'list-1', {
    title: 'HOTA essay',
    due_at: '2026-07-09T03:59:00.000Z',
  })

  assert.equal(result.id, 'todo-1')
  assert.equal(capturedBody.title, 'HOTA essay')
  assert.equal(capturedBody.dueDateTime.dateTime, '2026-07-09T03:59:00.000')
  assert.equal(capturedBody.dueDateTime.timeZone, 'UTC')
  assert.deepEqual(capturedBody.reminderDateTime, capturedBody.dueDateTime)
  assert.equal(capturedBody.isReminderOn, true)
})

test('createTodoTask throws with Graph error detail on a non-2xx response', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => '{"error":"Forbidden"}' })
  await assert.rejects(
    () => createTodoTask('tok', 'list-1', { title: 'x', due_at: '2026-01-01T00:00:00.000Z' }),
    /Graph POST .* failed \(403\)/,
  )
})

test('ensureClarkList reuses an existing "Clark" list instead of creating a duplicate', async () => {
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(url)
    assert.equal(url, 'https://graph.microsoft.com/v1.0/me/todo/lists')
    return { ok: true, status: 200, json: async () => ({ value: [{ id: 'other', displayName: 'Tasks' }, { id: 'clark-list', displayName: 'Clark' }] }) }
  }
  const supabase = mockSupabase()
  const listId = await ensureClarkList(supabase, 'tok', { id: 'settings-1', microsoft_todo_list_id: null })
  assert.equal(listId, 'clark-list')
  assert.equal(calls.length, 1) // no POST — found existing, no creation call
})

test('ensureClarkList creates the list when none exists, and persists the id', async () => {
  let createCalled = false
  globalThis.fetch = async (url, init) => {
    if (init?.method !== 'POST') return { ok: true, status: 200, json: async () => ({ value: [] }) }
    createCalled = true
    assert.equal(init.method, 'POST')
    assert.equal(JSON.parse(init.body).displayName, 'Clark')
    return { ok: true, status: 201, json: async () => ({ id: 'new-list' }) }
  }
  const supabase = mockSupabase()
  const listId = await ensureClarkList(supabase, 'tok', { id: 'settings-1', microsoft_todo_list_id: null })
  assert.equal(listId, 'new-list')
  assert.equal(createCalled, true)
  assert.deepEqual(supabase.calls[0], { table: 'settings', op: 'update', payload: { microsoft_todo_list_id: 'new-list' } })
})

test('ensureClarkList short-circuits (no Graph call) when settings already has a list id', async () => {
  globalThis.fetch = async () => { throw new Error('should not be called') }
  const supabase = mockSupabase()
  const listId = await ensureClarkList(supabase, 'tok', { id: 's1', microsoft_todo_list_id: 'existing-list' })
  assert.equal(listId, 'existing-list')
})

test('pullDelta follows @odata.nextLink pages and stops at @odata.deltaLink', async () => {
  const responses = [
    { value: [{ id: 'a' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/todo/lists/l1/tasks/delta?page=2' },
    { value: [{ id: 'b' }], '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/me/todo/lists/l1/tasks/delta?token=xyz' },
  ]
  let call = 0
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => responses[call++] })

  const { items, deltaLink } = await pullDelta('tok', 'l1', null)
  assert.deepEqual(items.map(i => i.id), ['a', 'b'])
  assert.equal(deltaLink, 'https://graph.microsoft.com/v1.0/me/todo/lists/l1/tasks/delta?token=xyz')
  assert.equal(call, 2)
})

test('pullDelta resumes from a stored deltaLink on subsequent calls', async () => {
  let requestedUrl = null
  globalThis.fetch = async (url) => {
    requestedUrl = url
    return { ok: true, status: 200, json: async () => ({ value: [], '@odata.deltaLink': url }) }
  }
  const stored = 'https://graph.microsoft.com/v1.0/me/todo/lists/l1/tasks/delta?token=resume-me'
  await pullDelta('tok', 'l1', stored)
  assert.equal(requestedUrl, stored)
})

test('pushSingleTaskBestEffort no-ops silently when there is no due_at', async () => {
  globalThis.fetch = async () => { throw new Error('should not be called') }
  const supabase = mockSupabase()
  const getValidAccessToken = async () => 'tok'
  await pushSingleTaskBestEffort(supabase, getValidAccessToken, { microsoft_refresh_token: 'r' }, { id: 't1', title: 'No date', due_at: null })
  assert.equal(supabase.calls.length, 0)
})

test('pushSingleTaskBestEffort no-ops silently when Microsoft is not connected', async () => {
  globalThis.fetch = async () => { throw new Error('should not be called') }
  const supabase = mockSupabase()
  const getValidAccessToken = async () => 'tok'
  await pushSingleTaskBestEffort(supabase, getValidAccessToken, { microsoft_refresh_token: null }, { id: 't1', title: 'Has date', due_at: '2026-07-09T03:59:00.000Z' })
  assert.equal(supabase.calls.length, 0)
})

test('pushSingleTaskBestEffort swallows Graph failures instead of throwing (never breaks task creation)', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' })
  const supabase = mockSupabase()
  const getValidAccessToken = async () => 'tok'
  await assert.doesNotReject(() =>
    pushSingleTaskBestEffort(supabase, getValidAccessToken, { id: 's1', microsoft_refresh_token: 'r', microsoft_todo_list_id: 'l1' }, { id: 't1', title: 'Task', due_at: '2026-07-09T03:59:00.000Z' })
  )
})

test('pushSingleTaskBestEffort creates the task and links microsoft_todo_task_id on success', async () => {
  globalThis.fetch = async (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/tasks')) {
      return { ok: true, status: 201, json: async () => ({ id: 'todo-99' }) }
    }
    throw new Error(`unexpected fetch: ${url}`)
  }
  const supabase = mockSupabase()
  const getValidAccessToken = async () => 'tok'
  await pushSingleTaskBestEffort(
    supabase, getValidAccessToken,
    { id: 's1', microsoft_refresh_token: 'r', microsoft_todo_list_id: 'l1' },
    { id: 't1', title: 'Task', due_at: '2026-07-09T03:59:00.000Z' },
  )
  const update = supabase.calls.find(c => c.table === 'tasks' && c.op === 'update')
  assert.equal(update.payload.microsoft_todo_task_id, 'todo-99')
  assert.ok(update.payload.microsoft_todo_synced_at)
})
