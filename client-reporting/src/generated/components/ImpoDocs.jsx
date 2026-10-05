import { useState, useEffect } from 'react';
import { ImpoBoard } from '@api/BoardSDK';
import { Skeleton } from '@components/ui/skeleton';
import { FileText, ExternalLink } from 'lucide-react';

const impoBoard = new ImpoBoard();

// Impo rows link to clients by relation; match on the linked client's name, falling back to the row name.
export default function ImpoDocs({ clientName }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const cols = ['loa', 'trademarkDoc'];
        let res = await impoBoard.items().withColumns(cols).where({ clients: { contains: clientName } }).withPagination({ limit: 1 }).execute();
        if (!res.items?.length) {
          res = await impoBoard.items().withColumns(cols).where({ name: { contains: clientName } }).withPagination({ limit: 1 }).execute();
        }
        if (!cancelled) setRow(res.items?.[0] ?? null);
      } catch (err) {
        console.error('Impo fetch error:', err);
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientName]);

  if (loading) return <Skeleton className="h-16 rounded-2xl" />;

  const docs = [{ label: 'LOA', link: row?.loa }, { label: 'Trademark', link: row?.trademarkDoc }];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {docs.map(d => (
        d.link?.url ? (
          <a key={d.label} href={d.link.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border p-3 min-h-[56px] hover:bg-secondary/60 transition-colors min-w-0">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{d.label}</p>
              <p className="text-sm truncate">{d.link.label || d.link.url}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </a>
        ) : (
          <div key={d.label} className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 min-h-[56px]">
            <FileText className="h-4 w-4 text-muted-foreground/50" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{d.label}</p>
              <p className="text-sm text-muted-foreground">Not provided</p>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
