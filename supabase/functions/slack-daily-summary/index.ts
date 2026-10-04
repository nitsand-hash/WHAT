// Called on a schedule (pg_cron) to post the day's summary to Slack.
import { admin, appUrl, hasValidWebhookSecret, today } from '../_shared/env.ts';
import { buildDailySummary } from '../_shared/summary.ts';
import { postMessage } from '../_shared/slack.ts';

Deno.serve(async (req) => {
  if (!hasValidWebhookSecret(req)) return new Response('forbidden', { status: 403 });
  const channel = Deno.env.get('SLACK_DEFAULT_CHANNEL');
  if (!channel) return new Response('SLACK_DEFAULT_CHANNEL is not set', { status: 500 });

  const date = today();
  const db = admin();
  const [alerts, notes] = await Promise.all([
    db.from('alerts').select('customer,type,severity,status,platform').eq('alert_date', date).order('created_at'),
    db.from('day_notes').select('blocks').eq('note_date', date).maybeSingle(),
  ]);
  if (alerts.error || notes.error) {
    console.error(alerts.error ?? notes.error);
    return new Response('db error', { status: 500 });
  }

  const text = buildDailySummary(date, alerts.data ?? [], (notes.data?.blocks as []) ?? [], appUrl());
  if (!text) return Response.json({ posted: false, reason: 'nothing to report' });
  await postMessage(Deno.env.get('SLACK_BOT_TOKEN')!, { channel, text });
  return Response.json({ posted: true });
});
