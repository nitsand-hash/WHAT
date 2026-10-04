(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Config
   * ------------------------------------------------------------------ */
  const KEY = 'what.v1';
  const TYPES = [
    { v: 'Impersonator', c: 'purple' },
    { v: 'Comment moderation', c: 'blue' },
    { v: 'Account security', c: 'orange' },
    { v: 'Other', c: 'gray' },
  ];
  const SEVERITIES = [
    { v: 'Low', c: 'gray' },
    { v: 'Medium', c: 'yellow' },
    { v: 'High', c: 'orange' },
    { v: 'Critical', c: 'red' },
  ];
  const STATUSES = [
    { v: 'New', c: 'blue' },
    { v: 'In progress', c: 'yellow' },
    { v: 'Resolved', c: 'green' },
  ];
  const PLATFORMS = [
    { v: '', c: 'gray', label: 'None' },
    { v: 'Instagram', c: 'pink' },
    { v: 'Facebook', c: 'blue' },
    { v: 'TikTok', c: 'gray' },
    { v: 'X', c: 'gray' },
    { v: 'YouTube', c: 'red' },
    { v: 'LinkedIn', c: 'blue' },
    { v: 'Other', c: 'gray' },
  ];
  const OPTIONS = { type: TYPES, severity: SEVERITIES, status: STATUSES, platform: PLATFORMS };
  const FIELD_LABELS = { type: 'Type', severity: 'Severity', status: 'Status', platform: 'Platform' };

  const BLOCK_TYPES = [
    { t: 'text', label: 'Text', hint: 'Plain paragraph', ico: '¶', kw: 'text paragraph plain' },
    { t: 'h1', label: 'Heading 1', hint: 'Big section heading', ico: 'H1', kw: 'heading h1 title' },
    { t: 'h2', label: 'Heading 2', hint: 'Medium section heading', ico: 'H2', kw: 'heading h2 subtitle' },
    { t: 'bullet', label: 'Bulleted list', hint: 'Simple list item', ico: '•', kw: 'bullet list ul' },
    { t: 'todo', label: 'To-do', hint: 'Track a task', ico: '☑', kw: 'todo task checkbox check' },
    { t: 'quote', label: 'Quote', hint: 'Capture a quote', ico: '❝', kw: 'quote cite' },
    { t: 'callout', label: 'Callout', hint: 'Highlight something', ico: '💡', kw: 'callout note highlight' },
    { t: 'divider', label: 'Divider', hint: 'Visually divide blocks', ico: '—', kw: 'divider line hr separator' },
  ];
  const PLACEHOLDERS = {
    text: "Write what happened today… type '/' for commands",
    h1: 'Heading 1', h2: 'Heading 2', bullet: 'List', todo: 'To-do', quote: 'Quote', callout: 'Type something…',
  };
  const SHORTCUTS = { '#': 'h1', '##': 'h2', '-': 'bullet', '*': 'bullet', '[]': 'todo', '>': 'quote' };

  // 'plaintext-only' keeps pasted/typed content free of markup where supported.
  const CE = (() => {
    const d = document.createElement('div');
    try { d.contentEditable = 'plaintext-only'; } catch (_) { /* unsupported */ }
    return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
  })();

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const today = () => toISO(new Date());
  const fmtLong = (iso) => fromISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dayLabel = (iso) => {
    const t = today();
    if (iso === t) return 'Today';
    if (iso === addDays(t, -1)) return 'Yesterday';
    return fromISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const optColor = (field, v) => (OPTIONS[field].find((o) => o.v === v) || {}).c || 'gray';

  /* ------------------------------------------------------------------ *
   * State + persistence (localStorage)
   * ------------------------------------------------------------------ */
  const blankState = () => ({ version: 1, title: 'What Happened Today', view: 'table', days: {}, alerts: [] });

  // Remote mode (shared Supabase database) is on when config.js has a project URL + anon key.
  const cfg = window.WHAT_CONFIG || {};
  const REMOTE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = REMOTE ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const META_KEY = 'what.meta';
  const META = { meta: true }; // save(META) = only the per-browser settings changed

  function load() {
    try {
      if (REMOTE) return { ...blankState(), ...(JSON.parse(localStorage.getItem(META_KEY)) || {}), days: {}, alerts: [] };
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.alerts) && s.days && typeof s.days === 'object') return { ...blankState(), ...s };
    } catch (_) { /* fall through */ }
    return blankState();
  }

  let state = load();
  const ui = { date: today(), scope: 'day', status: 'all', q: '', peekId: null };

  const saveMeta = () => {
    try { localStorage.setItem(META_KEY, JSON.stringify({ title: state.title, view: state.view })); } catch (_) { /* storage unavailable */ }
  };

  // ----- local persistence -----
  function flushLocal() {
    // Don't persist days that only contain empty text blocks.
    for (const [d, v] of Object.entries(state.days)) {
      if (!v.blocks.some((b) => b.type === 'divider' || b.text)) delete state.days[d];
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }

  // ----- remote persistence (write-through to Supabase) -----
  const dirtyAlerts = new Map(); // id -> alert object
  const dirtyDays = new Set();   // YYYY-MM-DD
  const deletedIds = new Set();
  const remoteDays = new Set();  // days that already have a row in day_notes
  let syncing = false, syncAgain = false, retryMs = 2000, syncState = 'saved', me = null;

  const toRow = (a) => ({ id: a.id, customer: a.customer, type: a.type, severity: a.severity, status: a.status, platform: a.platform, notes: a.notes, alert_date: a.date });
  const fromRow = (r) => ({
    id: r.id, customer: r.customer ?? '', type: r.type, severity: r.severity, status: r.status, platform: r.platform ?? '',
    notes: r.notes ?? '', date: r.alert_date, createdAt: Date.parse(r.created_at) || 0, source: r.source,
  });
  const hasContent = (blocks) => blocks.some((b) => b.type === 'divider' || b.text);

  const syncText = () => ({ saved: 'All changes saved', saving: 'Saving…', error: "Can't reach the server – retrying…" }[syncState]);
  function setSyncState(v) {
    syncState = v;
    const el = $('#syncStatus');
    if (el) el.textContent = syncText();
  }

  async function syncRemote() {
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    setSyncState('saving');
    try {
      do {
        syncAgain = false;
        const alerts = [...dirtyAlerts.values()], days = [...dirtyDays], dels = [...deletedIds];
        dirtyAlerts.clear(); dirtyDays.clear(); deletedIds.clear();
        try {
          if (alerts.length) {
            const { error } = await sb.from('alerts').upsert(alerts.map(toRow));
            if (error) throw error;
          }
          const rows = days
            .map((d) => ({ note_date: d, blocks: (state.days[d] || { blocks: [] }).blocks }))
            .filter((r) => hasContent(r.blocks) || remoteDays.has(r.note_date));
          if (rows.length) {
            const { error } = await sb.from('day_notes').upsert(rows);
            if (error) throw error;
            rows.forEach((r) => remoteDays.add(r.note_date));
          }
          if (dels.length) {
            const { error } = await sb.from('alerts').delete().in('id', dels);
            if (error) throw error;
          }
        } catch (err) {
          // Put the work back so the retry sends it (unless it was deleted/re-edited meanwhile).
          for (const a of alerts) if (!deletedIds.has(a.id) && !dirtyAlerts.has(a.id)) dirtyAlerts.set(a.id, a);
          for (const d of days) dirtyDays.add(d);
          for (const id of dels) if (!dirtyAlerts.has(id)) deletedIds.add(id);
          throw err;
        }
      } while (syncAgain);
      retryMs = 2000;
      setSyncState('saved');
    } catch (err) {
      console.error('Sync failed', err);
      setSyncState('error');
      setTimeout(scheduleSync, retryMs);
      retryMs = Math.min(retryMs * 2, 30000);
    } finally {
      syncing = false;
    }
  }

  let saveTimer = null;
  function scheduleSync() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(REMOTE ? syncRemote : flushLocal, REMOTE ? 400 : 250);
  }
  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (REMOTE) { saveMeta(); return syncRemote(); }
    flushLocal();
  }

  /** Mark something as changed. Pass an alert (alert edited), META (title/view), or nothing (current day's notes). */
  function save(target) {
    if (target === META) { if (REMOTE) saveMeta(); else scheduleSync(); return; }
    if (REMOTE) {
      if (target && target.customer !== undefined) dirtyAlerts.set(target.id, target);
      else dirtyDays.add(ui.date);
    }
    scheduleSync();
  }
  function queueDelete(id) { if (REMOTE) { dirtyAlerts.delete(id); deletedIds.add(id); } scheduleSync(); }

  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  const find = (id) => state.alerts.find((a) => a.id === id);
  const newBlock = (type = 'text', text = '') => ({ id: uid(), type, text, checked: false });
  function dayBlocks(date) {
    const d = state.days[date] || (state.days[date] = { blocks: [] });
    if (!d.blocks.length) d.blocks.push(newBlock());
    return d.blocks;
  }

  /* ------------------------------------------------------------------ *
   * Sidebar + header + stats
   * ------------------------------------------------------------------ */
  function renderSidebar() {
    const t = today();
    const dates = new Set([ui.date]);
    for (let i = 0; i < 14; i++) dates.add(addDays(t, -i));
    const items = [...dates].sort().reverse().map((d) => {
      const day = state.alerts.filter((a) => a.date === d);
      const open = day.filter((a) => a.status !== 'Resolved').length;
      const badge = day.length ? `<span class="badge ${open ? 'open' : ''}">${open || '✓'}</span>` : '';
      return `<button class="sb-item ${d === ui.date ? 'active' : ''}" data-date="${d}"><span class="grow">${esc(dayLabel(d))}</span>${badge}</button>`;
    }).join('');
    $('#sidebar').innerHTML = `
      <div class="sb-head"><span class="logo">👀</span><span>WHAT</span></div>
      <div class="sb-label">Days</div>
      ${items}
      <div class="sb-spacer"></div>
      <div class="sb-label">Data</div>
      <button class="sb-item" data-act="export">Export backup</button>
      ${REMOTE
        ? `<div class="sb-note"><span id="syncStatus">${syncText()}</span><br>${esc(me ? me.email : '')}</div>
           <button class="sb-item" data-act="signout">Sign out</button>`
        : `<button class="sb-item" data-act="import">Import backup</button>
           <div class="sb-note">Everything is saved in this browser only.</div>`}`;
  }

  function renderHeader() {
    const isToday = ui.date === today();
    $('#title').value = state.title;
    $('#datebar').innerHTML = `
      <button class="icon-btn" data-act="prev" title="Previous day" aria-label="Previous day">‹</button>
      <button class="icon-btn" data-act="today">Today</button>
      <button class="icon-btn" data-act="next" title="Next day" aria-label="Next day">›</button>
      <input type="date" id="datePick" value="${ui.date}" aria-label="Jump to date">
      <span class="long-date">${esc(fmtLong(ui.date))}</span>${isToday ? '<span class="today-tag">Today</span>' : ''}`;
  }

  function renderStats() {
    const day = state.alerts.filter((a) => a.date === ui.date);
    const count = (s) => day.filter((a) => a.status === s).length;
    const card = (label, n, dot) => `<div class="stat"><div class="label"><span class="dot ${dot}"></span>${label}</div><div class="num">${n}</div></div>`;
    const urgent = day.filter((a) => a.status !== 'Resolved' && (a.severity === 'High' || a.severity === 'Critical')).length;
    const notes = [];
    if (urgent) notes.push(`<span class="pill c-red">${urgent} high/critical still open</span>`);
    for (const t of TYPES) {
      const n = day.filter((a) => a.type === t.v).length;
      if (n) notes.push(`<span class="pill c-${t.c}">${n} ${esc(t.v)}</span>`);
    }
    $('#stats').innerHTML = `
      <div class="stat-cards">
        ${card('Total alerts', day.length, '')}
        ${card('New', count('New'), 'blue')}
        ${card('In progress', count('In progress'), 'yellow')}
        ${card('Resolved', count('Resolved'), 'green')}
      </div>
      <div class="stat-notes">${notes.join('')}</div>`;
  }

  /* ------------------------------------------------------------------ *
   * Alerts database (table + board)
   * ------------------------------------------------------------------ */
  function visibleAlerts(ignoreStatus) {
    const q = ui.q;
    const list = state.alerts.filter((a) =>
      (ui.scope === 'all' || a.date === ui.date) &&
      (ignoreStatus || ui.status === 'all' || a.status === ui.status) &&
      (!q || `${a.customer} ${a.notes} ${a.type} ${a.platform} ${a.severity}`.toLowerCase().includes(q)));
    return list.sort((a, b) => (ui.scope === 'all' ? b.date.localeCompare(a.date) : 0) || a.createdAt - b.createdAt);
  }

  const pill = (id, field, v) => v
    ? `<button class="pill c-${optColor(field, v)}" data-pick="${field}" data-id="${id}">${esc(v)}</button>`
    : `<button class="pill-empty" data-pick="${field}" data-id="${id}">Empty</button>`;

  function tableHTML(list) {
    const rows = list.map((a) => `
      <tr data-id="${a.id}">
        <td class="c-customer"><input class="cell-input" data-field="customer" list="customers" value="${esc(a.customer)}" placeholder="Untitled" aria-label="Customer"><button class="open-btn" data-act="open">Open</button></td>
        <td>${pill(a.id, 'type', a.type)}</td>
        <td>${pill(a.id, 'severity', a.severity)}</td>
        <td>${pill(a.id, 'status', a.status)}</td>
        <td>${pill(a.id, 'platform', a.platform)}</td>
        <td><input type="date" class="cell-input" data-field="date" value="${a.date}" aria-label="Date"></td>
        <td><input class="cell-input" data-field="notes" value="${esc(a.notes)}" placeholder="Empty" aria-label="Notes"></td>
        <td><button class="row-del" data-act="delete" title="Delete" aria-label="Delete alert">✕</button></td>
      </tr>`).join('');
    const empty = list.length ? '' : `<div class="empty">${emptyMessage()}</div>`;
    return `
      <div class="table-wrap"><table class="db">
        <colgroup><col style="width:21%"><col style="width:15%"><col style="width:10%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col><col style="width:40px"></colgroup>
        <thead><tr><th>Customer</th><th>Type</th><th>Severity</th><th>Status</th><th>Platform</th><th>Date</th><th>Notes</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>${empty}
      <button class="add-row" data-act="add">＋ New</button>`;
  }

  function emptyMessage() {
    if (!state.alerts.length) return REMOTE
      ? 'No alerts yet. Add one with <b>New</b>, or tag <b>@WHAT</b> in Slack.'
      : 'No alerts yet. Add one with <b>New</b>, or <button class="link-btn" data-act="sample">load sample data</button> to try it out.';
    if (ui.q || ui.status !== 'all') return 'No alerts match the current filters.';
    return ui.scope === 'day' ? 'Nothing logged for this day yet.' : 'No alerts.';
  }

  function boardHTML(list) {
    const cols = STATUSES.map((s) => {
      const cards = list.filter((a) => a.status === s.v).map((a) => `
        <div class="card" draggable="true" data-id="${a.id}">
          <div class="name ${a.customer ? '' : 'untitled'}">${esc(a.customer || 'Untitled')}</div>
          <div class="tags">
            <span class="pill c-${optColor('type', a.type)}">${esc(a.type)}</span>
            <span class="pill c-${optColor('severity', a.severity)}">${esc(a.severity)}</span>
            ${a.platform ? `<span class="pill c-${optColor('platform', a.platform)}">${esc(a.platform)}</span>` : ''}
          </div>
          ${a.notes ? `<div class="note">${esc(a.notes)}</div>` : ''}
        </div>`).join('');
      return `<div class="col" data-status="${s.v}">
        <div class="col-head"><span class="pill c-${s.c}">${s.v}</span><span>${list.filter((a) => a.status === s.v).length}</span></div>
        ${cards}
        <button class="add-card" data-act="add" data-status="${s.v}">＋ New</button>
      </div>`;
    }).join('');
    const empty = list.length ? '' : `<div class="empty">${emptyMessage()}</div>`;
    return `<div class="board">${cols}</div>${empty}`;
  }

  function renderToolbar() {
    for (const b of document.querySelectorAll('#viewTabs button')) b.classList.toggle('on', b.dataset.view === state.view);
    for (const b of document.querySelectorAll('#scopeTabs button')) b.classList.toggle('on', b.dataset.scope === ui.scope);
    const sel = $('#statusFilter');
    sel.value = ui.status;
    sel.disabled = state.view === 'board';
  }

  function renderDb() {
    const names = [...new Set(state.alerts.map((a) => a.customer.trim()).filter(Boolean))].sort();
    $('#customers').innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
    const board = state.view === 'board';
    const list = visibleAlerts(board);
    $('#db').innerHTML = board ? boardHTML(list) : tableHTML(list);
  }

  function renderPeek() {
    const el = $('#peek');
    const a = find(ui.peekId);
    if (!a) { el.classList.remove('open'); el.innerHTML = ''; delete el.dataset.id; ui.peekId = null; return; }
    el.dataset.id = a.id;
    el.classList.add('open');
    el.innerHTML = `
      <div class="peek-top">
        <button class="icon-btn" data-act="closePeek" aria-label="Close">✕ Close</button>
        <button class="btn danger" data-act="delete">Delete</button>
      </div>
      <input class="title" data-field="customer" list="customers" value="${esc(a.customer)}" placeholder="Customer name" spellcheck="false" aria-label="Customer">
      <div class="props">
        ${['type', 'severity', 'status', 'platform'].map((f) => `<div class="k">${FIELD_LABELS[f]}</div><div class="v">${pill(a.id, f, a[f])}</div>`).join('')}
        <div class="k">Date</div><div class="v"><input type="date" data-field="date" value="${a.date}" aria-label="Date"></div>
      </div>
      <h3>Notes</h3>
      <textarea data-field="notes" placeholder="What happened? Links, handles, next steps…">${esc(a.notes)}</textarea>`;
    autosize($('textarea', el));
  }

  function autosize(t) {
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.max(140, t.scrollHeight + 2) + 'px';
  }

  function refreshAlerts() {
    renderSidebar();
    renderStats();
    renderDb();
    renderPeek();
  }

  function renderAll() {
    renderSidebar();
    renderHeader();
    renderStats();
    renderToolbar();
    renderDb();
    renderPeek();
    renderBlocks();
  }

  function addAlert(status = 'New') {
    const a = {
      id: uid(), customer: '', type: 'Other', severity: 'Medium', status, platform: '', notes: '',
      date: ui.scope === 'day' ? ui.date : today(), createdAt: Date.now(),
    };
    state.alerts.push(a);
    if (state.view === 'table' && ui.status !== 'all' && ui.status !== status) { ui.status = 'all'; renderToolbar(); }
    save(a);
    refreshAlerts();
    if (state.view === 'table') {
      const input = $(`tr[data-id="${a.id}"] input[data-field="customer"]`);
      if (input) input.focus();
    } else {
      ui.peekId = a.id;
      renderPeek();
      const input = $('#peek input[data-field="customer"]');
      if (input) input.focus();
    }
  }

  let toastTimer = null;
  function toast(msg, undo) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
    el.hidden = false;
    if (undo) $('button', el).onclick = () => { undo(); el.hidden = true; };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }

  function deleteAlert(id) {
    const i = state.alerts.findIndex((a) => a.id === id);
    if (i < 0) return;
    const [removed] = state.alerts.splice(i, 1);
    if (ui.peekId === id) ui.peekId = null;
    queueDelete(id);
    refreshAlerts();
    toast('Alert deleted', () => {
      state.alerts.splice(Math.min(i, state.alerts.length), 0, removed);
      deletedIds.delete(id);
      save(removed);
      refreshAlerts();
    });
  }

  /* ------------------------------------------------------------------ *
   * Select menu (property pills)
   * ------------------------------------------------------------------ */
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function placeMenu(m, anchor) {
    const r = anchor.getBoundingClientRect();
    m.style.left = '0px'; m.style.top = '0px';
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    m.style.top = (r.bottom + h + 12 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  }
  function openMenu(anchor, opts, current, onPick) {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = opts.map((o) => `<button class="menu-item" data-v="${esc(o.v)}"><span class="pill c-${o.c}">${esc(o.label || o.v)}</span>${o.v === current ? '<span class="tick">✓</span>' : ''}</button>`).join('');
    document.body.appendChild(m);
    placeMenu(m, anchor);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-item');
      if (!b) return;
      closeMenu();
      onPick(b.dataset.v);
    });
    menuEl = m;
  }
  document.addEventListener('mousedown', (e) => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });

  /* ------------------------------------------------------------------ *
   * Block editor (Notion-style daily summary)
   * ------------------------------------------------------------------ */
  const editor = $('#editor');
  const slash = { open: false, idx: 0, items: [], id: null };

  function blockHTML(b, solo) {
    if (b.type === 'divider') return `<div class="block" data-id="${b.id}" data-type="divider"><hr></div>`;
    let lead = '';
    if (b.type === 'bullet') lead = '<span class="lead bullet">•</span>';
    else if (b.type === 'todo') lead = `<span class="lead check ${b.checked ? 'on' : ''}" data-act="toggle" role="checkbox" aria-checked="${!!b.checked}"></span>`;
    else if (b.type === 'callout') lead = '<span class="lead icon">💡</span>';
    return `<div class="block ${solo ? 'solo' : ''} ${b.type === 'todo' && b.checked ? 'done' : ''}" data-id="${b.id}" data-type="${b.type}">
      <div class="lead-wrap">${lead}</div>
      <div class="content" contenteditable="${CE}" spellcheck="true" data-placeholder="${esc(PLACEHOLDERS[b.type] || '')}">${esc(b.text)}</div>
    </div>`;
  }

  function renderBlocks(focus) {
    const blocks = dayBlocks(ui.date);
    const solo = blocks.length === 1 && !blocks[0].text && blocks[0].type === 'text';
    editor.innerHTML = blocks.map((b) => blockHTML(b, solo)).join('');
    if (focus) focusBlock(focus.id, focus.pos);
  }

  function focusBlock(id, pos) {
    const el = $(`.block[data-id="${id}"] .content`, editor);
    if (el) setCaret(el, pos);
  }

  function caretOffset(el) {
    const sel = getSelection();
    if (!sel.rangeCount) return 0;
    const r = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(r.endContainer, r.endOffset);
    return pre.toString().length;
  }

  function setCaret(el, pos) {
    el.focus();
    const sel = getSelection();
    const r = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let left = pos, node, last = null;
    while ((node = walker.nextNode())) {
      last = node;
      if (left <= node.length) { r.setStart(node, left); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); return; }
      left -= node.length;
    }
    if (last) r.setStart(last, last.length); else r.setStart(el, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function ctxOf(target) {
    const el = target.closest && target.closest('.content');
    if (!el || !editor.contains(el)) return null;
    const blk = el.closest('.block');
    const blocks = dayBlocks(ui.date);
    const i = blocks.findIndex((b) => b.id === blk.dataset.id);
    return i < 0 ? null : { el, blocks, i, b: blocks[i] };
  }

  const neighbor = (blocks, i, dir) => {
    for (let j = i + dir; j >= 0 && j < blocks.length; j += dir) if (blocks[j].type !== 'divider') return blocks[j];
    return null;
  };

  function closeSlash() { slash.open = false; $('#slash').hidden = true; }
  function openSlash(el, id, query) {
    const q = query.toLowerCase();
    const items = BLOCK_TYPES.filter((t) => !q || t.label.toLowerCase().includes(q) || t.kw.includes(q));
    if (!items.length) { closeSlash(); return; }
    slash.open = true; slash.id = id; slash.items = items;
    slash.idx = Math.min(slash.idx, items.length - 1);
    const m = $('#slash');
    m.innerHTML = `<div class="sb-label" style="padding:4px 8px">Basic blocks</div>` + items.map((t, k) =>
      `<button class="menu-item ${k === slash.idx ? 'sel' : ''}" data-k="${k}"><span class="ico">${t.ico}</span><span class="meta"><span>${t.label}</span><small>${t.hint}</small></span></button>`).join('');
    m.hidden = false;
    placeMenu(m, el);
  }

  function applySlash(k) {
    const t = slash.items[k];
    const blocks = dayBlocks(ui.date);
    const i = blocks.findIndex((b) => b.id === slash.id);
    closeSlash();
    if (!t || i < 0) return;
    const b = blocks[i];
    b.text = '';
    if (t.t === 'divider') {
      b.type = 'divider';
      const nb = newBlock();
      blocks.splice(i + 1, 0, nb);
      save();
      renderBlocks({ id: nb.id, pos: 0 });
      return;
    }
    b.type = t.t;
    save();
    renderBlocks({ id: b.id, pos: 0 });
  }

  editor.addEventListener('keydown', (e) => {
    const c = ctxOf(e.target);
    if (!c || e.isComposing) return;
    const { el, blocks, i, b } = c;

    if (slash.open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        slash.idx = (slash.idx + (e.key === 'ArrowDown' ? 1 : -1) + slash.items.length) % slash.items.length;
        openSlash(el, b.id, b.text.slice(1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySlash(slash.idx); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return; }
    }

    const sel = getSelection();
    const collapsed = sel.isCollapsed;
    const off = caretOffset(el);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!b.text && b.type !== 'text') { b.type = 'text'; save(); renderBlocks({ id: b.id, pos: 0 }); return; }
      const before = b.text.slice(0, off), after = b.text.slice(off);
      b.text = before;
      const keep = b.type === 'bullet' || b.type === 'todo';
      const nb = newBlock(keep ? b.type : 'text', after);
      blocks.splice(i + 1, 0, nb);
      closeSlash();
      save();
      renderBlocks({ id: nb.id, pos: 0 });
    } else if (e.key === 'Enter' && e.shiftKey && CE !== 'plaintext-only') {
      e.preventDefault();
    } else if (e.key === 'Backspace' && collapsed && off === 0) {
      if (b.type !== 'text') {
        e.preventDefault();
        b.type = 'text';
        save();
        renderBlocks({ id: b.id, pos: 0 });
      } else if (i > 0) {
        e.preventDefault();
        const p = blocks[i - 1];
        if (p.type === 'divider') {
          blocks.splice(i - 1, 1);
          save();
          renderBlocks({ id: b.id, pos: 0 });
        } else {
          const pos = p.text.length;
          p.text += b.text;
          blocks.splice(i, 1);
          save();
          renderBlocks({ id: p.id, pos });
        }
      }
    } else if (e.key === 'ArrowUp' && collapsed && off === 0) {
      const p = neighbor(blocks, i, -1);
      if (p) { e.preventDefault(); focusBlock(p.id, Infinity); }
    } else if (e.key === 'ArrowDown' && collapsed && off === b.text.length) {
      const n = neighbor(blocks, i, 1);
      if (n) { e.preventDefault(); focusBlock(n.id, 0); }
    }
  });

  editor.addEventListener('input', (e) => {
    const c = ctxOf(e.target);
    if (!c) return;
    const { el, b } = c;
    let text = el.textContent;
    if (text === '') el.innerHTML = ''; // drop stray <br> so the placeholder can show
    b.text = text;
    if (b.type === 'text') {
      const m = text.match(/^(#{1,2}|[-*]|\[\]|>)[  ]/);
      if (m && SHORTCUTS[m[1]]) {
        b.type = SHORTCUTS[m[1]];
        b.text = text.slice(m[0].length);
        closeSlash();
        save();
        renderBlocks({ id: b.id, pos: 0 });
        return;
      }
    }
    if (b.text.startsWith('/') && !/\s/.test(b.text)) { slash.idx = 0; openSlash(el, b.id, b.text.slice(1)); } else closeSlash();
    save();
  });

  editor.addEventListener('paste', (e) => {
    if (!ctxOf(e.target)) return;
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  });

  editor.addEventListener('click', (e) => {
    const box = e.target.closest('[data-act="toggle"]');
    if (box) {
      const blk = box.closest('.block');
      const b = dayBlocks(ui.date).find((x) => x.id === blk.dataset.id);
      if (b) {
        b.checked = !b.checked;
        box.classList.toggle('on', b.checked);
        box.setAttribute('aria-checked', String(b.checked));
        blk.classList.toggle('done', b.checked);
        save();
      }
      return;
    }
    // Click in the empty space below the blocks: focus (or append) the last block.
    if (e.target === editor) {
      const blocks = dayBlocks(ui.date);
      const last = blocks[blocks.length - 1];
      if (last.type !== 'text' || last.text) {
        const nb = newBlock();
        blocks.push(nb);
        save();
        renderBlocks({ id: nb.id, pos: 0 });
      } else focusBlock(last.id, Infinity);
    }
  });

  $('#slash').addEventListener('mousedown', (e) => e.preventDefault()); // keep editor focus
  $('#slash').addEventListener('click', (e) => {
    const b = e.target.closest('.menu-item');
    if (b) applySlash(Number(b.dataset.k));
  });
  editor.addEventListener('focusout', () => setTimeout(() => { if (!editor.contains(document.activeElement)) closeSlash(); }, 0));

  /* ------------------------------------------------------------------ *
   * Global events
   * ------------------------------------------------------------------ */
  function goto(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    ui.date = date;
    closeSlash();
    renderAll();
  }

  document.addEventListener('click', (e) => {
    const t = e.target;

    const pick = t.closest('[data-pick]');
    if (pick) {
      const a = find(pick.dataset.id);
      const field = pick.dataset.pick;
      if (a) openMenu(pick, OPTIONS[field], a[field], (v) => { a[field] = v; save(a); refreshAlerts(); });
      return;
    }

    const dateBtn = t.closest('[data-date]');
    if (dateBtn && dateBtn.classList.contains('sb-item')) { goto(dateBtn.dataset.date); return; }

    const view = t.closest('[data-view]');
    if (view) { state.view = view.dataset.view; save(META); renderToolbar(); renderDb(); return; }
    const scope = t.closest('[data-scope]');
    if (scope) { ui.scope = scope.dataset.scope; renderToolbar(); renderDb(); return; }

    const actEl = t.closest('[data-act]');
    if (actEl && !actEl.closest('#editor')) {
      const id = actEl.closest('[data-id]')?.dataset.id;
      switch (actEl.dataset.act) {
        case 'add': addAlert(actEl.dataset.status || 'New'); break;
        case 'open': ui.peekId = id; renderPeek(); break;
        case 'closePeek': ui.peekId = null; renderPeek(); break;
        case 'delete': deleteAlert(id); break;
        case 'prev': goto(addDays(ui.date, -1)); break;
        case 'next': goto(addDays(ui.date, 1)); break;
        case 'today': goto(today()); break;
        case 'export': exportData(); break;
        case 'import': $('#importFile').click(); break;
        case 'sample': loadSample(); break;
        case 'signout': signOut(); break;
      }
      return;
    }

    const card = t.closest('.card');
    if (card) { ui.peekId = card.dataset.id; renderPeek(); }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'search') { ui.q = t.value.trim().toLowerCase(); renderDb(); return; }
    if (t.id === 'title') { state.title = t.value; document.title = t.value || 'What Happened Today'; save(META); return; }
    const f = t.dataset && t.dataset.field;
    if (!f || f === 'date') return;
    const host = t.closest('[data-id]');
    const a = host && find(host.dataset.id);
    if (!a) return;
    a[f] = t.value;
    save(a);
    if (t.tagName === 'TEXTAREA') autosize(t);
    if (host.id === 'peek') {
      renderDb(); // keep table/board in sync while editing in the side panel
    } else if (ui.peekId === a.id) {
      const twin = $(`#peek [data-field="${f}"]`);
      if (twin) twin.value = t.value;
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'datePick') { if (t.value) goto(t.value); return; }
    if (t.id === 'statusFilter') { ui.status = t.value; renderDb(); return; }
    if (t.id === 'importFile') { importData(t); return; }
    if (t.dataset && t.dataset.field === 'date') {
      const a = find(t.closest('[data-id]')?.dataset.id);
      if (a && t.value) { a.date = t.value; save(a); refreshAlerts(); }
      else if (a) t.value = a.date;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuEl) closeMenu();
    else if (ui.peekId) { ui.peekId = null; renderPeek(); }
  });

  // Board drag & drop: move a card between status columns.
  let dragId = null;
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    for (const el of document.querySelectorAll('.dragging, .col.over')) el.classList.remove('dragging', 'over');
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('.col');
    if (!col || !dragId) return;
    e.preventDefault();
    for (const el of document.querySelectorAll('.col.over')) if (el !== col) el.classList.remove('over');
    col.classList.add('over');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('.col');
    if (!col || !dragId) return;
    e.preventDefault();
    const a = find(dragId);
    if (a && a.status !== col.dataset.status) { a.status = col.dataset.status; save(a); refreshAlerts(); }
  });

  /* ------------------------------------------------------------------ *
   * Import / export / sample data
   * ------------------------------------------------------------------ */
  function exportData() {
    flush();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `what-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importData(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (!s || !Array.isArray(s.alerts) || typeof s.days !== 'object' || s.days === null) throw new Error('bad shape');
        if (!confirm('Replace all current data with this backup?')) return;
        state = { ...blankState(), ...s };
        flush();
        ui.peekId = null;
        renderAll();
        toast('Backup imported');
      } catch (_) {
        toast("That file isn't a valid WHAT backup");
      }
    };
    reader.readAsText(file);
  }

  function loadSample() {
    const d = ui.scope === 'day' ? ui.date : today();
    const mk = (customer, type, severity, status, platform, notes, i) =>
      ({ id: uid(), customer, type, severity, status, platform, notes, date: d, createdAt: Date.now() + i });
    state.alerts.push(
      mk('Acme Coffee', 'Impersonator', 'High', 'New', 'Instagram', '@acme.coffee_official is copying the brand logo and DMing followers a "giveaway" link.', 0),
      mk('Northwind Fitness', 'Comment moderation', 'Medium', 'In progress', 'Facebook', '14 spam comments hidden on the latest promo post; keyword filter updated.', 1),
      mk('Globex Travel', 'Impersonator', 'Critical', 'In progress', 'TikTok', 'Fake account with 8k followers. Report filed, waiting on TikTok.', 2),
      mk('Initech Bank', 'Account security', 'Low', 'Resolved', 'X', 'Suspicious login blocked; password reset confirmed by the customer.', 3),
    );
    const blocks = dayBlocks(d);
    if (blocks.length === 1 && !blocks[0].text) {
      blocks.splice(0, blocks.length,
        newBlock('h2', 'Highlights'),
        newBlock('bullet', 'Two new impersonators found – Acme Coffee and Globex Travel.'),
        newBlock('bullet', 'Moderation queue is back to normal after the Northwind spam wave.'),
        newBlock('todo', 'Follow up with TikTok on the Globex report'),
        newBlock('todo', 'Send Acme Coffee the takedown status'),
      );
    }
    save();
    renderAll();
  }

  /* ------------------------------------------------------------------ *
   * Remote mode: login, initial load, live updates
   * ------------------------------------------------------------------ */
  let refreshPending = false;
  const typingInDb = () => {
    const ae = document.activeElement;
    return !!(ae && ae.matches && ae.matches('input, textarea') && ae.closest('#db, #peek'));
  };
  // Don't yank the table out from under someone who is typing in it.
  function scheduleRefresh() {
    if (typingInDb()) { refreshPending = true; return; }
    refreshAlerts();
  }
  document.addEventListener('focusout', () => {
    if (!refreshPending) return;
    setTimeout(() => { if (!typingInDb()) { refreshPending = false; refreshAlerts(); } }, 0);
  });

  function onAlertChange(p) {
    if (p.eventType === 'DELETE') {
      const i = state.alerts.findIndex((a) => a.id === p.old.id);
      if (i < 0) return;
      state.alerts.splice(i, 1);
      if (ui.peekId === p.old.id) ui.peekId = null;
    } else {
      const next = fromRow(p.new);
      if (dirtyAlerts.has(next.id) || deletedIds.has(next.id)) return; // our own pending change wins
      const cur = state.alerts.find((a) => a.id === next.id);
      if (cur) Object.assign(cur, next); else state.alerts.push(next);
    }
    scheduleRefresh();
  }

  function onDayChange(p) {
    const r = p.new && p.new.note_date ? p.new : p.old;
    if (!r || dirtyDays.has(r.note_date)) return;
    if (p.eventType === 'DELETE') { delete state.days[r.note_date]; remoteDays.delete(r.note_date); }
    else {
      // While someone is typing in today's notes, keep their text; their next save wins.
      if (r.note_date === ui.date && editor.contains(document.activeElement)) return;
      state.days[r.note_date] = { blocks: Array.isArray(r.blocks) ? r.blocks : [] };
      remoteDays.add(r.note_date);
    }
    if (r.note_date === ui.date) renderBlocks();
  }

  function subscribeRealtime() {
    sb.channel('what-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, onAlertChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_notes' }, onDayChange)
      .subscribe();
  }

  async function loadRemote() {
    const [a, d] = await Promise.all([
      sb.from('alerts').select('*').order('created_at'),
      sb.from('day_notes').select('note_date, blocks'),
    ]);
    if (a.error || d.error) throw a.error || d.error;
    state.alerts = a.data.map(fromRow);
    state.days = {};
    remoteDays.clear();
    for (const r of d.data) {
      state.days[r.note_date] = { blocks: Array.isArray(r.blocks) ? r.blocks : [] };
      remoteDays.add(r.note_date);
    }
  }

  const loginEl = $('#login');
  function showLogin(msg) {
    document.body.classList.add('locked');
    loginEl.hidden = false;
    $('#loginMsg').textContent = msg || '';
  }

  let booted = false;
  async function startRemote(session) {
    if (booted) return;
    me = session.user;
    const { data: isMember, error } = await sb.rpc('is_team_member');
    if (error || !isMember) {
      await sb.auth.signOut();
      showLogin(error ? 'Could not verify your access. Please try again.' : `${me.email} is not on the team list. Ask an admin to add it.`);
      return;
    }
    try {
      await loadRemote();
    } catch (err) {
      console.error(err);
      showLogin('Could not load the data. Please refresh and try again.');
      return;
    }
    booted = true;
    loginEl.hidden = true;
    document.body.classList.remove('locked');
    renderAll();
    subscribeRealtime();
  }

  async function signOut() {
    await flush();
    await sb.auth.signOut();
    location.reload();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!email) return;
    $('#loginMsg').textContent = 'Sending…';
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    $('#loginMsg').textContent = error ? `Couldn't send the link: ${error.message}` : 'Check your email and open the link to sign in.';
  });

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  document.title = state.title || 'What Happened Today';
  if (!REMOTE) {
    renderAll();
  } else {
    document.body.classList.add('locked');
    sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT' && booted) location.reload(); });
    sb.auth.getSession().then(({ data }) => (data.session ? startRemote(data.session) : showLogin()));
  }
})();
