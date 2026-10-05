import { useState } from 'react';
import { cn } from '@lib/utils';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Spinner } from '@components/ui/spinner';
import { toast } from 'sonner';
import ReportTimeline from '@generated/components/ReportTimeline';
import SopPage from '@generated/components/SopPage';

const SECTIONS = [
  { id: 'Update', label: 'Updates', ph: 'Write an update about comments...' },
  { id: 'Trends', label: 'Trends', ph: 'Volume, sentiment, recurring themes...' },
  { id: 'Moderation', label: 'Last moderation', ph: 'What was hidden/removed and when...' },
  { id: 'SOP', label: "SOP's" },
];
// Older reports were saved as Daily/Weekly with fields — show them under Updates.
const sectionOf = r => (['Trends', 'Moderation', 'SOP'].includes(r.cadence) ? r.cadence : 'Update');
const legacyText = r => (['Daily', 'Weekly'].includes(r.cadence) && Object.keys(r.fields ?? {}).length
  ? Object.entries(r.fields).map(([k, v]) => `${k}: ${v}`).join('\n') : r.text);

export default function CommentsTab({ reports, loading, post }) {
  const [section, setSection] = useState('Update');
  const current = SECTIONS.find(s => s.id === section);
  const list = reports.filter(r => sectionOf(r) === section);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap flex-shrink-0 min-h-[32px]',
              section === s.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {s.label}
          </button>
        ))}
      </div>
      {section === 'SOP'
        ? <SopPage versions={list} loading={loading} post={post} />
        : <Feed key={section} section={current} list={list} loading={loading} post={post} />}
    </div>
  );
}

function Feed({ section, list, loading, post }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try { await post(`[Comments · ${section.id}] ${body}`); setText(''); toast.success(`${section.label} saved`); }
    catch (err) { console.error('Comments post error:', err); toast.error('Failed to save'); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span className="text-sm font-semibold text-foreground">New {section.label.toLowerCase()} entry</span>
          <span>{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        </div>
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={section.ph}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          className="min-h-[120px] bg-card resize-y" />
        <div className="flex justify-end mt-2">
          <Button onClick={submit} disabled={!text.trim() || sending} className="gap-2 min-h-[44px] rounded-xl">
            {sending && <Spinner className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>
      <ReportTimeline reports={list} loading={loading} empty={`No ${section.label.toLowerCase()} entries yet`}
        renderFields={(_, r) => <p className="whitespace-pre-wrap break-words text-foreground/90">{legacyText(r)}</p>} />
    </div>
  );
}
