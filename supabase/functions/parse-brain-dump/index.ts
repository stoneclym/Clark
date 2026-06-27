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

function normalizedRelativeDate(value: unknown) {
  const text = String(value || '').trim().toLowerCase()
  if (!['yesterday', 'today', 'tomorrow'].includes(text)) {
    return value ? String(value) : null
  }

  const date = new Date()
  if (text === 'yesterday') date.setDate(date.getDate() - 1)
  if (text === 'tomorrow') date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
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
      (parsed.tasks as Array<Record<string, unknown>>).map((t, i) => ({
        title: sentenceCaseTaskTitle(t.title) || 'Untitled task',
        category: String(t.category || 'Class'),
        tag: taskTag(t.tag),
        due_date: normalizedRelativeDate(t.due_date),
        priority: t.priority === true,
        priority_rank: t.priority === true ? baseRank + i : null,
        source: 'Brain Dump',
      }))
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
