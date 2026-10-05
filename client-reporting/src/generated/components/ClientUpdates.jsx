import { Skeleton } from '@components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import UpdateBox from '@generated/components/UpdateBox';
import MonthGroups from '@generated/components/MonthGroups';

const fmt = s => new Date(s).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ClientUpdates({ item, updates, loading, addLocal, onPosted }) {
  const handlePosted = (id, body) => { addLocal(body); onPosted?.(id); };
  const sorted = [...updates].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-5">
      <UpdateBox item={item} onPosted={handlePosted} />
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No updates yet</p>
        </div>
      ) : (
        <MonthGroups items={sorted} getDate={u => new Date(u.created_at)}
          renderItem={u => (
            <li key={u.id} className="rounded-xl border border-border p-4">
              <div className="flex justify-between gap-2 mb-1.5 text-xs">
                <span className="font-semibold">{u.creator?.name ?? 'Unknown'}</span>
                <span className="text-muted-foreground whitespace-nowrap">{fmt(u.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{u.text_body}</p>
            </li>
          )} />
      )}
    </div>
  );
}
