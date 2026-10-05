import { cn } from '@lib/utils';

const HEALTH = { Green: 'bg-chart-2', Yellow: 'bg-chart-4', Red: 'bg-destructive' };

export function HealthDot({ health }) {
  return <span className={cn('h-2 w-2 rounded-full flex-shrink-0', HEALTH[health] ?? 'bg-muted-foreground/30')} title={health ?? 'No health'} />;
}

export function Pill({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col bg-secondary rounded-xl px-3 py-2 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
