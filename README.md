# Lead Board

A local Kanban-style board for tracking job-prospecting leads through stages,
with a Google Sheet as the database.

## Start it

```powershell
cd C:\Users\alxbb\OneDrive\Documents\lead-board
npm install   # only the first time
npm run dev
```

Then open http://localhost:5173 in your browser. Press `Ctrl+C` in the terminal to stop it.

Until a Google Sheet is connected, the board runs on **demo data** stored in your browser.
To connect your Sheet, follow [SHEET_SETUP.md](SHEET_SETUP.md). To put it online, follow [DEPLOY.md](DEPLOY.md).

## Where things live

| Path | What it is |
| --- | --- |
| `src/types.ts` | Data model (`Lead`, stages, priority) |
| `src/lib/constants.ts` | Stages (columns), priorities |
| `src/lib/useLeads.ts` | All lead state, saving and refreshing |
| `src/lib/storage/` | Browser side of storage: `api.ts` talks to our server; `local.ts` is demo data, used when the server has no Sheet settings |
| `api/board.ts` | Server function (runs on Vercel, or inside `npm run dev` locally): login check, holds the Sheet URL and key |
| `apps-script/Code.gs` | The script you paste into the Google Sheet |
| `src/data/seed.ts` | Invented demo leads |
| `src/components/` | Board, Column, LeadCard, Toolbar (search/filters), LeadDrawer, SyncStatus, LoginScreen |
| `scripts/fake-sheet-server.mjs` | Local stand-in for Google, for testing (`npm run fake-sheet`) |
| `.env.local` | Your Sheet URL, secret key and optional password (private, not saved to git) |
