-- Store which Microsoft account is connected, so Settings can show
-- "Connected as {email}" instead of just a boolean.
alter table settings
  add column if not exists microsoft_account_email text;
