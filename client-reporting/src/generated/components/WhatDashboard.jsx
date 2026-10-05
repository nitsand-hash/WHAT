import { Skeleton } from '@components/ui/skeleton';
import { Button } from '@components/ui/button';
import { Spinner } from '@components/ui/spinner';
import { Sun } from 'lucide-react';
import { useTodayFeed, useStatusSummary } from '@generated/hooks/useTodayFeed';
import TodayFeed from '@generated/components/TodayFeed';
import { HealthDot } from '@generated/components/Pills';

const countOf = (rows, key, label) => rows.find(r => r[key] === label)?.count ?? 0;

export default function WhatDashboard({ onOpenClient }) {
  const { clients, entries, touchedToday, cursor, loading, loadingMore, loadMore } = useTodayFeed();
  const { health, comms } = useStatusSummary();
  const waitingOnUs = countOf(comms, 'commsFlag', 'Client waiting on us');
  const silent = countOf(comms, 'commsFlag', 'Silent 14d+');
  const red = countOf(health, 'health', 'Red');
  const attention = clients.filter(c => c.health === 'Red' || ['Client waiting on us', 'Silent 14d+'].includes(c.commsFlag));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-5 md:px-8 pt-6 pb-6 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> {today}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 font-[family-name:var(--font-heading)]">What Happened Today</h1>
        <p className="text-sm text-muted-foreground mt-1">Updates and statuses across all active clients</p>

        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-6xl font-light tabular-nums tracking-tight leading-none">{loading ? '–' : entries.length}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">updates posted today</p>
          </div>
          <Stat value={loading ? '–' : touchedToday.length} label="clients touched" />
          <Stat value={waitingOnUs} label="waiting on us" tone={waitingOnUs ? 'text-destructive' : ''} />
          <Stat value={silent} label="silent 14d+" />
          <Stat value={red} label="red health" tone={red ? 'text-destructive' : ''} />
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 px-5 md:px-8 py-6">
        <section className="min-w-0">
          <h2 className="text-lg font-semibold mb-3">Today's feed</h2>
          {loading ? (
            <div className="space-y-3">{['a', 'b', 'c'].map(k => <Skeleton key={k} className="h-20 rounded-xl" />)}</div>
          ) : (
            <TodayFeed entries={entries} onOpenClient={onOpenClient} />
          )}
          {cursor && (
            <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="w-full mt-4 gap-2 rounded-xl min-h-[44px]">
              {loadingMore && <Spinner className="h-4 w-4" />} Check more clients
            </Button>
          )}
        </section>

        <aside className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-2">Needs attention</h2>
            {loading ? <Skeleton className="h-24 rounded-xl" /> : attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing flagged</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {attention.map(c => (
                  <li key={c.id}>
                    <button onClick={() => onOpenClient(c)} className="w-full text-left flex items-center gap-2 px-3 py-2.5 min-h-[44px] hover:bg-secondary/60">
                      <HealthDot health={c.health} />
                      <span className="text-sm font-medium truncate flex-1">{c.name}</span>
                      <span className="text-[11px] text-destructive font-semibold whitespace-nowrap">{c.commsFlag !== 'OK' ? c.commsFlag : c.health}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-2">Touched today</h2>
            {loading ? <Skeleton className="h-16 rounded-xl" /> : touchedToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client touched yet today</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {touchedToday.map(c => (
                  <button key={c.id} onClick={() => onOpenClient(c)} className="text-xs bg-secondary hover:bg-accent rounded-full px-2.5 py-1 min-h-[28px]">{c.name}</button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label, tone = '' }) {
  return (
    <div>
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
