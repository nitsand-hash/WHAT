import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Spinner } from '@components/ui/spinner';
import { Send, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { clientsBoard } from '@generated/hooks/useClients';

export default function UpdateBox({ item, onPosted }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const owners = item.csOwner ?? [];

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      const ids = owners.map(p => String(p.id));
      await clientsBoard.item(item.id).post().create(body, ids.length ? ids : undefined).execute();
      await Promise.all(ids.map(id =>
        clientsBoard.item(item.id).notify(id).create(`Update on ${item.name}: ${body}`).execute()
      ));
      onPosted?.(item.id, body);
      toast.success(ids.length ? 'Update posted and owner notified' : 'Update posted');
    } catch (err) {
      console.error('Update post error:', err);
      setText(body);
      toast.error('Failed to post update');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <BellRing className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm font-semibold">Post update &amp; notify</p>
        {owners.length > 0 && (
          <span className="text-xs text-muted-foreground truncate">· notifies {owners.map(p => p.name).join(', ')}</span>
        )}
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What happened today with this client?"
        className="min-h-[140px] bg-card resize-y"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
      />
      <div className="flex justify-end mt-2">
        <Button onClick={send} disabled={!text.trim() || sending} className="gap-2 min-h-[44px] rounded-xl">
          {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          Send update
        </Button>
      </div>
    </div>
  );
}
