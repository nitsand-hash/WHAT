import { useState, useEffect, useCallback } from 'react';
import { clientsBoard } from '@generated/hooks/useClients';

// Product reports are stored as tagged item updates, e.g.
// "[Comments · Daily] Trends: ... | Last moderation: ... | SOPs: ..."
// "[Impersonators] Removed: 12 | Note: ..."
const TAG = /^\s*\[(Comments|Impersonators|Weekly)(?:\s*·\s*([^\]]+))?\]\s*/i;

export function parseReport(u) {
  const text = u.text_body ?? '';
  const m = text.match(TAG);
  if (!m) return null;
  const fields = {};
  text.slice(m[0].length).split('|').forEach(part => {
    const i = part.indexOf(':');
    if (i > 0) fields[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  });
  return { id: u.id, product: m[1].toLowerCase(), cadence: m[2]?.trim() ?? null, text: text.slice(m[0].length).trim(), fields, at: new Date(u.created_at), author: u.creator?.name };
}

export function useItemUpdates(itemId) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUpdates([]);
    clientsBoard.item(itemId).withUpdates().execute()
      .then(res => { if (!cancelled) setUpdates(res?.updates ?? []); })
      .catch(err => console.error('Updates fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  const addLocal = useCallback(body => {
    const local = { id: `local-${Date.now()}`, text_body: body, created_at: new Date().toISOString(), creator: { name: 'You' } };
    setUpdates(prev => [local, ...prev]);
    return local.id;
  }, []);
  const removeLocal = useCallback(id => setUpdates(prev => prev.filter(u => u.id !== id)), []);

  const post = useCallback(async body => {
    const id = addLocal(body);
    try {
      await clientsBoard.item(itemId).post().create(body).execute();
    } catch (err) {
      removeLocal(id);
      throw err;
    }
  }, [itemId, addLocal, removeLocal]);

  return { updates, loading, addLocal, post };
}
