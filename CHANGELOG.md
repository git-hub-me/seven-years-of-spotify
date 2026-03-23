# Changelog

## [Unreleased]

---

## [1.0.0] — 2026-03-23

### Added
- Initial public release of Seven Years of Spotify
- 7 chapters: Genre Evolution, Skip Honesty, When I Listen, Session Archaeology, Year Timeline, The Two Faces, How Mainstream Are You?
- Pre-computed JSON data from 28,214 streams (2019–2026) via Python + SQLite
- GitHub Pages deploy workflow

### Chapters
- **Genre Evolution** — Stacked area chart with click-to-isolate, genre identity cards
- **Skip Honesty** — 6-tier artist categorization (obsession → casual) with scatter plot
- **When I Listen** — Heatmap with UTC→IST conversion, year selector, inferno color scale
- **Session Archaeology** — Session type breakdown by year, per-type stats table, best sessions ranked by engagement score
- **Year Timeline** — Year-by-year narrative with top artists and milestones
- **The Two Faces** — Indian indie/folk vs hip-hop vs classic rock identity split over time
- **How Mainstream Are You?** — Popularity tier analysis, mainstream creep trend, underground gems vs mainstream hits

### Analysis
- `generate.py` — Full analysis pipeline producing 10 JSON files
- `build_agg_tables.py` — 6 aggregate tables written back to spotify.db
- `NOTES.md` — Documents when agg tables must be re-run
