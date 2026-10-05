import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { clientsBoard, COLS } from '@generated/hooks/useClients';

const isToday = d => d && new Date(d).toDateString() === new Date().toDateString();
const TAG = /^\s*\[(Comments|Impersonators|Weekly)(?:\s*·\s*([^\]]+))?\]\s*/i;

export function categorize(text = '') {
  const m = text.match(TAG);
  if (!m) return { category: 'Update', sub: null, body: text };
  return { category: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), sub: m[2]?.trim() ?? null, body: text.slice(m[0].length).trim() };
}

// Active clients, most recently changed first, each with its updates; today's entries are derived per page.
export function useTodayFeed() {
  const [clients, setClients] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async c => {
    let q = clientsBoard.items().withColumns(COLS).withUpdates();
    q = c ? q.withPagination({ cursor: c })
      : q.where({ group: ['topics'] }).orderBy({ column: 'updatedAt', direction: 'desc' }).withPagination({ limit: 25 });
    return q.execute();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPage(null)
      .then(res => { if (!cancelled) { setClients(res.items ?? []); setCursor(res.cursor || null); } })
      .catch(err => { console.error('Today feed error:', err); toast.error("Failed to load today's activity"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchPage(cursor);
      setClients(prev => [...prev, ...(res.items ?? [])]);
      setCursor(res.cursor || null);
    } catch (err) {
      console.error('Today feed load more error:', err);
      toast.error('Failed to load more clients');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchPage]);

  const entries = clients.flatMap(c => (c.updates ?? [])
    .filter(u => isToday(u.created_at))
    .map(u => ({ id: u.id, client: c, at: new Date(u.created_at), author: u.creator?.name, ...categorize(u.text_body) })))
    .sort((a, b) => b.at - a.at);
  const touchedToday = clients.filter(c => isToday(c.lastTouchpoint) || (c.updates ?? []).some(u => isToday(u.created_at)));

  return { clients, entries, touchedToday, cursor, loading, loadingMore, loadMore };
}

// Board-wide health/comms breakdown for active clients.
export function useStatusSummary() {
  const [summary, setSummary] = useState({ health: [], comms: [] });
  useEffect(() => {
    Promise.all([
      clientsBoard.aggregate().groupBy('health').where({ clientStatus: 'Active' }).countItems('count').execute(),
      clientsBoard.aggregate().groupBy('commsFlag').where({ clientStatus: 'Active' }).countItems('count').execute(),
    ])
      .then(([health, comms]) => setSummary({ health: health ?? [], comms: comms ?? [] }))
      .catch(err => console.error('Summary aggregate error:', err));
  }, []);
  return summary;
}
