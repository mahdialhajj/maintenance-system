# GAUGE — Maintenance Control

A self-contained web app for a maintenance team to track machines #1–500,
file reports when a machine is serviced, and see each machine's full
service history (parts changed, oil renewals, electrical work, repairs,
inspections).

No backend, no build step, no dependencies to install. Everything is
plain HTML/CSS/JavaScript, and all data is saved in the browser's
`localStorage`.

## Files

```
maintenance-system/
├── index.html        the app shell (all 4 views)
├── css/styles.css     all styling
├── js/app.js          data model, rendering, and interactions
└── README.md
```

## Running it in VS Code

1. Open the `maintenance-system` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't
   have it — Extensions panel → search "Live Server" → Install.
3. Right-click `index.html` → **Open with Live Server**.

That's it — the app opens in your browser at `http://127.0.0.1:5500`
(or similar) and is fully working.

You *can* also just double-click `index.html` to open it directly as a
`file://` page — it will mostly work, but some browsers restrict
`localStorage` on `file://` pages, so Live Server (or any local server)
is the reliable option, especially once several technicians are using
it on the same machine.

## How data works

- The first time the app loads, it generates all 500 machines
  (numbered 1–500, each assigned a zone and a category) and seeds a
  handful of example reports so the dashboard isn't empty.
- Every report you file is saved to `localStorage` in the browser.
  A machine's status (**Operational** / **Under maintenance** /
  **Faulty**) is always taken from its most recent report — filing a
  new report is how you change a unit's status.
- Data is **local to the browser it's filed in**. This is meant as a
  ready-to-use starting point; see "Making it multi-user" below for
  turning it into something a whole team can share.

### Resetting the data

Open the browser console on the page (F12) and run:
```js
localStorage.clear(); location.reload();
```

## Using the app

- **Dashboard** — counts by status, a list of units needing attention,
  and the latest reports filed across the floor.
- **Machines** — every unit #1–500 as a tile, color-coded by status.
  Jump to a number with the search box, or filter by status. Click a
  tile to open that machine's file.
- **Machine detail** — a unit's current status plus its full history
  timeline (newest first), with technician, parts used, and downtime
  for each entry.
- **Reports log** — every report ever filed, across all machines,
  searchable and filterable by work type.
- **+ New report** (top of the sidebar, or on a machine's page) opens
  the report form: pick the unit, the type of work (part replacement,
  oil renewal, electrical work, inspection, repair, other), the
  technician, what was done, parts used, downtime, and the unit's
  status afterward.
- The **"Signed in as"** field in the sidebar remembers the current
  technician's name and pre-fills it on new reports.

## Making it multi-user

Right now each technician's browser has its own local copy of the
data. To have the whole team share one live set of machines and
reports, `js/app.js` is written so the `machines` / `reports` arrays
and the `saveMachines()` / `saveReports()` functions are the only
things that need to change — swap `localStorage` for calls to a small
backend (a simple REST API, Firebase, Supabase, or similar) and the
rest of the app keeps working as-is.

## Customizing

- **Machine count, zones, categories** — edit the constants at the top
  of `js/app.js` (`MACHINE_COUNT`, `ZONES`, `CATEGORIES`).
- **Work types** — edit the `<option>` list in the report form in
  `index.html` (`#f-type`) to match your team's categories.
- **Colors / fonts** — all design tokens are CSS custom properties at
  the top of `css/styles.css` (`:root { ... }`).
