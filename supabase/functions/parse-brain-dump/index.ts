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

function enrichDueText(dueDate: unknown, sourceText: unknown) {
  const due = String(dueDate || '').trim()
  const source = String(sourceText || '')
  if (!due) return due
  if (parseTime(due)) return due

  const escapedDue = due.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const dueWithTime = source.match(new RegExp(`\\b${escapedDue}\\s+(?:at\\s*)?\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)\\b`, 'i'))
  if (dueWithTime) return dueWithTime[0]

  return due
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

  if (parseTime(text) && /^(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)$/i.test(text)) {
    const now = new Date()
    return dateFromClarkParts(clarkYear(now), clarkMonth(now), clarkDay(now))
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
  if (!tag || /^(overdue|late|past due|past-due|yesterday|today|tomorrow)$/i.test(tag)) return null
  return normalizeClassLabel(tag)
}


type ActiveTask = {
  id: string
  title: string
  category: string | null
  tag: string | null
  due_date?: string | null
  due_at?: string | null
  done: boolean
}

const MATCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'already', 'complete', 'completed', 'did', 'do', 'done', 'finished',
  'for', 'i', 'just', 'my', 'oh', 'please', 'task', 'that', 'the', 'those', 'to', 'with',
])

function normalizeMatchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(?:oh\s+and\s+)?i\s+(?:already\s+|just\s+)?(?:did|finished|completed|complete)\b/g, ' ')
    .replace(/\b(?:mark|check)\s+(?:off|done|complete|completed)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchTokens(value: unknown) {
  return normalizeMatchText(value)
    .split(' ')
    .map(token => TASK_CLASS_TAGS[token] ? token : token)
    .filter(token => token && token.length > 1 && !MATCH_STOP_WORDS.has(token))
}

function uniqueTokens(value: unknown) {
  return [...new Set(matchTokens(value))]
}

function tokenOverlapScore(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0
  const bSet = new Set(b)
  const overlap = a.filter(token => bSet.has(token)).length
  return overlap / Math.min(a.length, b.length)
}

function completionTag(completion: Record<string, unknown>) {
  return taskTag(completion.tag) || normalizeClassLabel(completion.class_name) || normalizeClassLabel(completion.category)
}

function completionCategory(completion: Record<string, unknown>) {
  const category = String(completion.category || '').trim()
  return category || null
}

function completionTitle(completion: Record<string, unknown>) {
  return String(completion.title || completion.task_title || completion.text || completion.description || '').trim()
}

function matchCompletionToActiveTask(completion: Record<string, unknown>, activeTasks: ActiveTask[]) {
  const targetTitle = completionTitle(completion)
  const targetTag = completionTag(completion)
  const targetCategory = completionCategory(completion)
  const targetTokens = uniqueTokens(targetTitle)

  if (!targetTokens.length) return { status: 'skipped', reason: 'missing completion title' }

  const ranked = activeTasks
    .filter(task => !task.done)
    .map(task => {
      const taskTokens = uniqueTokens(task.title)
      const titleScore = tokenOverlapScore(targetTokens, taskTokens)
      const tagMatches = targetTag && task.tag ? targetTag === task.tag : false
      const categoryMatches = targetCategory && task.category
        ? normalizeMatchText(targetCategory) === normalizeMatchText(task.category)
        : false
      const score = (titleScore * 0.78) + (tagMatches ? 0.18 : 0) + (categoryMatches ? 0.04 : 0)
      return { task, score, titleScore, tagMatches, categoryMatches }
    })
    .filter(match => match.score >= 0.72 && match.titleScore >= 0.5)
    .sort((a, b) => b.score - a.score)

  if (!ranked.length) return { status: 'skipped', reason: 'no confident active task match' }

  const [best, second] = ranked
  if (second && best.score - second.score < 0.15) {
    return {
      status: 'ambiguous',
      reason: 'multiple active tasks matched completion language',
      matches: ranked.slice(0, 3).map(match => ({ id: match.task.id, title: match.task.title, score: Number(match.score.toFixed(3)) })),
    }
  }

  const isShortGenericTarget = targetTokens.length < 2 && !targetTag && !targetCategory
  if (isShortGenericTarget && best.score < 0.95) {
    return { status: 'skipped', reason: 'completion target too generic' }
  }

  return {
    status: 'matched',
    task: best.task,
    score: Number(best.score.toFixed(3)),
  }
}

function isDuplicateCompletionTask(task: Record<string, unknown>, completions: Array<Record<string, unknown>>) {
  const titleTokens = uniqueTokens(task.title)
  if (!titleTokens.length) return false

  return completions.some(completion => {
    const completionTokens = uniqueTokens(completionTitle(completion))
    if (!completionTokens.length) return false
    const overlap = tokenOverlapScore(titleTokens, completionTokens)
    const taskClassTag = taskTag(task.tag) || normalizeClassLabel(task.category)
    const completedClassTag = completionTag(completion)
    return overlap >= 0.75 && (!taskClassTag || !completedClassTag || taskClassTag === completedClassTag)
  })
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
  ],
  "completed_tasks": [
    { "title": string, "class_name": string|null, "category": string|null, "tag": string|null }
  ]
}

