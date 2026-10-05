# Client Reporting (WHAT dashboard, React)

React app generated from the "Creative Asset Approvals" export (`src/generated/**`, copied unchanged).
The export imports a hosted board SDK and shadcn-style UI primitives that were not part of the zip, so this
folder supplies local stand-ins:

| Import | Local replacement |
| --- | --- |
| `@api/BoardSDK` | `src/api/BoardSDK.js` – in-memory board with the same query-builder API, seeded by `src/api/seed.js`; posts and column edits persist in `localStorage` |
| `@components/ui/*` | `src/components/ui/*` – button, input, textarea, skeleton, spinner, sonner |
| `@lib/utils` | `src/lib/utils.js` – `cn()` |
| `index.css` | `src/index.css` – Tailwind v4 + token mapping for `theme-tokens.css` |

To connect a real board, replace `src/api/BoardSDK.js` with the real SDK (same `items()/aggregate()/item()` surface).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```
