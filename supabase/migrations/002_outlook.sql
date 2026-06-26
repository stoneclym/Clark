-- Add Microsoft OAuth token storage to settings
alter table settings
  add column if not exists microsoft_access_token text,
  add column if not exists microsoft_refresh_token text,
  add column if not exists microsoft_token_expiry timestamptz;

-- Add external_id to emails for deduplication against Microsoft Graph message IDs
alter table emails
  add column if not exists external_id text unique;
