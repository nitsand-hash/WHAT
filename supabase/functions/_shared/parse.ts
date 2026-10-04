// Pure helpers (no Deno APIs) so they can be unit-tested with Node.

export const TYPES = ['Impersonator', 'Comment moderation', 'Account security', 'Other'] as const;
export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'X', 'YouTube', 'LinkedIn', 'Other'] as const;

export interface ParsedAlert {
  customer: string;
  type: (typeof TYPES)[number];
  severity: (typeof SEVERITIES)[number];
  platform: '' | (typeof PLATFORMS)[number];
  notes: string;
}

/** Turn Slack mrkdwn into plain text: strip mentions, unwrap links, unescape entities. */
export function cleanSlackText(raw: string): string {
  return String(raw ?? '')
    .replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
    .replace(/<!(here|channel|everyone)[^>]*>/g, '')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2 ($1)')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// \b doesn't work for Hebrew, so build unicode-aware word boundaries.
// One optional Hebrew prefix letter is allowed (e.g. "באינסטגרם" = "on Instagram").
const B = (words: string) => new RegExp(`(?<![\\p{L}\\p{N}_])[בלהמוכש]?(?:${words})(?![\\p{L}\\p{N}_])`, 'iu');

const TYPE_RULES: [RegExp, ParsedAlert['type']][] = [
  [B('impersonat\\w*|fake|scam account|מתחז\\w*|מזויף\\w*|מתחזה'), 'Impersonator'],
  [B('comments?|moderat\\w*|spam\\w*|toxic|abuse|abusive|תגוב\\w*|מודרצ\\w*|ספאם'), 'Comment moderation'],
  [B('hack\\w*|breach\\w*|login|password|2fa|security|compromis\\w*|פריצ\\w*|נפרץ|אבטחה'), 'Account security'],
];
const SEVERITY_RULES: [RegExp, ParsedAlert['severity']][] = [
  [B('critical|crit|p0|sev ?1|קריטי\\w*'), 'Critical'],
  [B('high|urgent|asap|p1|sev ?2|גבוה\\w*|דחוף\\w*'), 'High'],
  [B('medium|med|p2|בינונ\\w*'), 'Medium'],
  [B('low|p3|נמוכ\\w*'), 'Low'],
];
const PLATFORM_RULES: [RegExp, Exclude<ParsedAlert['platform'], ''>][] = [
  [B('instagram|insta|ig|אינסטגרם|אינסטה'), 'Instagram'],
  [B('facebook|fb|פייסבוק'), 'Facebook'],
  [B('tiktok|tik tok|טיקטוק'), 'TikTok'],
  [B('twitter|x\\.com|on x|טוויטר'), 'X'],
  [B('youtube|yt|יוטיוב'), 'YouTube'],
  [B('linkedin|לינקדאין'), 'LinkedIn'],
];

// Words that end the "customer name" part when we guess it from the first line.
const STOP_WORDS = new Set([
  'impersonator', 'impersonators', 'impersonation', 'fake', 'comment', 'comments', 'spam', 'moderation',
  'critical', 'high', 'medium', 'low', 'urgent', 'instagram', 'insta', 'ig', 'facebook', 'fb', 'tiktok',
  'twitter', 'youtube', 'yt', 'linkedin', 'hacked', 'breach', 'login', 'password', 'on', 'new', 'alert',
  'מתחזה', 'מתחזים', 'תגובות', 'ספאם', 'קריטי', 'גבוה', 'דחוף', 'בינוני', 'נמוך', 'אינסטגרם', 'פייסבוק', 'טיקטוק',
]);

const first = <T>(rules: [RegExp, T][], text: string): T | undefined => rules.find(([re]) => re.test(text))?.[1];

function guessCustomer(text: string): string {
  const explicit = text.match(/(?:customer|client|לקוח|עבור)\s*[:\-]\s*([^\n,;|]+)/iu);
  if (explicit) return explicit[1].trim().slice(0, 80);

  const line = text.split('\n')[0].replace(/^\s*(new\s+)?(alert|התראה)\s*[:\-]?\s*/iu, '');
  const head = line.split(/\s*[,;|]\s*|\s+[-–—]\s+|:\s+/)[0] ?? '';
  const words: string[] = [];
  for (const w of head.split(/\s+/).filter(Boolean)) {
    if (STOP_WORDS.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))) break;
    words.push(w);
    if (words.length === 5) break;
  }
  return words.join(' ').trim();
}

export function parseAlertText(input: string): ParsedAlert {
  const text = cleanSlackText(input);
  return {
    customer: guessCustomer(text),
    type: first(TYPE_RULES, text) ?? 'Other',
    severity: first(SEVERITY_RULES, text) ?? 'Medium',
    platform: first(PLATFORM_RULES, text) ?? '',
    notes: text.slice(0, 1000),
  };
}
