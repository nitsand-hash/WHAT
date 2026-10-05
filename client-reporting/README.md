# Client Reporting (WHAT dashboard, React)

React app generated from the "Creative Asset Approvals" export (`src/generated/**`, copied unchanged).
The export imports a hosted board SDK and shadcn-style UI primitives that were not part of the zip, so this
folder supplies local stand-ins:

| Import | Local replacement |
| --- | --- |
| `@api/BoardSDK` | `src/api/BoardSDK.js` – in-memory board with the same query-builder API; posts and column edits persist in `localStorage` |
| `@components/ui/*` | `src/components/ui/*` – button, input, textarea, skeleton, spinner, sonner |
| `@lib/utils` | `src/lib/utils.js` – `cn()` |
| `index.css` | `src/index.css` – Tailwind v4 + token mapping for `theme-tokens.css` |

## Using your own data

```
pip install openpyxl
python3 scripts/import-xlsx.py path/to/board-export.xlsx   # writes src/api/data.json
```

The script imports the **Active** clients and their updates (name, owner, products, impersonator and comment caps,
health, renewal, POC, socials, weekly status, ...) and leaves out credentials and internal links.
`src/api/data.json` is git-ignored because it contains real client data (this repo is public). Without it the app
shows the demo data from `src/api/seed.js`.

To connect a real board, replace `src/api/BoardSDK.js` with the real SDK (same `items()/aggregate()/item()` surface).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```
