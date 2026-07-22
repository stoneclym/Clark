import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildScheduleContext, describeScheduleContext } from '../_shared/scheduleContext.js'
import { computeDeadline, inferKind, TIME_PATTERN } from '../_shared/deadlineEngine.js'
import { getValidAccessToken } from '../_shared/microsoftGraph.js'
import { pushSingleTaskBestEffort } from '../_shared/microsoftTodo.js'
import { matchClub } from '../_shared/clubMatch.js'

const TASK_KINDS = ['assignment', 'test', 'event']

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


const TASK_TITLE_CLASS_PHRASES = [
  'IB History of the Americas',
  'History of the Americas',
  'IB Applications and Interpretations',
  'Applications and Interpretations',
  'IB Language and Literature',
  'Language and Literature',
  'IB Theory of Knowledge',
  'Theory of Knowledge',
  'IB Biology',
  'Biology',
  'History',
  'English',
  'Math',
  'HOTA',
  'Bio',
  'Lang',
  'TOK',
]

function stripClassPhrases(value: string) {
  let title = value
  TASK_TITLE_CLASS_PHRASES.forEach(phrase => {
    const pattern = phrase.replace(/\s+/g, '\\s+')
    title = title.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ')
  })
  return title.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}
const TASK_TITLE_WORDS: Record<string, string> = {
  ib: 'IB',
  nhs: 'NHS',
  tok: 'TOK',
  hota: 'HOTA',
  ap: 'AP',
  gpa: 'GPA',
  ia: 'IA',
  ee: 'EE',
  cas: 'CAS',
  sat: 'SAT',
  act: 'ACT',
  ncsis: 'NCSIS',
  bio: 'Bio',
  math: 'Math',
  canvas: 'Canvas',
  instagram: 'Instagram',
}

