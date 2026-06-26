import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { code, redirect_uri } = await req.json()

  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!

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
      scope: 'https://graph.microsoft.com/Mail.Read offline_access User.Read',
    }),
  })

  const tokens = await tokenRes.json()
  if (tokens.error) {
    return new Response(
      JSON.stringify({ error: tokens.error_description || tokens.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Upsert into settings — get existing row first
  const { data: existing } = await supabase.from('settings').select('id').limit(1).single()

  if (existing) {
    await supabase.from('settings').update({
      microsoft_access_token: tokens.access_token,
      microsoft_refresh_token: tokens.refresh_token,
      microsoft_token_expiry: expiry,
    }).eq('id', existing.id)
  } else {
    await supabase.from('settings').insert({
      microsoft_access_token: tokens.access_token,
      microsoft_refresh_token: tokens.refresh_token,
      microsoft_token_expiry: expiry,
      first_day_type: 'A',
      no_school_dates: [],
      a_schedule: [],
      b_schedule: [],
      cape_fear_classes: [],
    })
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
