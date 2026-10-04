import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cleanSlackText, parseAlertText } from '../supabase/functions/_shared/parse.ts';
import { verifySlackSignature } from '../supabase/functions/_shared/slack.ts';
import { buildNotification, type AlertRow } from '../supabase/functions/_shared/notify.ts';
import { buildDailySummary } from '../supabase/functions/_shared/summary.ts';

const alert = (o: Partial<AlertRow> = {}): AlertRow => ({
  id: '1', customer: 'Acme Coffee', type: 'Impersonator', severity: 'High', status: 'New', platform: 'Instagram',
  notes: '', source: 'app', slack_channel: null, slack_ts: null, slack_thread_ts: null, ...o,
});

test('cleanSlackText strips mentions and unwraps links', () => {
  assert.equal(cleanSlackText('<@U123ABC> hi &amp; <https://x.com/a|link> <#C1|ops> <!here>'), 'hi & link (https://x.com/a) #ops');
});

test('parseAlertText: English free text', () => {
  const p = parseAlertText('<@U1> Acme Coffee – impersonator on Instagram, high – fake @acme.official copying our logo');
  assert.equal(p.customer, 'Acme Coffee');
  assert.equal(p.type, 'Impersonator');
  assert.equal(p.severity, 'High');
  assert.equal(p.platform, 'Instagram');
});

test('parseAlertText: explicit customer field wins', () => {
  const p = parseAlertText('Customer: Northwind Fitness, spam comments on facebook, medium');
  assert.equal(p.customer, 'Northwind Fitness');
  assert.equal(p.type, 'Comment moderation');
  assert.equal(p.platform, 'Facebook');
  assert.equal(p.severity, 'Medium');
});

test('parseAlertText: Hebrew', () => {
  const p = parseAlertText('לקוח: גלובקס, מתחזה באינסטגרם, קריטי');
  assert.equal(p.customer, 'גלובקס');
  assert.equal(p.type, 'Impersonator');
  assert.equal(p.platform, 'Instagram');
  assert.equal(p.severity, 'Critical');
});

test('parseAlertText: defaults when nothing matches', () => {
  const p = parseAlertText('something odd happened');
  assert.deepEqual([p.type, p.severity, p.platform], ['Other', 'Medium', '']);
});

test('parseAlertText: "low" inside another word is not a severity', () => {
  assert.equal(parseAlertText('followers dropped for Initech').severity, 'Medium');
});

test('verifySlackSignature accepts a valid signature and rejects tampering / replays', async () => {
  const secret = 'shh';
  const body = '{"type":"event_callback"}';
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex');
  const h = (s: string, t = ts) => new Map([['x-slack-request-timestamp', t], ['x-slack-signature', s]]) as unknown as { get(n: string): string | null };
  assert.equal(await verifySlackSignature(secret, h(sig), body), true);
  assert.equal(await verifySlackSignature(secret, h(sig), body + 'x'), false);
  assert.equal(await verifySlackSignature('other', h(sig), body), false);
  assert.equal(await verifySlackSignature(secret, h(sig, '1'), body), false);
});

test('notifications: new High alert from the app → default channel', () => {
  const n = buildNotification({ type: 'INSERT', record: alert(), old_record: null }, 'C0', 'https://app');
  assert.equal(n?.channel, 'C0');
  assert.match(n!.text, /New High alert/);
});

test('notifications: low severity and Slack-created alerts stay quiet', () => {
  assert.equal(buildNotification({ type: 'INSERT', record: alert({ severity: 'Low' }), old_record: null }, 'C0', ''), null);
  assert.equal(buildNotification({ type: 'INSERT', record: alert({ source: 'slack' }), old_record: null }, 'C0', ''), null);
});

test('notifications: status change replies in the original Slack thread', () => {
  const rec = alert({ status: 'Resolved', source: 'slack', slack_channel: 'C9', slack_ts: '1.1', slack_thread_ts: '1.0' });
  const n = buildNotification({ type: 'UPDATE', record: rec, old_record: { status: 'New' } }, 'C0', '');
  assert.deepEqual([n?.channel, n?.thread_ts], ['C9', '1.0']);
  assert.match(n!.text, /Resolved/);
});

test('notifications: unrelated updates (same status, or back to New) stay quiet', () => {
  assert.equal(buildNotification({ type: 'UPDATE', record: alert(), old_record: { status: 'New' } }, 'C0', ''), null);
  assert.equal(buildNotification({ type: 'UPDATE', record: alert({ status: 'New' }), old_record: { status: 'Resolved' } }, 'C0', ''), null);
});

test('notifications: Slack special characters are escaped', () => {
  const n = buildNotification({ type: 'INSERT', record: alert({ customer: 'A <!channel> & Co' }), old_record: null }, 'C0', '');
  assert.ok(!n!.text.includes('<!channel>'));
});

test('daily summary', () => {
  const text = buildDailySummary(
    '2026-10-04',
    [alert({ status: 'In progress', severity: 'Critical', customer: 'Globex' }), alert({ status: 'Resolved', severity: 'Low' })],
    [{ type: 'h2', text: 'Highlights' }, { type: 'todo', text: 'Call TikTok', checked: false }],
    'https://app',
  );
  assert.match(text!, /Sunday, October 4/);
  assert.match(text!, /2 alerts: 0 new · 1 in progress · 1 resolved/);
  assert.match(text!, /Still open[\s\S]*Globex/);
  assert.match(text!, /\*Highlights\*/);
  assert.equal(buildDailySummary('2026-10-04', [], [{ type: 'text', text: '' }], ''), null);
});
