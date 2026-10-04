-- Run ONCE in the Supabase SQL editor, after the Edge Functions are deployed.
-- Replace <PROJECT_REF> (the xxxx in https://xxxx.supabase.co) and <WEBHOOK_SECRET>
-- (any long random string - it must match the WEBHOOK_SECRET Edge Function secret).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 1) New / changed alerts -> slack-notify (High/Critical alerts, status changes)
create or replace function public.notify_slack()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/slack-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '<WEBHOOK_SECRET>'),
    body := jsonb_build_object(
      'type', TG_OP,
      'record', to_jsonb(new),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end;
$$;
revoke all on function public.notify_slack() from public, anon, authenticated;

drop trigger if exists alerts_notify_slack on public.alerts;
create trigger alerts_notify_slack
  after insert or update on public.alerts
  for each row execute function public.notify_slack();

-- 2) Daily summary, Sunday-Thursday. pg_cron runs in UTC:
--    15:00 UTC = 18:00 in Israel during summer time (IDT); use 16:00 UTC in winter (IST).
select cron.schedule(
  'what-daily-summary',
  '0 15 * * 0-4',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/slack-daily-summary',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '<WEBHOOK_SECRET>'),
       body := '{}'::jsonb
     ) $$
);

-- To change or remove the schedule later:
--   select cron.unschedule('what-daily-summary');
