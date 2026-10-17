# Running Service Info from the Admin panel

Everything below is done in **Admin** (sidebar → Admin). No code or AI needed.

## People
**Allowed Users** tab — add/remove people, reset passwords, and tick which dashboards each person can open.
**Access by dashboard** (same tab) — the same thing, viewed per dashboard.

## Pages & Sidebar
Controls every sidebar link and home-page card.
- **Hide / retire a dashboard:** switch *Visible* off. Nothing gets deleted.
- **Rename, re-icon, reorder:** *Edit* or the ↑ ↓ buttons.
- **Add a new dashboard:** upload its `.html` file to GitHub (repo → *Add file → Upload files*), then *+ Add page* and type the file name.
- **Who can open it:** the page's *permission keys*. A new key shows up as a checkbox under Allowed Users after you save.
- **Edit a dashboard's content:** edit its `.html` file directly in GitHub (pencil icon). Each dashboard is its own file now.

## Roles
Special rights inside dashboards: MSL *Sync now*, MSL new view, Bounce Back power user / weights / approver / mark Paid, HO decisions, and **Sync alerts** (who gets alert emails). Use *+ Give to…* and ×.

## System Health & Syncs
- **Data freshness** — is each dataset up to date?
- **Scheduled syncs** — *Run now*, *Pause/Resume*, *Edit* (name, time in IST, alert emails on/off).
- **Freshness checks** — add/edit what's watched and how fresh it should be.

## One-time setup: alert emails
1. Supabase → **Edge Functions → Deploy a new function** → name it `sync-alerts`, paste `supabase/functions/sync-alerts/index.ts`, turn **Verify JWT off**, deploy.
2. Supabase → **SQL Editor** → run `supabase/schedule_sync_alerts.sql`.

## What still needs code
New dashboards or new charts/metrics inside a dashboard. Everything else is in Admin.
