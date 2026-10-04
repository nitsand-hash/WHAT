-- WHAT – shared data model for the dashboard + Slack integration.

-- Who may use the dashboard. Add teammates with:
--   insert into public.team_members (email) values ('name@company.com');
create table public.team_members (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_team_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  customer text not null default '',
  type text not null default 'Other'
    check (type in ('Impersonator', 'Comment moderation', 'Account security', 'Other')),
  severity text not null default 'Medium'
    check (severity in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'New'
    check (status in ('New', 'In progress', 'Resolved')),
  platform text not null default ''
    check (platform in ('', 'Instagram', 'Facebook', 'TikTok', 'X', 'YouTube', 'LinkedIn', 'Other')),
  notes text not null default '',
  alert_date date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  source text not null default 'app' check (source in ('app', 'slack')),
  slack_channel text,
  slack_ts text,
  slack_thread_ts text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A Slack message can only ever create one alert (Slack retries deliveries).
create unique index alerts_slack_message_uniq
  on public.alerts (slack_channel, slack_ts) where slack_ts is not null;
create index alerts_date_idx on public.alerts (alert_date);

create table public.day_notes (
  note_date date primary key,
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger alerts_touch before update on public.alerts
  for each row execute function public.touch_updated_at();
create trigger day_notes_touch before update on public.day_notes
  for each row execute function public.touch_updated_at();

-- Row level security: only listed team members can read or write.
-- (Edge Functions use the service role key, which bypasses RLS.)
alter table public.team_members enable row level security;
alter table public.alerts enable row level security;
alter table public.day_notes enable row level security;

create policy "team can read alerts" on public.alerts
  for select to authenticated using (public.is_team_member());
create policy "team can insert alerts" on public.alerts
  for insert to authenticated with check (public.is_team_member());
create policy "team can update alerts" on public.alerts
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "team can delete alerts" on public.alerts
  for delete to authenticated using (public.is_team_member());

create policy "team can read notes" on public.day_notes
  for select to authenticated using (public.is_team_member());
create policy "team can insert notes" on public.day_notes
  for insert to authenticated with check (public.is_team_member());
create policy "team can update notes" on public.day_notes
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "team can delete notes" on public.day_notes
  for delete to authenticated using (public.is_team_member());

-- Let the dashboard see changes (including ones made from Slack) live.
alter publication supabase_realtime add table public.alerts, public.day_notes;
