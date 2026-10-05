import { cn } from '@lib/utils';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Skeleton } from '@components/ui/skeleton';
import { Spinner } from '@components/ui/spinner';
import { Search } from 'lucide-react';
import { HealthDot } from '@generated/components/Pills';

const SKELETONS = ['s1', 's2', 's3', 's4', 's5', 's6'];

export default function ClientList({
  items, loading, refetching, loadingMore, cursor, onLoadMore,
  selectedId, onSelect, search, onSearchChange, product, onProductChange,
}) {

  return (
    <>
      <div className="px-5 pt-5 pb-4 flex-shrink-0 space-y-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight font-[family-name:var(--font-heading)]">Client Reporting</h1>
          <p className="text-xs text-muted-foreground">Today's status per client</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search clients..." className="pl-9 rounded-lg" />
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {[{ v: 'all', l: 'All' }, { v: 'Comments', l: 'Comments' }, { v: 'Impersonators', l: 'Impersonators' }].map(f => (
            <button key={f.v} onClick={() => onProductChange(f.v)}
              className={cn('flex-1 px-2 py-1.5 text-xs font-medium rounded-md min-h-[32px] transition-all',
                product === f.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className={cn('px-3 pb-3 space-y-0.5 transition-opacity', refetching && 'opacity-50')}>
          {loading ? SKELETONS.map(k => (
            <div key={k} className="p-3 space-y-2"><Skeleton className="h-3.5 w-2/3 rounded-full" /><Skeleton className="h-3 w-1/2 rounded-full" /></div>
          )) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No clients found</p>
          ) : items.map(c => (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={cn('w-full text-left p-3 rounded-xl transition-colors min-h-[44px]',
                selectedId === c.id ? 'bg-secondary' : 'hover:bg-secondary/50')}>
              <div className="flex items-center gap-2">
                <HealthDot health={c.health} />
                <span className="text-sm font-semibold truncate flex-1">{c.name}</span>
                {c.commsFlag && c.commsFlag !== 'OK' && (
                  <span className="text-[10px] font-semibold text-destructive whitespace-nowrap">{c.commsFlag}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 pl-4">
                {[c.industry, c.csOwner?.map(p => p.name).join(', ')].filter(Boolean).join(' · ') || '—'}
              </p>
            </button>
          ))}
          {cursor && !loading && (
            <Button variant="ghost" onClick={onLoadMore} disabled={loadingMore} className="w-full mt-2 gap-2">
              {loadingMore && <Spinner className="h-4 w-4" />} Load more
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
