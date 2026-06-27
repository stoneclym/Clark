import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  return title
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
  const copy = new Date(date)
  const applied = time || { hours: 23, minutes: 59 }
  copy.setHours(applied.hours, applied.minutes, 0, 0)
  return copy
}

function nextWeekdayDate(dayName: string) {
  const targetDay = WEEKDAYS[dayName]
  if (targetDay == null) return null
  const date = new Date()
  const diff = (targetDay - date.getDay() + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

function parseDeadlineDate(value: string) {
  const text = value.trim()
  const lower = text.toLowerCase()

  const relative = lower.replace(/\s+at\s+.*$/i, '')
  if (['yesterday', 'today', 'tomorrow'].includes(relative)) {
    const date = new Date()
    if (relative === 'yesterday') date.setDate(date.getDate() - 1)
    if (relative === 'tomorrow') date.setDate(date.getDate() + 1)
    return date
  }

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|\s)/)
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))

  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\b|\s)/)
  if (slashDate) {
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3])
    return new Date(year, Number(slashDate[1]) - 1, Number(slashDate[2]))
  }

  if (MONTH_NAME_PATTERN.test(text) && /\d{1,2}/.test(text) && /\d{4}/.test(text)) {
    const dateText = text.replace(/\s+at\s+.*$/i, '')
    const date = new Date(dateText)
    return Number.isNaN(date.getTime()) ? null : date
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

const FORMAL_GRADE_NAMES: Record<string, string> = {
  'ib history of the americas': 'IB History of the Americas',
  'history of the americas': 'IB History of the Americas',
  hota: 'IB History of the Americas',
  'ib biology': 'IB Biology',
  'ib biology hl': 'IB Biology',
  'biology hl': 'IB Biology',
  biology: 'IB Biology',
  bio: 'IB Biology',
  'ib theory of knowledge': 'IB Theory of Knowledge',
  'theory of knowledge': 'IB Theory of Knowledge',
  tok: 'IB Theory of Knowledge',
  'ib english: language and literature': 'IB Language and Literature',
  'ib english: lang and lit': 'IB Language and Literature',
  'ib english language and literature': 'IB Language and Literature',
  'ib english lang lit': 'IB Language and Literature',
  'ib language and lit': 'IB Language and Literature',
  'ib language and literature': 'IB Language and Literature',
  'language and lit': 'IB Language and Literature',
  'language and literature': 'IB Language and Literature',
  'ib math: applications and interpretations': 'IB Applications and Interpretations',
  'ib math applications and interpretations': 'IB Applications and Interpretations',
  'math: analysis and approaches': 'IB Applications and Interpretations',
  'math analysis and approaches': 'IB Applications and Interpretations',
  'ib applications and interpretations': 'IB Applications and Interpretations',
  'applications and interpretations': 'IB Applications and Interpretations',
}

const FORMAL_GRADE_ORDER = [
  'IB History of the Americas',
  'IB Biology',
  'IB Theory of Knowledge',
  'IB Language and Literature',
  'IB Applications and Interpretations',
]

function normalizeClassName(name: unknown) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
}

function formalGradeName(name: unknown) {
  return FORMAL_GRADE_NAMES[normalizeClassName(name)] || null
}

function gradePercentage(value: unknown) {
  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  return match ? match[0] : null
}

