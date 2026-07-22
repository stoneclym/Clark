alter table settings add column if not exists passcode_hash text;
update settings set passcode_hash = '792aeb5afe539c1134ce2e63c6a75f7cc602d7e502676945cfcca5f1954b69b3' where passcode_hash is null;
