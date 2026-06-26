import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase credentials not set — copy .env.local.example to .env.local and fill in values.')
}

export const supabase = createClient(url || '', key || '')
