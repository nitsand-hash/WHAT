import { Skeleton } from '@components/ui/skeleton';
import { Clock } from 'lucide-react';

const stamp = d => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ReportTimeline({ reports, loading, renderFields, empty }) {
  if (loading) return <div className="space-y-3"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div>;
  if (!reports.length) return <p className="text-sm text-muted-foreground text-center py-8">{empty}</p>;
  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {reports.map(r => (
        <li key={r.id} className="pl-5 relative">
          <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mb-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium text-foreground">{stamp(r.at)}</span>
            {r.cadence && <span className="bg-secondary rounded-full px-2 py-0.5 font-semibold">{r.cadence}</span>}
            {r.author && <span>· {r.author}</span>}
          </div>
          <div className="rounded-xl border border-border p-3 text-sm space-y-1.5">{renderFields(r.fields, r)}</div>
        </li>
      ))}
    </ol>
  );
}
