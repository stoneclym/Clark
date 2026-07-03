import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildScheduleContext, describeScheduleContext, formatDate } from '../_shared/scheduleContext.js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [{ data: tasks }, { data: grades }, { data: settings }] = await Promise.all([
    supabase.from('tasks').select('*').eq('done', false).order('priority_rank'),
    supabase.from('grades').select('*').order('class_order'),
    supabase.from('settings').select('*').single(),
  ])

  const scheduleContext = buildScheduleContext(settings)

  const context = [
    `Today is ${formatDate()}.`,
    describeScheduleContext(scheduleContext),
    tasks?.length
      ? `Active tasks (priority order):\n${tasks.map((t: Record<string, unknown>) => `- ${t.title} (due: ${t.due_date}, source: ${t.source})`).join('\n')}`
      : 'No active tasks.',
    grades?.length
      ? `Current grades:\n${grades.map((g: Record<string, unknown>) => `- ${g.class_name}: ${g.score}${g.percentage ? ` (${g.percentage})` : ''}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: `You are Clark, a personal school dashboard assistant. Write a morning briefing for a high school senior managing IB classes, college applications, and four club leadership roles.

Write exactly 3-5 sentences in a warm, calm, well-organized voice — like a trusted assistant, not a chatbot. If today is a school day, start with the day type (A or B); otherwise acknowledge it's not a school day. Then cover the most time-sensitive items. End with an encouraging note about the day. Trust the schedule facts you are given — they are computed, not guessed.

Do NOT use bullet points, headers, or markdown. Plain prose only.`,
    messages: [{ role: 'user', content: context }],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  const { data: briefing } = await supabase
    .from('briefings')
    .insert({ content })
    .select()
    .single()

  return new Response(JSON.stringify(briefing), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
