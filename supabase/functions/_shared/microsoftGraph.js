// Shared Microsoft Graph OAuth plumbing — the token-refresh logic used to
// live only inside sync-outlook; centralized here so sync-todo (and any
// future Graph-backed function) reuses it instead of copy-pasting a third
// time. Also the single source of truth for the requested scope string,
// which must match what the frontend requests during the authorize step.
export const GRAPH_SCOPE = 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Tasks.ReadWrite offline_access User.Read'

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

/**
 * Exchanges a refresh token for a new access token and persists the new
 * tokens on the settings row. Throws with Microsoft's own error description
 * on failure so callers can surface a real diagnostic instead of a generic
 * "something went wrong".
 */
async function refreshAccessToken(supabase, refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID'),
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: GRAPH_SCOPE,
    }),
  })

  const tokens = await res.json()
  if (tokens.error) {
    console.error('Microsoft token refresh failed:', tokens.error, tokens.error_description)
    throw new Error(tokens.error_description || tokens.error)
  }

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const { data: existing } = await supabase.from('settings').select('id').order('created_at', { ascending: false }).limit(1).single()

  if (existing) {
    await supabase.from('settings').update({
      microsoft_access_token: tokens.access_token,
      microsoft_refresh_token: tokens.refresh_token ?? refreshToken,
      microsoft_token_expiry: expiry,
    }).eq('id', existing.id)
  }

  return tokens.access_token
}

/**
 * Returns a valid access token for the connected Microsoft account, given
 * a `settings` row already loaded by the caller (needs
 * microsoft_access_token/microsoft_refresh_token/microsoft_token_expiry).
 * Refreshes automatically if the token is missing or expiring within 5
 * minutes. Returns null if no account is connected.
 */
export async function getValidAccessToken(supabase, settings) {
  if (!settings?.microsoft_refresh_token) return null

  const expiresAt = settings.microsoft_token_expiry
    ? new Date(settings.microsoft_token_expiry).getTime()
    : 0

  if (!settings.microsoft_access_token || Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken(supabase, settings.microsoft_refresh_token)
  }

  return settings.microsoft_access_token
}
