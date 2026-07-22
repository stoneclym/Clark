import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken } from '../_shared/microsoftGraph.js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('id, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!settings?.microsoft_refresh_token) {
    return new Response(
      JSON.stringify({ error: 'Outlook not connected. Connect your Microsoft account in Settings first.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(supabase, settings)
  } catch (err) {
    console.error('sync-outlook: token refresh failed:', err)
    return new Response(
      JSON.stringify({ error: `Microsoft sign-in expired: ${err instanceof Error ? err.message : String(err)}. Reconnect in Settings.` }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
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
    console.error('sync-outlook: Graph mail fetch failed:', graphRes.status, err)
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
      is_read: (m.isRead as boolean) ?? false,
    }
  })

  // Upsert — deduplicate by external_id
  const { error } = await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false })

  if (error) {
    console.error('sync-outlook: failed to upsert emails:', error.message)
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