function taskTag(value: unknown) {
  const tag = String(value || '').trim()
  if (!tag) return null
  return /^(overdue|late|past due|past-due|yesterday|today|tomorrow)$/i.test(tag) ? null : tag
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { text, schedule_context } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Load actual grade rows, then give AI the formal display names Clark supports.
  const { data: gradeRows } = await supabase.from('grades').select('id, class_name').order('class_order')
  const classNames = FORMAL_GRADE_ORDER.join(' | ')

  const SYSTEM = `You are Clark's brain-dump parser. The user speaks or types freely and you extract every action item.

Return ONLY valid JSON with this shape:
{
  "tasks": [
    { "title": string, "category": "Class"|"Club"|"College", "tag": string, "due_date": string, "priority": boolean }
  ],
  "grades": [
    { "class_name": string, "percentage": string, "note": string|null }
  ],
  "club_tasks": [
    { "club_name": string, "task_text": string }
  ]
}

Rules:
- "due_date" can be natural language: "today", "next class", "Friday", "tomorrow at 4 PM"
- priority must be a boolean true or false, never a string
- Do not use status words like "overdue", "late", "today", "tomorrow", or "yesterday" as task tags. Tags are only for a class, club, or category.
- For grades: extract percentage grades only, not IB 1-7 scores. Use the closest class_name from this list: ${classNames}
- For club tasks: club_name must be one of: National Honor Society, Beta Club, Spanish Club, Senior Class
- Only include keys with items; omit empty arrays
- No markdown, no explanation — raw JSON only`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: schedule_context ? `Schedule context: ${schedule_context}\n\nBrain dump: ${text}` : text,
    }],
  })

  let rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw: rawText }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dbErrors: string[] = []

  // Insert tasks
  if (Array.isArray(parsed.tasks) && parsed.tasks.length) {
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
    const baseRank = (count || 0) + 1

    const { error: taskError } = await supabase.from('tasks').insert(
      (parsed.tasks as Array<Record<string, unknown>>).map((t, i) => {
        const deadline = normalizeTaskDeadline(t.due_date)
        return {
          title: sentenceCaseTaskTitle(t.title) || 'Untitled task',
          category: String(t.category || 'Class'),
          tag: taskTag(t.tag),
          ...deadline,
          priority: t.priority === true,
          priority_rank: t.priority === true ? baseRank + i : null,
          source: 'Brain Dump',
        }
      })
    )
    if (taskError) dbErrors.push(`tasks: ${taskError.message}`)
  }

  // Update or create grade rows using Clark's formal class-name mapping.
  if (Array.isArray(parsed.grades) && parsed.grades.length) {
    for (const g of parsed.grades as Array<Record<string, unknown>>) {
      const requestedClassName = String(g.class_name || '').trim()
      const className = formalGradeName(requestedClassName)
      if (!className) {
        dbErrors.push(`grades(${requestedClassName || 'unknown'}): class not recognized`)
        continue
      }

      const existingGrade = gradeRows?.find((row: Record<string, unknown>) =>
        formalGradeName(row.class_name) === className
      )
      const percentage = gradePercentage(g.percentage ?? g.score)
      const payload = {
        class_name: className,
        score: null,
        percentage,
        note: g.note ? String(g.note) : null,
        last_updated: new Date().toISOString(),
        is_placeholder: false,
        class_order: FORMAL_GRADE_ORDER.indexOf(className) + 1,
      }

      const { error: gradeError } = existingGrade
        ? await supabase.from('grades').update(payload).eq('id', existingGrade.id)
        : await supabase.from('grades').insert(payload)

      if (gradeError) dbErrors.push(`grades(${className}): ${gradeError.message}`)
    }
  }

  // Insert club tasks
  if (Array.isArray(parsed.club_tasks) && parsed.club_tasks.length) {
    for (const ct of parsed.club_tasks as Array<Record<string, unknown>>) {
      const { data: clubs } = await supabase.from('clubs').select('id')
        .ilike('name', `%${String(ct.club_name || '').split(' ')[0]}%`).limit(1)
      if (clubs && clubs.length > 0) {
        const { error: ctError } = await supabase.from('club_tasks')
          .insert({ club_id: clubs[0].id, task_text: ct.task_text })
        if (ctError) dbErrors.push(`club_tasks: ${ctError.message}`)
      }
    }
  }

  if (dbErrors.length > 0) {
    return new Response(
      JSON.stringify({ error: 'Some saves failed', details: dbErrors, parsed }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, parsed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
