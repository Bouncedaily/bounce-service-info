-- Run once in Supabase → SQL Editor AFTER deploying the sync-alerts function.
-- Checks every 30 minutes; it only emails when something newly breaks or recovers.
select cron.schedule('sync-alerts-30min', '7,37 * * * *', $$
  select net.http_post(
    url := 'https://fuslpeyhpmofzijrotkb.supabase.co/functions/v1/sync-alerts',
    headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000);
$$);
insert into public.sync_job_meta (jobname, label, description, alert_enabled, updated_by)
values ('sync-alerts-30min', 'Sync alert emails', 'Emails people with the Sync alerts role when a sync breaks or recovers', false, 'setup')
on conflict (jobname) do nothing;
