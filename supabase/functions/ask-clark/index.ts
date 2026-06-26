import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

Deno.serve(async (req) => {
  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Gather all context in parallel
  const [tasksRes, gradesRes, emailsRes, clubsRes, settingsRes] = await Promise.all([
    supabase.from('tasks').select('title, category, tag, due_date, priority, done').eq('done', false).limit(30),
    supabase.from('grades').select('class_name, score, percentage, note').order('class_order'),
    supabase.from('emails').select('from_name, subject, snippet, received_at').order('received_at', { ascending: false }).limit(5),
    supabase.from('clubs').select('name, role, next_meeting, club_tasks(task_text, done)').order('display_order'),
    supabase.from('settings').select('first_day, first_day_type, a_schedule, b_schedule, cape_fear_classes').limit(1).single(),
  ])

  const tasks = tasksRes.data ?? []
  const grades = gradesRes.data ?? []
  const emails = emailsRes.data ?? []
  const clubs = clubsRes.data ?? []
  const settings = settingsRes.data

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const context = `
Today is ${today}.

PENDING TASKS (${tasks.length}):
${tasks.map(t => `- ${t.title} [${t.tag || t.category}] due ${t.due_date || 'no date'}${t.priority ? ' ★ priority' : ''}`).join('\n') || 'None'}

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

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You are Clark, a smart personal assistant for a high school senior who is an IB student and multi-club leader. You know their schedule, tasks, grades, inbox, and clubs.

Be conversational, concise, and genuinely helpful. Use short sentences. When listing things, use bullet points. You can suggest adding tasks, note urgent deadlines, and give direct advice. Speak like a knowledgeable friend — not a formal assistant.

Current context:
${context}`,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  return new Response(JSON.stringify({ text }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
