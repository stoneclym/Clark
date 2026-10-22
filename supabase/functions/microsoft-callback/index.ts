import { createClient } from 'npm:@supabase/supabase-js@2'
import { GRAPH_SCOPE } from '../_shared/microsoftGraph.js'

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

  const { code, redirect_uri } = await req.json()

  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    console.error('microsoft-callback: MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET not set as Supabase secrets')
    return new Response(
      JSON.stringify({ error: 'Server is not configured for Microsoft sign-in (missing client id/secret).' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Exchange auth code for access + refresh tokens
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri,
      grant_type: 'authorization_code',
      scope: GRAPH_SCOPE,
    }),
  })

  const tokens = await tokenRes.json()
  if (tokens.error) {
    console.error('microsoft-callback: token exchange failed:', tokens.error, tokens.error_description)
    return new Response(
      JSON.stringify({ error: tokens.error_description || tokens.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Fetch the connected account's identity so Settings can show who's connected
  let accountEmail: string | null = null
  try {
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (meRes.ok) {
      const me = await meRes.json()
      accountEmail = me.mail || me.userPrincipalName || null
    }
  } catch (err) {
    console.error('microsoft-callback: failed to fetch /me:', err)
  }

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { data: existing } = await supabase.from('settings').select('id').order('created_at', { ascending: false }).limit(1).single()

  const tokenFields = {
    microsoft_access_token: tokens.access_token,
    microsoft_refresh_token: tokens.refresh_token,
    microsoft_token_expiry: expiry,
    microsoft_account_email: accountEmail,
  }

  const { error: dbError } = existing
    ? await supabase.from('settings').update(tokenFields).eq('id', existing.id)
    : await supabase.from('settings').insert({
        ...tokenFields,
        first_day_type: 'A',
        no_school_dates: [],
        a_schedule: [],
        b_schedule: [],
        cape_fear_classes: [],
      })

  if (dbError) {
    console.error('microsoft-callback: failed to save tokens:', dbError.message)
    return new Response(
      JSON.stringify({ error: 'Connected to Microsoft, but failed to save the connection. Try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, account_email: accountEmail }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
