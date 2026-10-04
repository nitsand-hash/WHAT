import { slackEscape } from './slack.ts';
import type { AlertRow } from './notify.ts';

export interface Block {
  type: string;
  text?: string;
  checked?: boolean;
}

const SEVERITY_ICON: Record<string, string> = { Critical: ':red_circle:', High: ':large_orange_circle:', Medium: ':large_yellow_circle:', Low: ':white_circle:' };

function blocksToText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    const t = slackEscape((b.text ?? '').trim());
    switch (b.type) {
      case 'divider': break;
      case 'h1': case 'h2': if (t) lines.push(`*${t}*`); break;
      case 'bullet': if (t) lines.push(`• ${t}`); break;
      case 'todo': if (t) lines.push(`${b.checked ? ':ballot_box_with_check:' : ':white_large_square:'} ${t}`); break;
      case 'quote': if (t) lines.push(`>${t}`); break;
      case 'callout': if (t) lines.push(`:bulb: ${t}`); break;
      default: if (t) lines.push(t);
    }
  }
  return lines.join('\n');
}

/** Daily Slack post. Returns null when there is nothing to report. */
export function buildDailySummary(
  date: string,
  alerts: Pick<AlertRow, 'customer' | 'type' | 'severity' | 'status' | 'platform'>[],
  blocks: Block[],
  appUrl: string,
): string | null {
  const notes = blocksToText(blocks).slice(0, 2500);
  if (!alerts.length && !notes) return null;

  const count = (s: string) => alerts.filter((a) => a.status === s).length;
  const heading = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const out: string[] = [`:eyes: *What happened today – ${heading}*`];

  if (alerts.length) {
    out.push(`${alerts.length} alert${alerts.length === 1 ? '' : 's'}: ${count('New')} new · ${count('In progress')} in progress · ${count('Resolved')} resolved`);
    const open = alerts.filter((a) => a.status !== 'Resolved' && (a.severity === 'High' || a.severity === 'Critical'));
    if (open.length) {
      out.push('', '*Still open (High/Critical)*');
      for (const a of open) out.push(`${SEVERITY_ICON[a.severity] ?? ''} ${slackEscape(a.customer || 'Untitled')} – ${[a.type, a.platform, a.status].filter(Boolean).map(slackEscape).join(' · ')}`);
    }
    const types = ['Impersonator', 'Comment moderation', 'Account security', 'Other']
      .map((t) => [t, alerts.filter((a) => a.type === t).length] as const)
      .filter(([, n]) => n);
    if (types.length) out.push('', types.map(([t, n]) => `${n} ${t}`).join(' · '));
  }

  if (notes) out.push('', '*Notes*', notes);
  if (appUrl) out.push('', `<${appUrl}|Open in WHAT>`);
  return out.join('\n');
}
