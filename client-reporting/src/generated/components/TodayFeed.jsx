import { CalendarCheck } from 'lucide-react';

const TONE = {
  Comments: 'bg-primary/10 text-primary',
  Impersonators: 'bg-accent text-accent-foreground',
  Weekly: 'bg-secondary text-secondary-foreground',
  Update: 'bg-muted text-muted-foreground',
};
const time = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const pretty = body => body.replace(/\s*¶\s*/g, '\n');

export default function TodayFeed({ entries, onOpenClient }) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <CalendarCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No updates posted today yet</p>
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {entries.map(e => (
        <li key={e.id}>
          <button onClick={() => onOpenClient(e.client)} className="w-full text-left grid grid-cols-[56px_1fr] gap-3 rounded-xl border border-border p-3 hover:bg-secondary/40 transition-colors">
            <span className="text-xs tabular-nums text-muted-foreground pt-0.5">{time(e.at)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-sm font-semibold truncate">{e.client.name}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${TONE[e.category] ?? TONE.Update}`}>
                  {e.category}{e.sub ? ` · ${e.sub}` : ''}
                </span>
                {e.author && <span className="text-xs text-muted-foreground">by {e.author}</span>}
              </div>
              <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap break-words">{pretty(e.body)}</p>
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}
