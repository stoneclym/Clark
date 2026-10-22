/**
 * Frontend entry to the shared schedule context module.
 * The real logic lives in supabase/functions/_shared/scheduleContext.js so
 * the browser and the edge functions share one implementation.
 */
export * from '../../supabase/functions/_shared/scheduleContext.js'
