// Local stand-in for the hosted board SDK. It mimics the query-builder API used by the app
// (items/aggregate/item(...).post/notify/update) on top of in-memory seed data, persisting
// posted updates and column edits in localStorage so the demo behaves like a real board.
import { BASE_CLIENTS, UPDATES, IMPO_ROWS } from './seed';

const STORE = 'client-reporting.demo.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) ?? {}; } catch { return {}; } };
const save = s => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage unavailable */ } };
const delay = (v) => new Promise(r => setTimeout(() => r(v), 120));

const DATE_COLS = ['lastTouchpoint', 'nextMonthlyCall', 'renewalDate', 'peakEventDate', 'updatedAt'];
const reviveDates = o => { DATE_COLS.forEach(k => { if (typeof o[k] === 'string') o[k] = new Date(o[k]); }); return o; };

function clients() {
  const patches = load().patches ?? {};
  return BASE_CLIENTS.map(c => ({ ...c, ...reviveDates({ ...(patches[c.id] ?? {}) }) }));
}
function updatesFor(id) {
  const extra = (load().updates ?? []).filter(u => u.itemId === id);
  return [...extra, ...UPDATES.filter(u => u.itemId === id)];
}

function matches(item, where = {}) {
  return Object.entries(where).every(([k, cond]) => {
    if (k === 'group') return true;
    const v = item[k];
    if (Array.isArray(cond)) return Array.isArray(v) ? cond.some(c => v.includes(c)) : cond.includes(v);
    if (cond && typeof cond === 'object' && 'contains' in cond) return String(v ?? '').toLowerCase().includes(String(cond.contains).toLowerCase());
    return v === cond;
  });
}

class ItemsQuery {
  constructor(source, state = {}) { this.source = source; this.s = { cols: null, withUpdates: false, where: {}, order: null, limit: 25, cursor: null, ...state }; }
  _with(patch) { return new ItemsQuery(this.source, { ...this.s, ...patch }); }
  withColumns(cols) { return this._with({ cols }); }
  withUpdates() { return this._with({ withUpdates: true }); }
  where(where) { return this._with({ where }); }
  orderBy(order) { return this._with({ order }); }
  withPagination({ limit, cursor } = {}) {
    if (cursor) {
      // The cursor carries the original query so follow-up pages need no extra context.
      const saved = JSON.parse(atob(cursor));
      return this._with({ ...saved.s, offset: saved.offset, cursor });
    }
    return this._with({ limit: limit ?? this.s.limit, offset: 0 });
  }
  async execute() {
    let rows = this.source().filter(i => matches(i, this.s.where));
    if (this.s.order) {
      const { column, direction } = this.s.order;
      rows = [...rows].sort((a, b) => {
        const x = a[column], y = b[column];
        const c = x instanceof Date ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
        return direction === 'desc' ? -c : c;
      });
    }
    const offset = this.s.offset ?? 0;
    const page = rows.slice(offset, offset + this.s.limit);
    const next = offset + this.s.limit < rows.length
      ? btoa(JSON.stringify({ s: { where: this.s.where, order: this.s.order, limit: this.s.limit, withUpdates: this.s.withUpdates }, offset: offset + this.s.limit }))
      : null;
    const items = page.map(i => (this.s.withUpdates && i.updatedAt ? { ...i, updates: updatesFor(i.id) } : { ...i }));
    return delay({ items, cursor: next });
  }
}

class AggregateQuery {
  constructor(source, state = {}) { this.source = source; this.s = { by: null, where: {}, ...state }; }
  groupBy(by) { return new AggregateQuery(this.source, { ...this.s, by }); }
  where(where) { return new AggregateQuery(this.source, { ...this.s, where }); }
  countItems(name) { return new AggregateQuery(this.source, { ...this.s, name }); }
  async execute() {
    const counts = new Map();
    this.source().filter(i => matches(i, this.s.where)).forEach(i => {
      const k = i[this.s.by];
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return delay([...counts].map(([k, n]) => ({ [this.s.by]: k, [this.s.name ?? 'count']: n })));
  }
}

class ItemHandle {
  constructor(id) { this.id = id; }
  withUpdates() { return { execute: () => delay({ updates: updatesFor(this.id) }) }; }
  post() {
    return {
      create: (body) => ({
        execute: async () => {
          const s = load();
          const u = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, itemId: this.id, created_at: new Date().toISOString(), text_body: body, creator: { name: 'You' } };
          s.updates = [u, ...(s.updates ?? [])];
          s.patches = { ...(s.patches ?? {}), [this.id]: { ...(s.patches?.[this.id] ?? {}), lastTouchpoint: new Date().toISOString() } };
          save(s);
          return delay(u);
        },
      }),
    };
  }
  notify() { return { create: () => ({ execute: () => delay({ ok: true }) }) }; }
  update(patch) {
    return {
      execute: async () => {
        const s = load();
        s.patches = { ...(s.patches ?? {}), [this.id]: { ...(s.patches?.[this.id] ?? {}), ...patch } };
        save(s);
        return delay({ ok: true });
      },
    };
  }
}

class Board {
  constructor(source) { this._source = source; }
  items() { return new ItemsQuery(this._source); }
  aggregate() { return new AggregateQuery(this._source); }
  item(id) { return new ItemHandle(id); }
}

export class DuplicateOfClientsBoard extends Board { constructor() { super(clients); } }
export class ImpoBoard extends Board { constructor() { super(() => IMPO_ROWS); } }
