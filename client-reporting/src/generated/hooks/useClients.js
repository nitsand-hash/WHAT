import { useState, useEffect, useCallback, useRef } from 'react';
import { DuplicateOfClientsBoard } from '@api/BoardSDK';
import { toast } from 'sonner';

export const clientsBoard = new DuplicateOfClientsBoard();
export const COLS = [
  'clientStatus', 'industry', 'health', 'commsFlag', 'lifecycleStage', 'csOwner',
  'weeklyStatus', 'lastTouchpoint', 'lastTouchType', 'nextMonthlyCall', 'renewalDate',
  'peakEvent', 'peakEventDate', 'arr', 'impersCap', 'commCap', 'pocName', 'pocEmail', 'activeSocials', 'signedProducts',
];

export function useClients(status, search) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const reqRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    const req = ++reqRef.current;
    if (firstRef.current) setLoading(true); else setRefetching(true);
    (async () => {
      try {
        const where = { group: ['topics'] };
        if (status !== 'all') where.signedProducts = [status];
        if (search) where.name = { contains: search };
        let q = clientsBoard.items().withColumns(COLS);
        q = q.where(where);
        const res = await q.orderBy({ column: 'name', direction: 'asc' }).withPagination({ limit: 25 }).execute();
        if (req !== reqRef.current) return;
        setItems(res.items);
        setCursor(res.cursor || null);
      } catch (err) {
        console.error('Clients fetch error:', err);
        toast.error('Failed to load clients');
      } finally {
        if (req === reqRef.current) { setLoading(false); setRefetching(false); firstRef.current = false; }
      }
    })();
  }, [status, search]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const req = reqRef.current;
    try {
      const res = await clientsBoard.items().withPagination({ cursor }).execute();
      if (req !== reqRef.current) return;
      setItems(prev => [...prev, ...res.items]);
      setCursor(res.cursor || null);
    } catch (err) {
      console.error('Load more error:', err);
      toast.error('Failed to load more clients');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const patchLocal = useCallback((id, patch) => {
    setItems(curr => curr.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  return { items, cursor, loading, refetching, loadingMore, loadMore, patchLocal };
}

export function useStatusCounts() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    clientsBoard.aggregate().groupBy('clientStatus').countItems('count').execute()
      .then(r => setRows(r ?? []))
      .catch(err => console.error('Counts error:', err));
  }, []);
  return rows;
}