Rules:
- "due_date" can be natural language: "today", "next class", "Friday", "tomorrow at 4 PM"
- priority must be a boolean true or false, never a string
- Do not use status words like "overdue", "late", "today", "tomorrow", or "yesterday" as task tags. Tags are only for a class, club, or category.
- For grades: extract percentage grades only, not IB 1-7 scores. Use the closest class_name from this list: ${classNames}
- For club tasks: club_name must be one of: National Honor Society, Beta Club, Spanish Club, Senior Class
- Completion language such as "I did X", "I finished X", "I completed X", "Oh and I did X", or "I already finished X" must go in completed_tasks, not tasks.
- completed_tasks.title should be the existing task being completed, without words like "I finished" or "I did". Include class_name/tag/category when the user says or implies one.
- Never create a new task for completion language.
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
  const completionResults: Array<Record<string, unknown>> = []
  const parsedCompletions = Array.isArray(parsed.completed_tasks)
    ? parsed.completed_tasks as Array<Record<string, unknown>>
    : []

  // Complete existing active tasks before inserting anything new. Completion language should not create duplicates.
  if (parsedCompletions.length) {
    const { data: activeTasks, error: activeTaskError } = await supabase
      .from('tasks')
      .select('id, title, category, tag, due_date, due_at, done')
      .eq('done', false)

    if (activeTaskError) {
      dbErrors.push(`completed_tasks: ${activeTaskError.message}`)
    } else {
      for (const completion of parsedCompletions) {
        const match = matchCompletionToActiveTask(completion, (activeTasks || []) as ActiveTask[])
        const result: Record<string, unknown> = {
          title: completionTitle(completion),
          status: match.status,
        }

        if (match.status === 'matched' && 'task' in match) {
          const { data: completedRows, error: completeError } = await supabase
            .from('tasks')
            .update({ done: true })
            .eq('id', match.task.id)
            .eq('done', false)
            .select('id')

          if (completeError) {
            dbErrors.push(`completed_tasks(${match.task.title}): ${completeError.message}`)
            result.status = 'error'
          } else if (!completedRows?.length) {
            result.status = 'skipped'
            result.reason = 'task was already completed or no longer active'
          } else {
            result.completed_task_id = match.task.id
            result.completed_task_title = match.task.title
            result.score = match.score
          }
        } else {
          Object.assign(result, match)
        }

        completionResults.push(result)
      }
    }
  }

  if (completionResults.length) parsed.completed_task_results = completionResults

  // Insert tasks
  const tasksToInsert = Array.isArray(parsed.tasks)
    ? (parsed.tasks as Array<Record<string, unknown>>).filter(task => !isDuplicateCompletionTask(task, parsedCompletions))
    : []

  if (tasksToInsert.length) {
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
    const baseRank = (count || 0) + 1

    const { error: taskError } = await supabase.from('tasks').insert(
      tasksToInsert.map((t, i) => {
        const deadline = normalizeTaskDeadline(enrichDueText(t.due_date, `${t.title || ''} ${text || ''}`))
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
