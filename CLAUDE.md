# BandHub — Claude Context

## What is this project?

**BandHub (Band Rehearsal Hub / Sistema de Ensayos)** is a free, collaborative web app for bands to manage rehearsals. It replaces messy Google Drive folder structures with a clean, visual interface.

## Stack

- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **Hosting:** GitHub Pages
- **Database:** Google Sheets (public CSV/JSON endpoint)
- **Input:** Google Forms → Google Sheets

## Project structure

```
band-rehearsal-app/
├── index.html
├── styles.css
├── script.js
├── config.js
└── README.md
```

## Data schema

Google Sheets columns: `date | title | link | notes`

## Data flow

- **Input:** User → Google Form → Google Sheets
- **Output:** Web app → fetch Sheets → process → render

## Core features

- Calendar view of rehearsals
- Day view with recordings
- Audio player (links to Drive, MEGA, etc.)
- Add rehearsal button (via Form link)
- Latest rehearsal highlighted

## Key constraints

- No backend
- No login / authentication
- Dependent on Google Sheets availability
- Hosting is static (GitHub Pages)

## Future possibilities

- Supabase for a real backend
- User accounts
- Direct audio upload
