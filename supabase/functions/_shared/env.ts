import { createClient } from 'npm:@supabase/supabase-js@2';

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/** Today's date (YYYY-MM-DD) in the team's timezone. */
export function today(): string {
  const tz = Deno.env.get('WHAT_TIMEZONE') ?? 'Asia/Jerusalem';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

export const appUrl = () => Deno.env.get('APP_URL') ?? '';

/** Constant-ish time check of the shared secret used by DB webhooks and cron. */
export function hasValidWebhookSecret(req: Request): boolean {
  const expected = Deno.env.get('WEBHOOK_SECRET');
  const got = req.headers.get('x-webhook-secret') ?? '';
  if (!expected || got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
