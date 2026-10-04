import { slackEscape } from './slack.ts';

export interface AlertRow {
  id: string;
  customer: string;
  type: string;
  severity: string;
  status: string;
  platform: string;
  notes: string;
  source: string;
  slack_channel: string | null;
  slack_ts: string | null;
  slack_thread_ts: string | null;
}

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: AlertRow | null;
  old_record: Partial<AlertRow> | null;
}

export interface Outgoing {
  channel: string;
  text: string;
  thread_ts?: string;
}

const label = (a: AlertRow) => `*${slackEscape(a.customer || 'Untitled')}*`;
const meta = (a: AlertRow) => [a.type, a.severity, a.platform].filter(Boolean).map(slackEscape).join(' · ');
const link = (appUrl: string) => (appUrl ? `\n<${appUrl}|Open in WHAT>` : '');

/** Decide what (if anything) a database change should post to Slack. */
export function buildNotification(p: WebhookPayload, defaultChannel: string, appUrl: string): Outgoing | null {
  const a = p.record;
  if (!a) return null;

  if (p.type === 'INSERT') {
    // Alerts created from Slack already got a reply in their thread.
    if (a.source === 'slack') return null;
    if (a.severity !== 'High' && a.severity !== 'Critical') return null;
    if (!defaultChannel) return null;
    const icon = a.severity === 'Critical' ? ':rotating_light:' : ':warning:';
    const notes = a.notes ? `\n>${slackEscape(a.notes.slice(0, 300)).replace(/\n/g, '\n>')}` : '';
    return { channel: defaultChannel, text: `${icon} *New ${a.severity} alert* – ${label(a)} · ${meta(a)}${notes}${link(appUrl)}` };
  }

  if (p.type === 'UPDATE' && p.old_record && p.old_record.status !== undefined && p.old_record.status !== a.status) {
    if (a.status !== 'In progress' && a.status !== 'Resolved') return null;
    const icon = a.status === 'Resolved' ? ':white_check_mark:' : ':hourglass_flowing_sand:';
    const channel = a.slack_channel || defaultChannel;
    if (!channel) return null;
    const thread_ts = a.slack_channel ? a.slack_thread_ts || a.slack_ts || undefined : undefined;
    return { channel, thread_ts, text: `${icon} ${label(a)} (${meta(a)}) is now *${a.status}*${link(appUrl)}` };
  }

  return null;
}
