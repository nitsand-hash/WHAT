// Called by a Supabase Database Webhook on alerts INSERT/UPDATE; posts to Slack when it matters.
import { hasValidWebhookSecret } from '../_shared/env.ts';
import { appUrl } from '../_shared/env.ts';
import { buildNotification, type WebhookPayload } from '../_shared/notify.ts';
import { postMessage } from '../_shared/slack.ts';

Deno.serve(async (req) => {
  if (!hasValidWebhookSecret(req)) return new Response('forbidden', { status: 403 });
  const payload = (await req.json()) as WebhookPayload;
  const msg = buildNotification(payload, Deno.env.get('SLACK_DEFAULT_CHANNEL') ?? '', appUrl());
  if (!msg) return Response.json({ posted: false });
  try {
    await postMessage(Deno.env.get('SLACK_BOT_TOKEN')!, msg);
    return Response.json({ posted: true });
  } catch (err) {
    console.error(err);
    return new Response('slack error', { status: 502 });
  }
});
