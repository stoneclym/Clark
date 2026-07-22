import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase credentials not set — copy .env.local.example to .env.local and fill in values.')
}

export const supabase = createClient(url || '', key || '')

/**
 * supabase-js only gives a generic message for a non-2xx function response —
 * the real error string edge functions return in their JSON body lives on
 * `error.context`, a raw Response. Reads it, falling back to the generic
 * message if the body isn't JSON or there's no context (e.g. a network error).
 */
export async function invokeErrorMessage(error) {
  const detail = await error?.context?.json?.().catch(() => null)
  return detail?.error || error?.message || 'Something went wrong.'
}
