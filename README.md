# Seven Years of Spotify

A personal data portfolio built from 7 years of Spotify Extended Streaming History (2019–2026). 28,214 streams, 771 hours, 2,555 artists — analysed with Python + SQLite and visualised with React + Recharts.

Live: [bhushankamble.github.io/seven-years-of-spotify](https://bhushankamble.github.io/seven-years-of-spotify)

---

## What's inside

| Chapter | What it shows |
|---------|--------------|
| Genre Evolution | Genre share by year as a stacked area chart |
| The Honest Chart | Skip rate vs full plays — every artist as a scatter point |
| When I Listen | Hour × day-of-week heatmap (IST) |
| Session Archaeology | 1,600+ sessions classified by type and mood |
| Year by Year | Per-year breakdown with life events annotated |
| The Two Faces | Indian indie vs hip-hop vs classic rock split over time |
| Mainstream vs Niche | Spotify popularity tiers and completion rates |
| Artist Lifecycle | Anchors, obsessions, experiments — plotted by longevity and concentration |
| Decade DNA | Which decade's music actually got played |
| Artist Quality Score | Skip rate × completion × loyalty — the real ranking |
| Album Affinity | Albums listened through, not just cherry-picked |
| Skip Timing | When in a track you bail — the 30-second rule |
| Seasonal Patterns | Which months pull more listening |
| Artist Loyalty/Churn | Year-over-year artist retention |
| Streaks | Active listening days and gaps |
| Discovery Timeline | When each artist first showed up |

---

## Data pipeline

### Step 1 — Request your Spotify Extended History

Go to Spotify → Account → Privacy Settings → Request Extended Streaming History. The export arrives as a ZIP with JSON files named `Streaming_History_Audio_*.json`. Extended history (not basic) is required — it includes skip data and milliseconds played.

### Step 2 — Load into SQLite

```bash
python3 build_agg_tables.py
```

`build_agg_tables.py` reads all `Streaming_History_Audio_*.json` files and inserts them into `spotify_data/spotify.db` with the following schema:

```sql
CREATE TABLE streams (
    end_time     TEXT,    -- UTC timestamp
    artist       TEXT,
    track        TEXT,
    ms_played    INTEGER, -- milliseconds played
    platform     TEXT,
    conn_country TEXT,
    reason_start TEXT,    -- e.g. "trackdone", "clickrow"
    reason_end   TEXT,    -- e.g. "trackdone", "fwdbtn", "endplay"
    shuffle      INTEGER,
    is_skip      INTEGER  -- 1 if ms_played < 30000
);

CREATE TABLE artists (
    name   TEXT PRIMARY KEY,
    genres TEXT  -- comma-separated Spotify genre tags, fetched via API
);
```

Artist genre tags are fetched separately from the Spotify Web API (one-time enrichment pass) and stored in the `artists` table.

### Step 3 — Generate JSON

```bash
cd showcase/analysis
python3 generate.py
```

Reads `spotify.db`, runs all the analyses, and writes 16 JSON files to `showcase/analysis/data/`. These are then copied to `showcase/web/public/` for the frontend to fetch.

**Key analysis decisions:**

- **Skip definition:** a stream where `ms_played < 30,000ms` (30 seconds). Spotify's own Wrapped uses this threshold.
- **Full play definition:** `ms_played >= 30,000ms`. Used for skip rate and artist quality.
- **Session clustering:** consecutive streams with less than 30 minutes between them are grouped into one session.
- **Genre classification:** uses Spotify artist genre tags, not audio features (deprecated for new apps). Each tag is substring-matched against 9 broad buckets. Artists tagged across multiple buckets are weighted proportionally by listening time.
- **No audio features:** Spotify's audio features API (valence, energy, danceability) is no longer available to new apps. All mood/energy proxies use track popularity and skip behaviour instead.

### Step 4 — Build and deploy

```bash
cd showcase/web
npm install
npm run build
```

The built site is in `showcase/web/dist/`. Deployed to GitHub Pages via the `gh-pages` branch. Base path is `/seven-years-of-spotify/` (set in `vite.config.js`).

---

## Local development

```bash
# Terminal 1 — run analysis (only needed when data changes)
cd showcase/analysis
python3 generate.py

# Copy outputs to web/public
cp data/*.json ../web/public/

# Terminal 2 — start dev server
cd showcase/web
npm run dev
# opens at http://127.0.0.1:5173/seven-years-of-spotify/
```

---

## What's not committed

The raw data never leaves the local machine:

```
spotify_data/                          # SQLite DB and raw JSON exports
Spotify Extended Streaming History/    # Original Spotify export folder
*.db  *.zip                            # All database and archive files
```

The `showcase/analysis/data/*.json` files that are committed contain only aggregated statistics: artist names, play counts, skip rates, and percentages. No timestamps, IP addresses, platform data, or other PII from the raw export.

---

## Stack

- **Analysis:** Python 3, sqlite3 (stdlib only, no pandas)
- **Frontend:** React 19, Vite 8, Recharts 3
- **Hosting:** GitHub Pages (static, no server)
- **Data source:** Spotify Extended Streaming History
