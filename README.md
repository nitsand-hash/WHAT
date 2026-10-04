# WHAT – What Happened Today

A Notion-style daily dashboard for logging customer alerts and writing a daily summary.
No build step: open `index.html` in a browser (or serve the folder with any static server).

## What's inside

- **Daily summary** – block editor per day. Type `/` for commands (text, headings, bullets, to-dos, quote, callout, divider) or use markdown shortcuts (`# `, `## `, `- `, `[] `, `> `).
- **Customer alerts** – a database you edit inline, with Table and Board views (drag cards between statuses), filters, search and a side panel for notes.
  - Properties: Customer, Type (Impersonator / Comment moderation / Account security / Other), Severity, Status, Platform, Date, Notes.
- **Day navigation** – sidebar, prev/next/today buttons and a date picker; stats cards summarise the selected day.

## Data

By default everything is stored in the browser's `localStorage` (key `what.v1`). Use **Export backup / Import backup** in the sidebar to move data between browsers.

## Shared team mode + Slack (optional)

Fill in `config.js` to switch to a shared Supabase database with email login and live updates, and deploy the functions in `supabase/functions` to connect Slack:

- `@WHAT …` in Slack creates an alert (keyword parser, or Claude if `ANTHROPIC_API_KEY` is set).
- New High/Critical alerts, status changes and a daily summary are posted back to Slack.

Step-by-step instructions (Hebrew): [SETUP.md](SETUP.md). Unit tests for the Slack logic: `node --test tests/`.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` publishes the site on every push to the default branch (`main` or the current feature branch).
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
