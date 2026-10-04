// Slack Events API endpoint: @WHAT mentions become alerts.
import { admin, appUrl, today } from '../_shared/env.ts';
import { parseWithClaude } from '../_shared/claude.ts';
import { cleanSlackText, parseAlertText } from '../_shared/parse.ts';
import { fetchMessageText, postMessage, slackEscape, verifySlackSignature } from '../_shared/slack.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const HELP = [
  'Tag me with a short description and I will add it to the WHAT dashboard, for example:',
  '`@WHAT Acme Coffee – impersonator on Instagram, high – fake @acme.official copying our logo`',
  'Or reply to any message in a thread with just `@WHAT` to turn that message into an alert.',
  'I look for the customer, type (impersonator / comments / security), severity and platform.',
].join('\n');

async function handleMention(event: Record<string, any>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN')!;
  const channel: string = event.channel;
  const replyThread: string = event.thread_ts ?? event.ts;
  const reply = (text: string) => postMessage(token, { channel, text, thread_ts: replyThread });

  const allowed = (Deno.env.get('SLACK_ALLOWED_CHANNELS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(channel)) return;

  let text = cleanSlackText(event.text ?? '');
  // "@WHAT" alone inside a thread → use the thread's parent message as the alert text.
  if (!text && event.thread_ts && event.thread_ts !== event.ts) {
    text = cleanSlackText(await fetchMessageText(token, channel, event.thread_ts).catch(() => ''));
  }
  if (!text || text.toLowerCase() === 'help') { await reply(HELP); return; }

  const ai = await parseWithClaude(text);
  const parsed = parseAlertText(text);
  const alert = ai ? { ...ai, notes: parsed.notes } : parsed;

  const { error } = await admin().from('alerts').insert({
    customer: alert.customer,
    type: alert.type,
    severity: alert.severity,
    platform: alert.platform,
    notes: alert.notes,
    status: 'New',
    alert_date: today(),
    source: 'slack',
    slack_channel: channel,
    slack_ts: event.ts,
    slack_thread_ts: replyThread,
  });
  if (error) {
    if (error.code === '23505') return; // already created from this message (Slack retry)
    console.error('insert failed', error);
    await reply(':x: Sorry, I could not save that alert. Please try again or add it in the dashboard.');
    return;
  }

  const meta = [alert.type, alert.severity, alert.platform].filter(Boolean).map(slackEscape).join(' · ');
  const url = appUrl();
  await reply(`:white_check_mark: Alert added – *${slackEscape(alert.customer || 'Untitled')}* · ${meta}${url ? `\n<${url}|Open in WHAT>` : ''}`);
}

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verifySlackSignature(Deno.env.get('SLACK_SIGNING_SECRET') ?? '', req.headers, raw))) {
    return new Response('invalid signature', { status: 401 });
  }
  const body = JSON.parse(raw);

  if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });

  // Slack re-sends events it thinks timed out; we always ack immediately, so ignore retries.
  if (req.headers.get('x-slack-retry-num')) return new Response('ok');

  const event = body.event;
  if (body.type === 'event_callback' && event?.type === 'app_mention' && !event.bot_id && !event.subtype) {
    EdgeRuntime.waitUntil(handleMention(event).catch((err) => console.error('handleMention failed', err)));
  }
  return new Response('ok');
});
