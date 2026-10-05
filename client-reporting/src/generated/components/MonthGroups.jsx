// Groups items (already newest-first) under month headings.
export default function MonthGroups({ items, getDate, renderItem }) {
  const groups = [];
  items.forEach(it => {
    const d = getDate(it);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), items: [] }; groups.push(g); }
    g.items.push(it);
  });

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <section key={g.key}>
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-1.5 mb-2 flex items-baseline justify-between border-b border-border">
            <h4 className="text-sm font-semibold">{g.label}</h4>
            <span className="text-xs text-muted-foreground tabular-nums">{g.items.length} {g.items.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          <ol className="space-y-3">{g.items.map(renderItem)}</ol>
        </section>
      ))}
    </div>
  );
}
