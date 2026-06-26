/**
 * Canvas LMS REST API client.
 * All requests go through a Supabase Edge Function to keep the token server-side.
 */

import { supabase } from './supabase.js'

/** Trigger a Canvas sync via Supabase Edge Function. */
export async function syncCanvas() {
  const { data, error } = await supabase.functions.invoke('canvas-sync')
  if (error) throw error
  return data
}
