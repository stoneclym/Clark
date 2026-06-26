import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID')!,
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.Read offline_access User.Read',
    }),
  })

  const tokens = await res.json()
  if (tokens.error) throw new Error(tokens.error_description || tokens.error)

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const { data: existing } = await supabase.from('settings').select('id').limit(1).single()

  if (existing) {
    await supabase.from('settings').update({
      microsoft_access_token: tokens.access_token,
      microsoft_refresh_token: tokens.refresh_token ?? refreshToken,
      microsoft_token_expiry: expiry,
    }).eq('id', existing.id)
  }

  return tokens.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Load tokens from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry')
    .limit(1)
    .single()

  if (!settings?.microsoft_refresh_token) {
    return new Response(
      JSON.stringify({ error: 'Outlook not connected. Complete setup first.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Refresh token if expired or expiring within 5 minutes
  let accessToken = settings.microsoft_access_token
  const expiresAt = settings.microsoft_token_expiry
    ? new Date(settings.microsoft_token_expiry).getTime()
    : 0

  if (!accessToken || Date.now() > expiresAt - 5 * 60 * 1000) {
    accessToken = await refreshAccessToken(settings.microsoft_refresh_token)
  }

  // Fetch recent inbox messages from Microsoft Graph
  const graphRes = await fetch(
    'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages' +
    '?$select=id,subject,from,receivedDateTime,bodyPreview,body,isRead' +
    '&$orderby=receivedDateTime desc' +
    '&$top=25',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!graphRes.ok) {
    const err = await graphRes.text()
    return new Response(
      JSON.stringify({ error: 'Microsoft Graph error', detail: err }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { value: messages } = await graphRes.json()

  // Map Graph messages → emails table rows
  const rows = messages.map((m: Record<string, unknown>) => {
    const from = m.from as { emailAddress: { name: string; address: string } }
    const body = m.body as { content: string; contentType: string }
    const name = from?.emailAddress?.name || from?.emailAddress?.address || 'Unknown'
    const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

    return {
      external_id: m.id as string,
      from_name: name,
      from_email: from?.emailAddress?.address || null,
      initials,
      received_at: m.receivedDateTime as string,
      subject: m.subject as string || '(no subject)',
      snippet: (m.bodyPreview as string || '').slice(0, 300),
      full_content: body?.content || null,
      headers_cleaned: true,
    }
  })

  // Upsert — deduplicate by external_id
  const { error } = await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ synced: rows.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
