/**
 * Clark's build version — the single source of truth for what's shown in Settings.
 *
 * Format: YY.RR.PP
 *   YY — two-digit calendar year of the release  (26 = 2026)
 *   RR — release number within that year, from 01
 *   PP — bug-fix number within that release, from 01
 *
 * Bump PP for a bug-fix pass, RR for a new feature release (resetting PP to 01),
 * and YY at the first release of a new year (resetting RR and PP to 01).
 */
export const APP_VERSION = '26.01.01'
