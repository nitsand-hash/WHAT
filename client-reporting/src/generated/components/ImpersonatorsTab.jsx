import { useState, useMemo } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Spinner } from '@components/ui/spinner';
import { toast } from 'sonner';
import ReportTimeline from '@generated/components/ReportTimeline';
import ImpoDocs from '@generated/components/ImpoDocs';
import MonthlyTracker from '@generated/components/MonthlyTracker';

const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const labelOf = k => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
// An entry belongs to the month it was logged for ("Month: YYYY-MM"), else the month it was posted.
const monthOfReport = r => (/^\d{4}-\d{2}$/.test(r.fields.month ?? '') ? r.fields.month : keyOf(r.at));

export default function ImpersonatorsTab({ reports, loading, post, cap, clientName }) {
  const [month, setMonth] = useState(keyOf(new Date()));
  const [removed, setRemoved] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const capNum = Number(cap) || 0;

  const totals = useMemo(() => {
    const t = {};
    reports.forEach(r => { const k = monthOfReport(r); t[k] = (t[k] ?? 0) + (parseInt(r.fields.removed, 10) || 0); });
    return t;
  }, [reports]);
  const monthReports = reports.filter(r => monthOfReport(r) === month);
  const total = totals[month] ?? 0;
  const pct = capNum ? Math.min(100, Math.round((total / capNum) * 100)) : 0;

  const submit = async () => {
    const n = parseInt(removed, 10);
    if (!(n >= 0)) return;
    const body = `[Impersonators] Removed: ${n} | Month: ${month} | Note: ${note.replace(/[|\n]+/g, ' ').trim() || '—'}`;
    setSending(true);
    try { await post(body); setRemoved(''); setNote(''); toast.success(`Logged for ${labelOf(month)}`); }
    catch (err) { console.error('Impersonators report error:', err); toast.error('Failed to save'); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <ImpoDocs clientName={clientName} />
      <MonthlyTracker totals={totals} cap={capNum} selected={month} onSelect={setMonth} />

      <div className="rounded-2xl border border-border p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Removed · {labelOf(month)}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-bold tabular-nums tracking-tight">{total.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">/ {capNum ? capNum.toLocaleString() : 'no cap set'} monthly cap</span>
        </div>
        {capNum > 0 && (
          <>
            <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
              <div className={pct >= 90 ? 'h-full bg-destructive' : 'h-full bg-primary'} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{pct}% of cap used · {Math.max(0, capNum - total).toLocaleString()} remaining</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
        <p className="text-sm font-semibold">Log removals for {labelOf(month)}</p>
        <Input type="number" min="0" value={removed} onChange={e => setRemoved(e.target.value)} placeholder="Number of impersonators removed" className="bg-card" />
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Weekly status / notes (platforms, notable accounts...)" className="min-h-[80px] bg-card" />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={removed === '' || sending} className="gap-2 min-h-[44px] rounded-xl">
            {sending && <Spinner className="h-4 w-4" />} Save update
          </Button>
        </div>
      </div>

      <ReportTimeline reports={monthReports} loading={loading} empty={`No updates for ${labelOf(month)}`}
        renderFields={f => (
          <>
            <p><span className="font-semibold">Removed:</span> <span className="tabular-nums">{f.removed ?? '0'}</span></p>
            {f.note && f.note !== '—' && <p className="text-foreground/80">{f.note}</p>}
          </>
        )} />
    </div>
  );
}
