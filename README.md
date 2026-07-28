# Customer Map — Vercel + Google Sheets (via Apps Script)

Plain HTML/CSS/JS frontend on Vercel, backed by a Google Sheet — with no
Google Cloud Console, no service account, and no billing setup at all.
Instead, a small Apps Script Web App (built into the Sheet itself) exposes
your data to Vercel.

## 1. Google Sheet structure

Two tabs, exact header names in row 1:

**Credentials**
| Employee ID | Name | Password Hash | Role |
|---|---|---|---|

**Customers** (extra columns like Location/Industry are fine to keep — the
app only reads the ones it needs, by name)
| Customer Name | Address | Lat | Lng | Assigned Employee ID | Status |
|---|---|---|---|---|---|

`Status` should be one of: `pending`, `followup`, `visited`.
`Role` should be exactly `rep` or `admin`.

## 2. Install the Apps Script Web App

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the default code, paste in the full contents of `AppsScript-Code.gs`.
3. Change the `SHARED_SECRET` constant near the top to any random string —
   this is what stops random people from hitting your script URL and
   reading/writing your sheet.
4. Save (disk icon or Ctrl+S).
5. **Deploy → New deployment → type: Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click Deploy — the first time, Google will ask you to authorize the
   script; approve it (it's your own script accessing your own sheet).
7. Copy the **Web app URL** it gives you — this is your `APPS_SCRIPT_URL`.

## 3. Generate password hashes

For each person in Credentials, run locally:
```bash
node hash-password.js "their-chosen-password"
```
Paste the printed hash into their **Password Hash** cell. Never put a plain
password directly in the sheet.

## 4. Environment variables

Set these in Vercel (Project → Settings → Environment Variables):

- `APPS_SCRIPT_URL` — the Web app URL from step 2
- `APPS_SCRIPT_SECRET` — must match `SHARED_SECRET` inside the script exactly
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
- `GOOGLE_MAPS_API_KEY` — from Google Cloud Console, with **Maps JavaScript
  API** and **Directions API** both enabled. Restrict the key to your
  Vercel domain once you know it (Cloud Console → Credentials → your key →
  Application restrictions → HTTP referrers).

## 5. Deploy

```bash
npm install -g vercel
cd your-project-folder
vercel
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

## Route optimization

`dashboard.html` uses Google's Directions Service with
`optimizeWaypoints: true` — a real solver for "shortest route through all
stops," not an approximation. No extra setup needed beyond Directions API
being enabled on your key.

## Repo layout

```
index.html
dashboard.html
hash-password.js
AppsScript-Code.gs   <- goes into the Sheet's Apps Script editor, NOT deployed to Vercel
package.json
.env.example
README.md
api/
  config.js
  login.js
  logout.js
  customers.js
  update-status.js
```

`api/` must stay a folder — that's how Vercel turns those files into live
endpoints. `AppsScript-Code.gs` doesn't go to Vercel at all; it lives inside
your Google Sheet.

## Updating the Apps Script later

If you ever edit `AppsScript-Code.gs`, you need to **Deploy → Manage
deployments → edit (pencil icon) → New version → Deploy** for the changes
to actually go live — saving the file alone isn't enough.

## What's stubbed for later

- **Call button** — needs a `Phone` column added to the Customers tab.
- **Rate limiting** in `api/login.js` is in-memory per serverless
  instance — fine for a pilot, resets on cold starts.
- **Apps Script quotas** — free Google accounts get 20,000 URL Fetch calls
  and reasonable script runtime per day, which comfortably covers a small
  team; Workspace accounts get more. Not a concern at pilot scale.
