-- Every minute, call the app's email dispatcher. The shared secret lives in Supabase Vault
-- (created once with: select vault.create_secret('<CRON_SECRET>', 'cron_secret');).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-due-emails',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://v-spark-2026-beryl.vercel.app/api/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
