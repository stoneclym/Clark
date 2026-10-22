// Shared Microsoft OAuth constants/helpers — used by SettingsScreen (reconnect)
// and SetupScreen (first-time connect). One client ID, one scope string, one
// authorize-URL builder, so a scope change (e.g. adding Tasks.ReadWrite for
// Microsoft To Do) only needs to happen here.
export const MICROSOFT_CLIENT_ID = 'c92f4bf4-9da6-4d38-b49d-715a2bee4beb'

export const MICROSOFT_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Tasks.ReadWrite',
  'offline_access',
  'User.Read',
].join(' ')

/** Redirects the browser to Microsoft's authorize endpoint. */
export function redirectToMicrosoftAuthorize() {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: window.location.origin,
    scope: MICROSOFT_SCOPES,
    state: 'outlook_auth',
    response_mode: 'query',
  })
  window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}
