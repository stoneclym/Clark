import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM = `You are Clark's brain-dump parser. The user speaks or types freely and you extract every action item.

Return ONLY valid JSON with this shape:
{
  "tasks": [
    { "title": string, "category": "Class"|"Club"|"College", "tag": string, "due_date": string, "priority": boolean, "source": string }
  ],
  "grades": [
    { "class_name": string, "score": string, "percentage": string|null, "note": string|null }
  ],
  "club_tasks": [
    { "club_name": string, "task_text": string }
  ],
  "reminders": [
    { "title": string, "due_date": string }
  ]
}

Rules:
- "due_date" can be natural language: "today", "next class", "Friday", "tomorrow at 4 PM"
- For grades: score is IB 1-7 or letter; match class names to known classes
- For club tasks: match club_name to one of: National Honor Society, Beta Club, Spanish Club, Senior Class
- Only include categories with items; omit empty arrays
- No markdown, no explanation — raw JSON only`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { text, schedule_context } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: schedule_context
          ? `Schedule context: ${schedule_context}\n\nBrain dump: ${text}`
          : text,
      },
    ],
  })

  let rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  // Strip markdown code fences that models sometimes add despite instructions
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
        title: String(t.title || '').trim() || 'Untitled task',
        category: t.category || 'Class',
        tag: t.tag || null,
        due_date: t.due_date || null,
        priority: t.priority === true,
        priority_rank: t.priority === true ? baseRank + i : null,
        source: 'Brain Dump',
      }))
    )
    if (taskError) dbErrors.push(`tasks: ${taskError.message}`)
  }

  // Update grades
  if (Array.isArray(parsed.grades) && parsed.grades.length) {
    for (const g of parsed.grades as Array<Record<string, unknown>>) {
      const { error: gradeError } = await supabase
        .from('grades')
        .update({ score: g.score, percentage: g.percentage, note: g.note, last_updated: new Date().toISOString() })
        .ilike('class_name', `%${(g.class_name as string).split(' ')[0]}%`)
      if (gradeError) dbErrors.push(`grades: ${gradeError.message}`)
    }
  }

  // Insert club tasks
  if (Array.isArray(parsed.club_tasks) && parsed.club_tasks.length) {
    for (const ct of parsed.club_tasks as Array<Record<string, unknown>>) {
      const { data: clubs } = await supabase.from('clubs').select('id')
        .ilike('name', `%${(ct.club_name as string).split(' ')[0]}%`).limit(1)
      if (clubs && clubs.length > 0) {
        const { error: ctError } = await supabase.from('club_tasks').insert({ club_id: clubs[0].id, task_text: ct.task_text })
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
