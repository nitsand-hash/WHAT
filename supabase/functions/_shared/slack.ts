// Slack helpers. Uses only Web APIs (fetch, crypto.subtle) so it also runs under Node for tests.

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies Slack's request signature (https://api.slack.com/authentication/verifying-requests-from-slack). */
export async function verifySlackSignature(
  signingSecret: string,
  headers: { get(name: string): string | null },
  rawBody: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const ts = headers.get('x-slack-request-timestamp');
  const sig = headers.get('x-slack-signature');
  if (!ts || !sig || !signingSecret) return false;
  if (Math.abs(nowSeconds - Number(ts)) > 60 * 5) return false; // replay protection
  const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`v0:${ts}:${rawBody}`));
  return timingSafeEqual(`v0=${toHex(mac)}`, sig);
}

/** Escape user-provided text for Slack mrkdwn. */
export const slackEscape = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function slackApi(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${method} failed: ${data.error}`);
  return data;
}

export const postMessage = (token: string, msg: { channel: string; text: string; thread_ts?: string }) =>
  slackApi(token, 'chat.postMessage', { ...msg, unfurl_links: false, unfurl_media: false });

/** Text of a single message (used when @WHAT is mentioned in a thread reply to tag the parent). */
export async function fetchMessageText(token: string, channel: string, ts: string): Promise<string> {
  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${encodeURIComponent(channel)}&latest=${encodeURIComponent(ts)}&inclusive=true&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack conversations.history failed: ${data.error}`);
  const m = data.messages?.[0];
  return m && m.ts === ts ? String(m.text ?? '') : '';
}
