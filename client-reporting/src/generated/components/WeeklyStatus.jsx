import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Spinner } from '@components/ui/spinner';
import { Skeleton } from '@components/ui/skeleton';
import { toast } from 'sonner';
import { clientsBoard } from '@generated/hooks/useClients';
import MonthGroups from '@generated/components/MonthGroups';

const stamp = d => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Saving sets the board's Weekly Status column and also logs a "[Weekly]" update so history is kept per month.
export default function WeeklyStatus({ item, patchLocal, history, loading, post }) {
  const [draft, setDraft] = useState(item.weeklyStatus ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = draft.trim() && draft !== (item.weeklyStatus ?? '');

  const save = async () => {
    const prev = item.weeklyStatus;
    patchLocal(item.id, { weeklyStatus: draft });
    setSaving(true);
    try {
      await Promise.all([
        clientsBoard.item(item.id).update({ weeklyStatus: draft }).execute(),
        post(`[Weekly] ${draft.replace(/\n+/g, ' ').trim()}`),
      ]);
      toast.success('Weekly status saved');
    } catch (err) {
      console.error('Weekly status save error:', err);
      patchLocal(item.id, { weeklyStatus: prev });
      toast.error('Failed to save weekly status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">This week</p>
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write this week's status..." className="min-h-[140px] resize-y" />
        <div className="flex justify-end mt-2">
          <Button onClick={save} disabled={!dirty || saving} className="gap-2 min-h-[44px] rounded-xl">
            {saving && <Spinner className="h-4 w-4" />} Save status
          </Button>
        </div>
      </div>

      {item.peakEvent && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Peak event{item.peakEventDate && ` · ${item.peakEventDate.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
          <p className="text-sm leading-relaxed">{item.peakEvent}</p>
        </div>
      )}

      {loading ? <Skeleton className="h-20 rounded-xl" /> : history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No weekly status history yet</p>
      ) : (
        <MonthGroups items={history} getDate={r => r.at}
          renderItem={r => (
            <li key={r.id} className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">{stamp(r.at)}{r.author && ` · ${r.author}`}</p>
              <p className="text-sm whitespace-pre-wrap break-words">{r.text}</p>
            </li>
          )} />
      )}
    </div>
  );
}
