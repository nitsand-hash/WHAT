import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { cn } from '@lib/utils';
import { Toaster } from '@components/ui/sonner';
import { LayoutDashboard, Users } from 'lucide-react';
import ClientList from '@generated/components/ClientList';
import ClientDetail from '@generated/components/ClientDetail';
import WhatDashboard from '@generated/components/WhatDashboard';
import { useClients } from '@generated/hooks/useClients';

export default function App() {
  const [view, setView] = useState('what');
  const [selectedId, setSelectedId] = useState(null);
  const [opened, setOpened] = useState(null); // client opened from the dashboard
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState('all');
  const debounced = useDebounce(search.trim(), 300);
  const { items, cursor, loading, refetching, loadingMore, loadMore, patchLocal } = useClients(product, debounced);
  const selected = items.find(i => i.id === selectedId) ?? (opened?.id === selectedId ? opened : undefined);

  useEffect(() => {
    if (view === 'clients' && !selectedId && items.length && window.innerWidth >= 768) setSelectedId(items[0].id);
  }, [items, selectedId, view]);

  const handlePosted = useCallback(id => patchLocal(id, { lastTouchpoint: new Date() }), [patchLocal]);
  const openClient = useCallback(c => { setOpened(c); setSelectedId(c.id); setView('clients'); }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background p-3 md:p-4 gap-3">
      <nav className="flex gap-1 bg-card rounded-xl p-1 shadow-sm self-start">
        {[{ id: 'what', label: 'WHAT', icon: LayoutDashboard }, { id: 'clients', label: 'Clients', icon: Users }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg min-h-[40px] transition-colors',
              view === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </nav>

      {view === 'what' ? (
        <div className="flex-1 min-h-0 bg-card rounded-2xl shadow-sm overflow-hidden">
          <WhatDashboard onOpenClient={openClient} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-3 md:gap-4">
          <div className={cn('flex-col w-full md:w-[340px] lg:w-[380px] flex-shrink-0 bg-card rounded-2xl shadow-sm overflow-hidden',
            selectedId ? 'hidden md:flex' : 'flex')}>
            <ClientList
              items={items} loading={loading} refetching={refetching} loadingMore={loadingMore}
              cursor={cursor} onLoadMore={loadMore} selectedId={selectedId} onSelect={setSelectedId}
              search={search} onSearchChange={setSearch} product={product} onProductChange={setProduct}
            />
          </div>
          <div className={cn('flex-1 min-w-0 flex-col overflow-hidden bg-card rounded-2xl shadow-sm',
            selectedId ? 'flex' : 'hidden md:flex')}>
            <ClientDetail item={selected} onBack={() => setSelectedId(null)} onPosted={handlePosted} patchLocal={patchLocal} />
          </div>
        </div>
      )}
      <Toaster position="top-right" />
    </div>
  );
}