function sentenceCaseTaskTitle(value: unknown) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''

  const shouldNormalizeCase = raw === raw.toLowerCase() || raw === raw.toUpperCase()
  let title = shouldNormalizeCase ? raw.toLowerCase() : raw

  title = title.replace(/[A-Za-z]/, letter => letter.toUpperCase())
  title = title.replace(/([.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)

  Object.entries(TASK_TITLE_WORDS).forEach(([word, replacement]) => {
    title = title.replace(new RegExp(`\\b${word}\\b`, 'gi'), replacement)
  })

  const cleaned = stripClassPhrases(title) || title
  return cleaned.replace(/[A-Za-z]/, letter => letter.toUpperCase())
}

const TASK_CLASS_TAGS: Record<string, string> = {
  hota: 'HOTA',
  history: 'HOTA',
  'history of the americas': 'HOTA',
  'ib history of the americas': 'HOTA',
  bio: 'Bio',
  biology: 'Bio',
  'ib biology': 'Bio',
  'ib biology hl': 'Bio',
  'biology hl': 'Bio',
  lang: 'Lang',
  english: 'Lang',
  'language and literature': 'Lang',
  'ib language and literature': 'Lang',
  'ib english language and literature': 'Lang',
  'ib english lang lit': 'Lang',
  'ib english lang and lit': 'Lang',
  'ib language and lit': 'Lang',
  'language and lit': 'Lang',
  math: 'Math',
  'applications and interpretations': 'Math',
  'ib applications and interpretations': 'Math',
  'ib math applications and interpretations': 'Math',
  'math applications and interpretations': 'Math',
  'math analysis and approaches': 'Math',
  tok: 'TOK',
  'theory of knowledge': 'TOK',
  'ib theory of knowledge': 'TOK',
}

function normalizeClassLabel(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')

  return TASK_CLASS_TAGS[normalized] || null
}

// If the user's text pairs the due phrase with an explicit clock time
// ("Friday at 4 PM"), keep the time attached to what the AI extracted.
function enrichDueText(dueDate: unknown, sourceText: unknown) {
  const due = String(dueDate || '').trim()
  const source = String(sourceText || '')
  if (!due) return due
  if (TIME_PATTERN.test(due)) return due

  const escapedDue = due.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const dueWithTime = source.match(new RegExp(`\\b${escapedDue}\\s+(?:at\\s*)?\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)\\b`, 'i'))
  if (dueWithTime) return dueWithTime[0]

  return due
}

const tools: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Add a new task to the task list. Use this whenever the user asks you to add, note, or remember a task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        category: { type: 'string', enum: ['Class', 'Club', 'College', 'Personal'], description: 'Category' },
        tag: { type: 'string', description: 'Short tag like the class name, or the exact club name if this is for a club: "Student Council", "Beta Club", "National Honor Society", or "Spanish Club"' },
        kind: { type: 'string', enum: ['assignment', 'test', 'event'], description: 'What the item is: "test" for tests/quizzes/exams, "event" for things attended at a set time, "assignment" for anything produced or completed' },
        due_date: { type: 'string', description: 'The user\'s scheduling words VERBATIM: "today", "next class", "Friday", "tomorrow at 4 PM". Do not calculate or reword dates — deterministic code computes the real date.' },
        priority: { type: 'boolean', description: 'Whether this is a top priority task' },
      },
      required: ['title'],
    },
  },
  {
    name: 'mark_task_done',
    description: 'Mark a task as completed. Matches by partial title.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title_match: { type: 'string', description: 'Part of the task title to match (case-insensitive)' },
      },
      required: ['title_match'],
    },
  },
  {
    name: 'set_club_meeting',
    description: 'Set or update the next meeting date/time for a club. Use when the user mentions when a club meeting is happening — e.g. "NHS meeting is tomorrow at 3:30", "Beta Club meets Friday". Do NOT use this for action items to complete; use create_task for those.',
    input_schema: {
      type: 'object' as const,
      properties: {
        club_name: { type: 'string', description: 'Full exact name of the club: "National Honor Society", "Beta Club", "Spanish Club", or "Student Council"' },
        when: { type: 'string', description: 'Natural language meeting time: "tomorrow at 3:30", "Friday after school", "next Wednesday at 4 PM"' },
      },
      required: ['club_name', 'when'],
    },
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [tasksRes, gradesRes, emailsRes, clubsRes, settingsRes] = await Promise.all([
    supabase.from('tasks').select('id, title, category, tag, due_date, due_at, priority, done').eq('done', false).limit(30),
    supabase.from('grades').select('class_name, score, percentage, note').order('class_order'),
    supabase.from('emails').select('from_name, subject, snippet, received_at').order('received_at', { ascending: false }).limit(5),
    supabase.from('clubs').select('id, name, role, next_meeting, club_tasks(task_text, done)').order('display_order'),
    supabase.from('settings').select('*').order('created_at', { ascending: false }).limit(1),
  ])

  const tasks = tasksRes.data ?? []
  const grades = gradesRes.data ?? []
  const emails = emailsRes.data ?? []
  const clubs = clubsRes.data ?? []
  const settings = settingsRes.data?.[0] ?? null

  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })
  const scheduleContext = describeScheduleContext(buildScheduleContext(settings))

  const context = `
Today is ${today}.

SCHEDULE (computed, trust these facts):
${scheduleContext || 'No schedule configured.'}

PENDING TASKS (${tasks.length}):
${tasks.map(t => `- [${t.id}] ${t.title} [${t.tag || t.category}] due ${t.due_at || t.due_date || 'no date'}${t.priority ? ' ★ priority' : ''}`).join('\n') || 'None'}

GRADES:
${grades.map(g => `- ${g.class_name}: ${g.score || '—'} (${g.percentage || '—'})${g.note ? ' — ' + g.note : ''}`).join('\n') || 'None'}

RECENT INBOX (${emails.length}):
${emails.map(e => `- From: ${e.from_name} | ${e.subject} | ${e.snippet?.slice(0, 80)}`).join('\n') || 'None'}

CLUBS & LEADERSHIP:
${clubs.map(c => {
  const pending = (c.club_tasks as Array<{task_text: string; done: boolean}>)?.filter(t => !t.done).map(t => t.task_text) ?? []
  return `- ${c.name} (${c.role})${c.next_meeting ? ', next meeting: ' + c.next_meeting : ''}${pending.length ? ', pending: ' + pending.join(', ') : ''}`
}).join('\n') || 'None'}
`.trim()

  const systemPrompt = `You are Clark, a smart personal assistant for a high school senior who is an IB student and multi-club leader. You know their schedule, tasks, grades, inbox, and clubs.

Be conversational, concise, and genuinely helpful. Use short sentences. Speak like a knowledgeable friend — not a formal assistant.

Format with markdown when it helps clarity — bold for emphasis, bullet or numbered lists, and tables for anything with rows and columns (e.g. comparing classes or a weekly breakdown). The chat renders full markdown, so use it naturally rather than describing a table in prose.

IMPORTANT: When the user asks you to add a task, create a reminder, or "note" something — you MUST call the create_task tool to actually save it. When they say something is done or finished, call mark_task_done. When the user mentions when a club meeting is happening ("NHS meeting is tomorrow at 3:30", "Beta Club meets Friday"), call set_club_meeting — do NOT create a task for a meeting announcement. Never claim you've done something without calling the tool.

Current context:
${context}`

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    tools,
    messages,
  })

  // Process tool calls in a loop (Claude may chain multiple tool calls)
  while (response.stop_reason === 'tool_use') {
    const toolResults: Array<{type: 'tool_result'; tool_use_id: string; content: string}> = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      const input = block.input as Record<string, unknown>
      let result = ''

      if (block.name === 'create_task') {
        const title = sentenceCaseTaskTitle(input.title) || 'Untitled task'
        const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content || ''
        const dueText = enrichDueText(input.due_date, `${input.title || ''} ${latestUserMessage}`)

        // Deterministic safety net: if this is clearly a club task, route it
        // to that club's card instead of the main tasks list — create_task
        // has no club_tasks path of its own, so Claude can't do this itself.
        const club = matchClub(`${input.title || ''} ${input.tag || ''} ${input.category || ''}`, clubs)

        if (club) {
          const { error } = await supabase.from('club_tasks').insert({
            club_id: (club as { id: string }).id,
            task_text: dueText ? `${title} (due ${dueText})` : title,
          })
          result = error ? `Error creating club task: ${error.message}` : `Task "${title}" added to ${(club as { name: string }).name}.`
        } else {
          const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
          const tag = normalizeClassLabel(input.tag)
          const kind = TASK_KINDS.includes(String(input.kind))
            ? String(input.kind)
            : inferKind(String(input.title || ''), dueText)
          const deadline = computeDeadline({
            kind,
            dueText,
            className: tag || String(input.tag || ''),
            title: String(input.title || ''),
          }, settings)
          const { data: insertedTask, error } = await supabase.from('tasks').insert({
            title,
            category: (input.category as string) || 'Personal',
            tag,
            kind,
            ...deadline,
            priority: (input.priority as boolean) || false,
            priority_rank: input.priority ? (count || 0) + 1 : null,
            source: 'Ask Clark',
          }).select().single()
          result = error ? `Error creating task: ${error.message}` : `Task "${title}" added successfully.`

          // Best-effort: push the new reminder to Microsoft To Do right away.
          if (!error && insertedTask && settings?.microsoft_refresh_token) {
            await pushSingleTaskBestEffort(supabase, getValidAccessToken, settings, insertedTask)
          }
        }
      }

      if (block.name === 'mark_task_done') {
        const { error, count } = await supabase.from('tasks')
          .update({ done: true })
          .ilike('title', `%${input.title_match as string}%`)
          .eq('done', false)
          .select('*', { count: 'exact' })
        result = error
          ? `Error: ${error.message}`
          : count
            ? `Marked ${count} task(s) as done.`
            : 'No matching tasks found.'
      }

      if (block.name === 'set_club_meeting') {
        const { error } = await supabase
          .from('clubs')
          .update({ next_meeting: input.when as string })
          .ilike('name', `%${(input.club_name as string).split(' ')[0]}%`)
        result = error
          ? `Error updating meeting: ${error.message}`
          : `Updated ${input.club_name} next meeting to "${input.when}".`
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      tools,
      messages: [
        ...messages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ],
    })
  }

  const text = response.content.find(b => b.type === 'text')?.text ?? ''

  return new Response(JSON.stringify({ text }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
