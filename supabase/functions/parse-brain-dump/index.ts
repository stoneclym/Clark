import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildScheduleContext, describeScheduleContext } from '../_shared/scheduleContext.js'
import { computeDeadline, TIME_PATTERN } from '../_shared/deadlineEngine.js'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { text } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Load grade rows and club rows so AI can match exactly, plus the settings
  // row so the deadline engine knows the A/B schedule.
  const [gradesResult, clubsResult, settingsResult] = await Promise.all([
    supabase.from('grades').select('id, class_name').order('class_order'),
    supabase.from('clubs').select('id, name').order('display_order'),
    supabase.from('settings').select('*').order('created_at', { ascending: false }).limit(1),
  ])
  const gradeRows = gradesResult.data
  const clubRows = (clubsResult.data ?? []) as Array<{ id: string; name: string }>
  const clubNames = clubRows.map(c => c.name)
  const classNames = FORMAL_GRADE_ORDER.join(' | ')
  const settings = settingsResult.data?.[0] ?? null
  const scheduleContext = describeScheduleContext(buildScheduleContext(settings))

  const SYSTEM = `You are Clark's brain-dump parser. The user speaks or types freely and you extract every action item.

Return ONLY valid JSON with this shape:
{
  "tasks": [
    { "title": string, "category": "Class"|"Club"|"College", "tag": string, "kind": "assignment"|"test"|"event", "due_date": string, "priority": boolean }
  ],
  "grades": [
    { "class_name": string, "percentage": string, "note": string|null }
  ],
  "club_tasks": [
    { "club_name": string, "task_text": string }
  ],
  "club_meetings": [
    { "club_name": string, "when": string }
  ]
}

Rules:
- "due_date" must quote the user's own scheduling words VERBATIM: "today", "next class", "before class", "Friday", "tomorrow at 4 PM". Do NOT calculate, reword, or resolve dates yourself — deterministic code computes the real date from your extraction.
- "kind" classifies the item: "test" for tests/quizzes/exams, "event" for things you attend at a set time, "assignment" for anything you produce or complete
- priority must be a boolean true or false, never a string
- Do not use status words like "overdue", "late", "today", "tomorrow", or "yesterday" as task tags. Tags are only for a class, club, or category.
- For grades: extract percentage grades only, not IB 1-7 scores. Use the closest class_name from this list: ${classNames}
- For club_meetings: use when the user announces a club meeting happening at a specific time ("NHS meeting tomorrow at 3:30", "Beta Club meets Friday", "We have a Spanish Club meeting next week"). "when" is the natural-language time. You MUST use the exact club_name from this list: ${clubNames.join(' | ')}
- For club_tasks: use when the user mentions something they need to DO for a club ("make slides for Spanish Club", "print forms for NHS"). You MUST use the exact club_name from this list: ${clubNames.join(' | ')}
- CRITICAL DISTINCTION: A meeting announcement (event on the calendar) → club_meetings. An action item to complete → club_tasks or tasks. NEVER create a generic task for a meeting announcement.
- Only include keys with items; omit empty arrays
- No markdown, no explanation — raw JSON only`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: scheduleContext ? `Schedule context (computed, read-only):\n${scheduleContext}\n\nBrain dump: ${text}` : text,
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
        const tag = taskTag(t.tag)
        const deadline = computeDeadline({
          kind: t.kind as string,
          dueText: enrichDueText(t.due_date, `${t.title || ''} ${text || ''}`),
          className: tag || String(t.tag || ''),
          title: String(t.title || ''),
        }, settings)
        return {
          title: sentenceCaseTaskTitle(t.title) || 'Untitled task',
          category: String(t.category || 'Class'),
          tag,
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

  // Insert club tasks — exact club_name match using pre-loaded club rows
  if (Array.isArray(parsed.club_tasks) && parsed.club_tasks.length) {
    for (const ct of parsed.club_tasks as Array<Record<string, unknown>>) {
      const clubName = String(ct.club_name || '').trim()
      const clubRow = clubRows.find(c => c.name === clubName)
      if (clubRow) {
        const { error: ctError } = await supabase.from('club_tasks')
          .insert({ club_id: clubRow.id, task_text: String(ct.task_text || '').trim() })
        if (ctError) dbErrors.push(`club_tasks(${clubName}): ${ctError.message}`)
      } else {
        dbErrors.push(`club_tasks: no club found matching "${clubName}"`)
      }
    }
  }

  // Update club next_meeting — exact club_name match
  if (Array.isArray(parsed.club_meetings) && parsed.club_meetings.length) {
    for (const cm of parsed.club_meetings as Array<Record<string, unknown>>) {
      const clubName = String(cm.club_name || '').trim()
      const when = String(cm.when || '').trim()
      if (!clubName || !when) continue

      const { error: cmError } = await supabase
        .from('clubs')
        .update({ next_meeting: when })
        .eq('name', clubName)

      if (cmError) dbErrors.push(`club_meetings(${clubName}): ${cmError.message}`)
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
