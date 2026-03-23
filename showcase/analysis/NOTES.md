# Analysis Notes

## Aggregate Tables Must Stay In Sync

**`build_agg_tables.py` must be re-run whenever any of the following change in `generate.py`:**

- Session classification logic (`gen_sessions`) — thresholds for deep_dive, marathon, shuffle_explore, late_night, focused, work_background priority order
- Skip categorization rules (`categorise` in `build_artist_stats`) — obsession/true_love/aspirational/reliable/complicated/casual thresholds
- Genre bucket definitions (`GENRE_BUCKETS`) or `classify_genres()` keyword matching logic
- IST conversion formula (`ist_hour = ((hour * 60 + 330) // 60) % 24`)

**Re-run command:**
```
cd showcase/analysis
python3 build_agg_tables.py
```

Safe to re-run — all `agg_` tables are dropped and recreated each time.

**Tables affected:**
| Table | Depends on |
|---|---|
| `agg_sessions` | Session classification, IST conversion |
| `agg_artist_stats` | Skip categorization, genre buckets |
| `agg_genre_year` | Genre bucket definitions |
| `agg_popularity_year` | No logic changes (pure SQL) |
| `agg_track_stats` | No logic changes (pure SQL) |
| `agg_time_heatmap` | IST conversion formula |

After re-running the aggregate tables, also re-run `generate.py` to refresh all JSON files in `web/public/`.
