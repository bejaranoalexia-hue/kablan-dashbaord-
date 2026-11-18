# Lead Board

A local Kanban-style board for tracking leads through a sales pipeline.

## Start it

```powershell
cd C:\Users\alxbb\OneDrive\Documents\lead-board
npm install   # only the first time
npm run dev
```

Then open http://localhost:5173 in your browser. Press `Ctrl+C` in the terminal to stop it.

## Where things live

| Path | What it is |
| --- | --- |
| `src/types.ts` | Data model (`Lead`, stages, status) |
| `src/data/seed.ts` | Invented sample leads |
| `src/lib/storage.ts` | Saving/loading (currently `localStorage`; swap for SQLite/Supabase later) |
| `src/lib/useLeads.ts` | All lead state and actions (move, update, reset) |
| `src/lib/constants.ts` | Stages (columns), sources, status labels |
| `src/components/` | Board, Column, LeadCard, Toolbar (search/filters), LeadDrawer |

Data is stored in your browser only. "Reset sample data" in the toolbar restores the seed leads.
