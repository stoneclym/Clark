import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { emailId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: email } = await supabase
    .from('emails')
    .select('*')
    .eq('id', emailId)
    .single()

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, due_date, tag')
    .eq('done', false)
    .limit(20)

  const taskContext = tasks?.length
    ? `Current tasks: ${tasks.map((t: Record<string, unknown>) => `${t.title} (${t.due_date})`).join(', ')}`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `You are helping a high school senior (IB student, club leader) draft a brief, professional email reply.
Write a concise 2-4 sentence reply that's appropriate for a student talking to a teacher, counselor, or school administrator.
Be polite, direct, and specific. Do not include a subject line or greeting — just the body text starting from the first sentence.
${taskContext}`,
    messages: [
      {
        role: 'user',
        content: `Reply to this email:\n\nFrom: ${email.from_name}\nSubject: ${email.subject}\n\n${email.full_content || email.snippet}`,
      },
    ],
  })

  const draft = response.content[0].type === 'text' ? response.content[0].text : ''

  return new Response(JSON.stringify({ draft }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
