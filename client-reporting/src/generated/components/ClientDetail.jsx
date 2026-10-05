import { useState, useEffect, useMemo } from 'react';
import { cn } from '@lib/utils';
import { ArrowLeft, Users } from 'lucide-react';
import { HealthDot, Pill } from '@generated/components/Pills';
import ClientUpdates from '@generated/components/ClientUpdates';
import WeeklyStatus from '@generated/components/WeeklyStatus';
import CommentsTab from '@generated/components/CommentsTab';
import ImpersonatorsTab from '@generated/components/ImpersonatorsTab';
import { useItemUpdates, parseReport } from '@generated/hooks/useItemUpdates';

const fmt = d => d?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ClientDetail({ item, onBack, onPosted, patchLocal }) {
  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select a client</p>
        </div>
      </div>
    );
  }
  return <ClientPage key={item.id} item={item} onBack={onBack} onPosted={onPosted} patchLocal={patchLocal} />;
}

function ClientPage({ item, onBack, onPosted, patchLocal }) {
  const products = item.signedProducts ?? [];
  const hasComments = products.includes('Comments');
  const hasImpers = products.includes('Impersonators');
  const tabs = [
    { id: 'info', label: 'Info' },
    hasComments && { id: 'comments', label: 'Comments' },
    hasImpers && { id: 'impersonators', label: 'Impersonators' },
    { id: 'updates', label: 'Updates' },
    { id: 'weekly', label: 'Weekly status' },
  ].filter(Boolean);
  const [tab, setTab] = useState('info');
  useEffect(() => { setTab('info'); }, [item.id]);

  const { updates, loading, addLocal, post } = useItemUpdates(item.id);
  const reports = useMemo(() => updates.map(parseReport).filter(Boolean), [updates]);
  const commentReports = reports.filter(r => r.product === 'comments');
  const impersReports = reports.filter(r => r.product === 'impersonators');
  const weeklyReports = reports.filter(r => r.product === 'weekly').sort((a, b) => b.at - a.at);
  const touchedToday = item.lastTouchpoint?.toDateString?.() === new Date().toDateString();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 md:px-6 pt-5 flex-shrink-0 border-b border-border">
        <button onClick={onBack} className="md:hidden flex items-center gap-1.5 text-sm font-medium text-primary min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <HealthDot health={item.health} />
          <h2 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-heading)] truncate">{item.name}</h2>
          {hasComments && <span className="text-[11px] font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">Comments</span>}
          {hasImpers && <span className="text-[11px] font-semibold bg-accent text-accent-foreground rounded-full px-2.5 py-0.5">Impersonators</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {touchedToday ? `Reported today via ${item.lastTouchType ?? 'touchpoint'}` : `Last touchpoint: ${fmt(item.lastTouchpoint) ?? 'none'}`}
        </p>
        <div className="flex gap-5 mt-4 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('pb-2.5 text-sm font-medium border-b-2 -mb-px min-h-[40px] whitespace-nowrap transition-colors',
                tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-5 md:p-6">
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Pill label="Status" value={item.clientStatus} />
              <Pill label="Health" value={item.health} />
              <Pill label="Comms" value={item.commsFlag} />
              <Pill label="Lifecycle" value={item.lifecycleStage} />
              <Pill label="Industry" value={item.industry} />
              <Pill label="CS owner" value={item.csOwner?.map(p => p.name).join(', ')} />
              <Pill label="Next call" value={fmt(item.nextMonthlyCall)} />
              <Pill label="Renewal" value={fmt(item.renewalDate)} />
              <Pill label="ARR" value={item.arr != null ? `$${Number(item.arr).toLocaleString()}` : null} />
              <Pill label="POC" value={item.pocName} />
              <Pill label="POC email" value={item.pocEmail} />
              <Pill label="Products" value={products.join(', ')} />
            </div>
            {item.activeSocials?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.activeSocials.map(s => <span key={s} className="text-xs bg-secondary rounded-full px-2.5 py-1">{s}</span>)}
              </div>
            )}
          </div>
        )}
        {tab === 'comments' && <CommentsTab reports={commentReports} loading={loading} post={post} />}
        {tab === 'impersonators' && <ImpersonatorsTab reports={impersReports} loading={loading} post={post} cap={item.impersCap} clientName={item.name} />}
        {tab === 'updates' && <ClientUpdates item={item} updates={updates} loading={loading} addLocal={addLocal} onPosted={onPosted} />}
        {tab === 'weekly' && <WeeklyStatus item={item} patchLocal={patchLocal} history={weeklyReports} loading={loading} post={post} />}
      </div>
    </div>
  );
}
