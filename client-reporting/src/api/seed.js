// Demo data for the local BoardSDK (used when src/api/data.json is absent). Dates are relative to "now" so the dashboard always has activity today.
const day = 86400000;
const ago = (days, hours = 0) => new Date(Date.now() - days * day - hours * 3600000);
const at = (days, h, m = 0) => { const d = ago(days); d.setHours(h, m, 0, 0); return d; };

export const OWNERS = {
  noa: { id: 101, name: 'Noa Levi' },
  dan: { id: 102, name: 'Dan Cohen' },
  maya: { id: 103, name: 'Maya Ben-David' },
};

const rows = [
  // name, industry, health, comms, stage, owner, products, cap, arr, socials
  ['Aurora Fashion', 'Retail', 'Green', 'OK', 'Active', 'noa', ['Comments', 'Impersonators'], 400, 84000, ['Instagram', 'TikTok', 'Facebook']],
  ['Bluewave Bank', 'Finance', 'Red', 'Client waiting on us', 'Active', 'dan', ['Impersonators'], 250, 190000, ['X', 'Facebook', 'LinkedIn']],
  ['Cedar Hotels', 'Hospitality', 'Green', 'OK', 'Renewal', 'maya', ['Comments'], 0, 62000, ['Instagram', 'Facebook']],
  ['Delta Airlines IL', 'Travel', 'Yellow', 'OK', 'Active', 'noa', ['Comments', 'Impersonators'], 600, 240000, ['X', 'Instagram', 'Facebook']],
  ['Echo Telecom', 'Telecom', 'Green', 'OK', 'Onboarding', 'dan', ['Impersonators'], 300, 98000, ['Facebook', 'YouTube']],
  ['Fable Games', 'Gaming', 'Yellow', 'Silent 14d+', 'Active', 'maya', ['Comments'], 0, 47000, ['X', 'TikTok', 'YouTube']],
  ['Granite Insurance', 'Insurance', 'Green', 'OK', 'Active', 'dan', ['Impersonators'], 200, 120000, ['Facebook', 'LinkedIn']],
  ['Harbor Foods', 'Food & Beverage', 'Green', 'OK', 'Active', 'noa', ['Comments'], 0, 38000, ['Instagram', 'Facebook']],
  ['Iris Beauty', 'Cosmetics', 'Red', 'Silent 14d+', 'At risk', 'maya', ['Comments', 'Impersonators'], 150, 55000, ['Instagram', 'TikTok']],
  ['Jade Crypto', 'Crypto', 'Yellow', 'Client waiting on us', 'Active', 'dan', ['Impersonators'], 800, 210000, ['X', 'Telegram', 'YouTube']],
  ['Kite Mobility', 'Automotive', 'Green', 'OK', 'Active', 'noa', ['Comments'], 0, 71000, ['Instagram', 'X']],
  ['Lumen Energy', 'Energy', 'Green', 'OK', 'Renewal', 'maya', ['Impersonators'], 120, 88000, ['Facebook', 'LinkedIn']],
  ['Mosaic Media', 'Media', 'Green', 'OK', 'Active', 'noa', ['Comments', 'Impersonators'], 500, 105000, ['X', 'Instagram', 'YouTube', 'TikTok']],
  ['Nimbus Cloud', 'SaaS', 'Yellow', 'OK', 'Active', 'dan', ['Impersonators'], 180, 134000, ['X', 'LinkedIn']],
  ['Orbit Sports', 'Sports', 'Green', 'OK', 'Active', 'maya', ['Comments'], 0, 59000, ['Instagram', 'X', 'TikTok']],
  ['Pine Pharma', 'Healthcare', 'Green', 'OK', 'Active', 'dan', ['Impersonators'], 220, 156000, ['Facebook', 'LinkedIn']],
  ['Quartz Jewelry', 'Retail', 'Green', 'OK', 'Onboarding', 'noa', ['Comments', 'Impersonators'], 100, 33000, ['Instagram', 'Facebook']],
  ['Ridge Outdoors', 'Retail', 'Yellow', 'Silent 14d+', 'Active', 'maya', ['Comments'], 0, 29000, ['Instagram', 'YouTube']],
  ['Solis Solar', 'Energy', 'Green', 'OK', 'Active', 'dan', ['Impersonators'], 160, 76000, ['Facebook', 'LinkedIn']],
  ['Tidal Travel', 'Travel', 'Green', 'OK', 'Active', 'noa', ['Comments', 'Impersonators'], 350, 92000, ['Instagram', 'Facebook', 'TikTok']],
];

const base = rows.map(([name, industry, health, commsFlag, lifecycleStage, owner, signedProducts, impersCap, arr, activeSocials], i) => ({
  id: 1000 + i,
  name,
  clientStatus: 'Active',
  industry,
  health,
  commsFlag,
  lifecycleStage,
  csOwner: [OWNERS[owner]],
  weeklyStatus: '',
  lastTouchpoint: ago(1 + (i % 9)),
  lastTouchType: ['Email', 'Slack', 'Call'][i % 3],
  nextMonthlyCall: ago(-(3 + i)),
  renewalDate: ago(-(40 + i * 11)),
  peakEvent: i % 4 === 0 ? 'Black Friday campaign — expect 3x comment volume' : '',
  peakEventDate: i % 4 === 0 ? ago(-45) : null,
  arr,
  impersCap,
  commCap: signedProducts.includes('Comments') ? 5000 : 0,
  pocName: `${name.split(' ')[0]} Contact`,
  pocEmail: `contact@${name.split(' ')[0].toLowerCase()}.example.com`,
  activeSocials,
  signedProducts,
  updatedAt: ago(0, i * 2),
}));

