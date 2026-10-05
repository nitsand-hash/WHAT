import { cn } from '@lib/utils';

const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Last 6 months, plus any older months that have data.
function monthKeys(totals) {
  const now = new Date();
  const keys = new Set();
  for (let i = 5; i >= 0; i--) keys.add(keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  Object.keys(totals).forEach(k => keys.add(k));
  return [...keys].sort();
}

export default function MonthlyTracker({ totals, cap, selected, onSelect }) {
  const keys = monthKeys(totals);
  const max = Math.max(cap || 0, ...keys.map(k => totals[k] ?? 0), 1);

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold">Monthly tracking</p>
        {cap > 0 && <p className="text-xs text-muted-foreground">Cap {cap.toLocaleString()} · red = over cap</p>}
      </div>
      <div className="overflow-x-auto">
        <div className="relative flex items-end gap-2 h-36 min-w-max">
          {keys.map(k => {
            const v = totals[k] ?? 0;
            const over = cap > 0 && v > cap;
            const d = new Date(`${k}-01T00:00:00`);
            return (
              <button key={k} onClick={() => onSelect(k)} aria-pressed={selected === k}
                className={cn('flex flex-col items-center justify-end h-full w-12 rounded-lg pt-1 transition-colors', selected === k ? 'bg-secondary' : 'hover:bg-secondary/50')}>
                <span className="text-[11px] font-semibold tabular-nums mb-1">{v ? v.toLocaleString() : ''}</span>
                <div className="w-6 flex items-end h-[78%]">
                  <div className={cn('w-full rounded-t-md', over ? 'bg-destructive' : selected === k ? 'bg-primary' : 'bg-primary/40')}
                    style={{ height: `${Math.max(v ? 4 : 0, (v / max) * 100)}%` }} />
                </div>
                <span className={cn('text-[11px] mt-1 pb-1', selected === k ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}{d.getMonth() === 0 ? ` '${String(d.getFullYear()).slice(2)}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
