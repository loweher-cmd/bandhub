# BandHub — Tasks

## Current focus

Build the MVP: a single-page app that reads rehearsal data from Google Sheets and displays it on a calendar.

---

## To do

### Setup
- [ ] Create Google Sheet with columns: `date | title | link | notes`
- [ ] Create Google Form linked to the sheet
- [ ] Publish sheet as public JSON/CSV endpoint
- [ ] Create GitHub repo and enable GitHub Pages

### Frontend
- [ ] `index.html` — base layout (calendar + sidebar)
- [ ] `config.js` — sheet URL, form URL, any config values
- [ ] `script.js` — fetch data, group by date, render calendar
- [ ] `styles.css` — clean, mobile-friendly UI

### Features
- [ ] Calendar view with rehearsal markers
- [ ] Click a day → show rehearsals for that date
- [ ] Audio/link player for each rehearsal
- [ ] Highlight the most recent rehearsal automatically
- [ ] "Add rehearsal" button → opens Google Form

### Polish
- [ ] Loading state while fetching
- [ ] Empty state when no rehearsals exist
- [ ] Error handling if Sheets is unreachable
- [ ] Mobile responsive layout

---

## Done

_(move completed tasks here)_
