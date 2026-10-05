import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Spinner } from '@components/ui/spinner';
import { Skeleton } from '@components/ui/skeleton';
import { FileText, Pencil, History } from 'lucide-react';
import { toast } from 'sonner';

const stamp = d => d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
// SOP text is saved as a single-line update; "¶" marks paragraph breaks.
const decode = t => (t ?? '').replace(/\s*¶\s*/g, '\n');
const encode = t => t.trim().split(/\n+/).join(' ¶ ');

export default function SopPage({ versions, loading, post }) {
  const latest = versions[0];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const startEdit = () => { setDraft(decode(latest?.text)); setEditing(true); };
  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try { await post(`[Comments · SOP] ${encode(draft)}`); setEditing(false); toast.success("SOP's saved"); }
    catch (err) { console.error('SOP save error:', err); toast.error("Failed to save SOP's"); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <article className="rounded-2xl border border-border bg-card">
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Comment moderation SOP's</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {latest ? `Last edited ${stamp(latest.at)}${latest.author ? ` by ${latest.author}` : ''}` : 'Not written yet'}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5 rounded-lg flex-shrink-0">
            <Pencil className="h-3.5 w-3.5" /> {latest ? 'Edit' : 'Write'}
          </Button>
        )}
      </header>

      <div className="px-5 py-5">
        {editing ? (
          <>
            <Textarea value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Rules, keywords to hide, escalation steps, response templates..."
              className="min-h-[280px] resize-y leading-relaxed" />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={save} disabled={!draft.trim() || saving} className="gap-2 rounded-xl">
                {saving && <Spinner className="h-4 w-4" />} Save SOP's
              </Button>
            </div>
          </>
        ) : latest ? (
          <div className="text-sm leading-7 whitespace-pre-wrap break-words max-w-prose">{decode(latest.text)}</div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No SOP's for this client yet. Click Write to create them.</p>
        )}
      </div>

      {versions.length > 1 && (
        <footer className="border-t border-border px-5 py-3">
          <button onClick={() => setShowHistory(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[32px]">
            <History className="h-3.5 w-3.5" /> {showHistory ? 'Hide' : 'Show'} previous versions ({versions.length - 1})
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-3">
              {versions.slice(1).map(v => (
                <li key={v.id} className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{stamp(v.at)}{v.author && ` · ${v.author}`}</p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/80">{decode(v.text)}</p>
                </li>
              ))}
            </ol>
          )}
        </footer>
      )}
    </article>
  );
}
