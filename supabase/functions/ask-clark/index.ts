import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

const CLARK_TIME_ZONE = 'America/New_York'
const CLARK_DATE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: CLARK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function clarkParts(date: Date) {
  return CLARK_DATE_PARTS.formatToParts(date).reduce((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
    return parts
  }, {} as Record<string, number>)
}

function clarkOffsetMs(date: Date) {
  const parts = clarkParts(date)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second, 0)
  return asUtc - date.getTime()
}

function clarkYear(date: Date) {
  return clarkParts(date).year
}

function clarkMonth(date: Date) {
  return clarkParts(date).month - 1
}

function clarkDay(date: Date) {
  return clarkParts(date).day
}

function clarkWeekday(date: Date) {
  const parts = clarkParts(date)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

function dateFromClarkParts(year: number, monthIndex: number, day: number, hours = 0, minutes = 0) {
  const utcGuess = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0)
  const firstPass = new Date(utcGuess - clarkOffsetMs(new Date(utcGuess)))
  return new Date(utcGuess - clarkOffsetMs(firstPass))
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const MONTH_NAME_PATTERN = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i

function parseTime(value: string) {
  const match = value.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3].toLowerCase()
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

function applyDeadlineTime(date: Date, time: { hours: number; minutes: number } | null) {
  const applied = time || { hours: 23, minutes: 59 }
  return dateFromClarkParts(clarkYear(date), clarkMonth(date), clarkDay(date), applied.hours, applied.minutes)
}
function nextWeekdayDate(dayName: string) {
  const targetDay = WEEKDAYS[dayName]
  if (targetDay == null) return null
  const now = new Date()
  const currentDay = clarkWeekday(now)
  const diff = (targetDay - currentDay + 7) % 7
  const date = dateFromClarkParts(clarkYear(now), clarkMonth(now), clarkDay(now))
  date.setUTCDate(date.getUTCDate() + diff)
  return date
}
function parseDeadlineDate(value: string) {
  const text = value.trim()
  const lower = text.toLowerCase()

  const relative = lower.replace(/\s+at\s+.*$/i, '')
  if (['yesterday', 'today', 'tomorrow'].includes(relative)) {
    const now = new Date()
    const date = dateFromClarkParts(clarkYear(now), clarkMonth(now), clarkDay(now))
    if (relative === 'yesterday') date.setUTCDate(date.getUTCDate() - 1)
    if (relative === 'tomorrow') date.setUTCDate(date.getUTCDate() + 1)
    return date
  }

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|\s)/)
  if (dateOnly) return dateFromClarkParts(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))

  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?:\b|\s)/)
  if (slashDate) {
    const year = slashDate[3]
      ? Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3])
      : clarkYear(new Date())
    return dateFromClarkParts(year, Number(slashDate[1]) - 1, Number(slashDate[2]))
  }

  if (MONTH_NAME_PATTERN.test(text) && /\d{1,2}/.test(text) && /\d{4}/.test(text)) {
    const dateText = text.replace(/\s+at\s+.*$/i, '')
    const parsed = new Date(dateText)
    return Number.isNaN(parsed.getTime()) ? null : dateFromClarkParts(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  const weekday = Object.keys(WEEKDAYS).find(day => lower === day || lower.startsWith(`${day} at `))
  return weekday ? nextWeekdayDate(weekday) : null
}

function normalizeTaskDeadline(value: unknown) {
  const originalDueText = String(value || '').trim()
  if (!originalDueText) {
    return { due_date: null, due_date_calc: null, due_at: null, original_due_text: null }
  }

  const date = parseDeadlineDate(originalDueText)
  if (!date) {
    return { due_date: originalDueText, due_date_calc: null, due_at: null, original_due_text: originalDueText }
  }

  const dueAt = applyDeadlineTime(date, parseTime(originalDueText))
  const dueDateCalc = dueAt.toISOString().slice(0, 10)
  return {
    due_date: dueDateCalc,
    due_date_calc: dueDateCalc,
    due_at: dueAt.toISOString(),
    original_due_text: originalDueText,
  }
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
        tag: { type: 'string', description: 'Short tag like the class name or club' },
        due_date: { type: 'string', description: 'Natural language due date: today, tomorrow, Friday, next class, etc.' },
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
    supabase.from('clubs').select('name, role, next_meeting, club_tasks(task_text, done)').order('display_order'),
    supabase.from('settings').select('first_day, first_day_type, a_schedule, b_schedule, cape_fear_classes').order('created_at', { ascending: false }).limit(1),
  ])

  const tasks = tasksRes.data ?? []
  const grades = gradesRes.data ?? []
  const emails = emailsRes.data ?? []
  const clubs = clubsRes.data ?? []
  const settings = settingsRes.data?.[0]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const context = `
Today is ${today}.

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

Be conversational, concise, and genuinely helpful. Use short sentences. When listing things, use bullet points. Speak like a knowledgeable friend — not a formal assistant.

IMPORTANT: When the user asks you to add a task, create a reminder, or "note" something — you MUST call the create_task tool to actually save it. When they say something is done or finished, call mark_task_done. Never claim you've done something without calling the tool.

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
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
        const title = sentenceCaseTaskTitle(input.title) || 'Untitled task'
        const deadline = normalizeTaskDeadline(input.due_date)
        const { error } = await supabase.from('tasks').insert({
          title,
          category: (input.category as string) || 'Personal',
          tag: normalizeClassLabel(input.tag),
          ...deadline,
          priority: (input.priority as boolean) || false,
          priority_rank: input.priority ? (count || 0) + 1 : null,
          source: 'Ask Clark',
        })
        result = error ? `Error creating task: ${error.message}` : `Task "${title}" added successfully.`
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