const byName = Object.fromEntries(base.map(c => [c.name, c]));
let uid = 1;
const upd = (client, created_at, text_body, author = 'Noa Levi') =>
  ({ id: `u${uid++}`, itemId: byName[client].id, created_at: created_at.toISOString(), text_body, creator: { name: author } });

const month = (back, d) => { const x = new Date(); x.setMonth(x.getMonth() - back, d); x.setHours(11, 0, 0, 0); return x; };

export const UPDATES = [
  // Today
  upd('Aurora Fashion', at(0, 9, 12), '[Comments · Update] Spike of spam comments on the new collection post — hidden 38 so far, link-in-bio scams mostly.'),
  upd('Aurora Fashion', at(0, 9, 40), '[Comments · Trends] Sentiment 82% positive. Sizing questions are the top recurring theme.'),
  upd('Bluewave Bank', at(0, 10, 5), '[Impersonators] Removed: 14 | Month: ' + new Date().toISOString().slice(0, 7) + ' | Note: Fake support accounts on X and Facebook, 3 new phishing pages reported.', 'Dan Cohen'),
  upd('Bluewave Bank', at(0, 10, 30), 'Client asked for an escalation report on the phishing wave — sending by EOD.', 'Dan Cohen'),
  upd('Delta Airlines IL', at(0, 8, 50), '[Weekly] Quiet week. Two impersonator takedowns pending platform response. Comment volume stable.'),
  upd('Jade Crypto', at(0, 11, 15), '[Impersonators] Removed: 41 | Month: ' + new Date().toISOString().slice(0, 7) + ' | Note: Fake giveaway accounts on Telegram and X.', 'Dan Cohen'),
  upd('Mosaic Media', at(0, 12, 2), 'Call with POC went well, they will extend to two more brands next quarter.'),
  upd('Fable Games', at(0, 13, 20), '[Comments · Moderation] Hid 22 toxic comments on the patch notes video. Last moderation: today 13:00.', 'Maya Ben-David'),
  // History
  upd('Aurora Fashion', ago(3), '[Comments · Moderation] Removed 12 scam comments. Last moderation: 3 days ago.'),
  upd('Aurora Fashion', ago(40), "[Comments · SOP] Hide any comment with external links ¶ Hide competitor mentions ¶ Escalate legal threats to CS owner within 1h"),
  upd('Aurora Fashion', ago(12), "[Comments · SOP] Hide any comment with external links ¶ Hide competitor mentions ¶ Escalate legal threats to CS owner within 1h ¶ Keep sizing questions visible and reply from brand account"),
  upd('Bluewave Bank', month(0, 1), '[Impersonators] Removed: 63 | Month: ' + new Date().toISOString().slice(0, 7) + ' | Note: Early-month sweep.', 'Dan Cohen'),
  upd('Bluewave Bank', month(1, 20), '[Impersonators] Removed: 188 | Month: ' + month(1, 1).toISOString().slice(0, 7) + ' | Note: Large phishing campaign.', 'Dan Cohen'),
  upd('Bluewave Bank', month(2, 14), '[Impersonators] Removed: 112 | Month: ' + month(2, 1).toISOString().slice(0, 7) + ' | Note: Routine.', 'Dan Cohen'),
  upd('Bluewave Bank', month(3, 9), '[Impersonators] Removed: 95 | Month: ' + month(3, 1).toISOString().slice(0, 7) + ' | Note: Routine.', 'Dan Cohen'),
  upd('Delta Airlines IL', month(1, 15), '[Impersonators] Removed: 240 | Month: ' + month(1, 1).toISOString().slice(0, 7) + ' | Note: Summer travel scams.'),
  upd('Delta Airlines IL', ago(8), '[Weekly] Pushed LOA renewal to legal. Waiting on trademark doc.'),
  upd('Iris Beauty', ago(16), 'No reply from client for two weeks, escalating to account manager.', 'Maya Ben-David'),
  upd('Jade Crypto', ago(2), 'Client waiting on our monthly takedown breakdown.', 'Dan Cohen'),
];

export const IMPO_ROWS = [
  { id: 1, name: 'Bluewave Bank', clients: 'Bluewave Bank', loa: { url: 'https://example.com/loa/bluewave.pdf', label: 'LOA – signed' }, trademarkDoc: { url: 'https://example.com/tm/bluewave.pdf', label: 'EUIPO registration' } },
  { id: 2, name: 'Delta Airlines IL', clients: 'Delta Airlines IL', loa: { url: 'https://example.com/loa/delta.pdf', label: 'LOA 2026' }, trademarkDoc: null },
  { id: 3, name: 'Jade Crypto', clients: 'Jade Crypto', loa: null, trademarkDoc: null },
];

export const BASE_CLIENTS = base;
