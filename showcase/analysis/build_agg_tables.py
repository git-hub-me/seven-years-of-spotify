"""
build_agg_tables.py — Writes pre-computed aggregate tables back into spotify.db.

Tables created (all prefixed agg_):
  agg_artist_stats      — per-artist: plays, skips, hours, skip category, genres
  agg_track_stats       — per-track: plays, avg completion %, popularity
  agg_time_heatmap      — hour × dow × year stream counts (UTC and IST hour)
  agg_sessions          — one row per listening session with type + metadata
  agg_genre_year        — genre bucket % share by year
  agg_popularity_year   — popularity tier distribution by year

Run: python3 build_agg_tables.py
Safe to re-run — drops and recreates each table.
"""

import sqlite3
import os
import json
from datetime import datetime
from collections import defaultdict

DB_PATH = os.path.join(os.path.dirname(__file__), "../../spotify_data/spotify.db")

# Reuse genre + session logic from generate.py
import sys
sys.path.insert(0, os.path.dirname(__file__))
from generate import (
    connect, build_artist_genre_map, classify_genres,
    GENRE_BUCKETS,
)

# ── helpers ────────────────────────────────────────────────────────────────────

def drop_create(conn, ddl: str):
    table = ddl.split("CREATE TABLE")[1].split("(")[0].strip()
    conn.execute(f"DROP TABLE IF EXISTS {table}")
    conn.execute(ddl)
    print(f"  created {table}")


# ── 1. agg_artist_stats ────────────────────────────────────────────────────────

def build_artist_stats(conn, ag):
    drop_create(conn, """
        CREATE TABLE agg_artist_stats (
            artist          TEXT PRIMARY KEY,
            total_plays     INTEGER,
            full_plays      INTEGER,
            skips           INTEGER,
            ms_played       INTEGER,
            hours           REAL,
            skip_pct        REAL,
            category        TEXT,   -- obsession/true_love/complicated/reliable/aspirational/casual
            genres_raw      TEXT,   -- comma-joined Spotify genre tags
            genre_buckets   TEXT,   -- comma-joined broad buckets from classify_genres
            first_stream    TEXT,
            last_stream     TEXT
        )
    """)

    rows = conn.execute("""
        SELECT s.artist,
               COUNT(*)                                          AS total,
               SUM(CASE WHEN s.is_skip=0 THEN 1 ELSE 0 END)    AS full_plays,
               SUM(s.is_skip)                                   AS skips,
               SUM(s.ms_played)                                 AS ms,
               MIN(s.end_time)                                  AS first_stream,
               MAX(s.end_time)                                  AS last_stream,
               a.genres
        FROM streams s
        LEFT JOIN artists a ON s.artist = a.name
        GROUP BY s.artist
        HAVING total >= 5
        ORDER BY full_plays DESC
    """).fetchall()

    def categorise(full_plays, skip_pct):
        if full_plays >= 200 and skip_pct < 42:   return "obsession"
        if full_plays >= 50  and skip_pct < 38:   return "true_love"
        if full_plays >= 20  and skip_pct >= 60:  return "aspirational"
        if full_plays >= 20  and skip_pct < 38:   return "reliable"
        if full_plays >= 20  and 38 <= skip_pct < 60: return "complicated"
        return "casual"

    records = []
    for artist, total, full, skips, ms, first, last, genres_raw in rows:
        skip_pct = round(skips / total * 100, 1) if total else 0
        buckets = ag.get(artist, ["Other"])
        records.append((
            artist, total, full, skips, ms,
            round((ms or 0) / 3_600_000, 3),
            skip_pct,
            categorise(full, skip_pct),
            genres_raw or "",
            ",".join(buckets),
            first, last,
        ))

    conn.executemany("""
        INSERT INTO agg_artist_stats VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, records)
    print(f"    {len(records)} artists")


# ── 2. agg_track_stats ────────────────────────────────────────────────────────

def build_track_stats(conn):
    drop_create(conn, """
        CREATE TABLE agg_track_stats (
            uri             TEXT PRIMARY KEY,
            track           TEXT,
            artist          TEXT,
            total_plays     INTEGER,
            full_plays      INTEGER,
            skips           INTEGER,
            skip_pct        REAL,
            avg_ms_played   INTEGER,
            duration_ms     INTEGER,
            completion_pct  REAL,   -- avg ms / duration, NULL if no duration_ms
            popularity      INTEGER,
            release_year    INTEGER,
            first_stream    TEXT,
            last_stream     TEXT
        )
    """)

    rows = conn.execute("""
        SELECT s.uri,
               s.track,
               s.artist,
               COUNT(*)                                          AS total,
               SUM(CASE WHEN s.is_skip=0 THEN 1 ELSE 0 END)    AS full_plays,
               SUM(s.is_skip)                                   AS skips,
               CAST(AVG(s.ms_played) AS INTEGER)                AS avg_ms,
               ti.duration_ms,
               ti.popularity,
               ti.release_year,
               MIN(s.end_time),
               MAX(s.end_time)
        FROM streams s
        LEFT JOIN track_info ti ON s.uri = ti.uri
        WHERE s.uri IS NOT NULL AND s.uri != ''
        GROUP BY s.uri
        HAVING total >= 2
        ORDER BY full_plays DESC
    """).fetchall()

    records = []
    for uri, track, artist, total, full, skips, avg_ms, dur_ms, pop, rel_yr, first, last in rows:
        skip_pct = round(skips / total * 100, 1) if total else 0
        completion = round(min(avg_ms / dur_ms * 100, 100), 1) if dur_ms and dur_ms > 0 else None
        records.append((uri, track, artist, total, full, skips, skip_pct,
                        avg_ms, dur_ms, completion, pop, rel_yr, first, last))

    conn.executemany("INSERT INTO agg_track_stats VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", records)
    print(f"    {len(records)} tracks")


# ── 3. agg_time_heatmap ───────────────────────────────────────────────────────

def build_time_heatmap(conn):
    drop_create(conn, """
        CREATE TABLE agg_time_heatmap (
            year        TEXT,       -- '2019'..'2026', or 'all'
            hour_utc    INTEGER,    -- 0-23
            hour_ist    INTEGER,    -- 0-23 (UTC+5:30)
            dow         INTEGER,    -- 0=Mon..6=Sun
            streams     INTEGER,
            ms_played   INTEGER
        )
    """)

    years = [r[0] for r in conn.execute(
        "SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1"
    ).fetchall()] + ["all"]

    records = []
    for year in years:
        where = f"AND substr(end_time,1,4)='{year}'" if year != "all" else ""
        rows = conn.execute(f"""
            SELECT hour, dow, COUNT(*), SUM(ms_played)
            FROM streams
            WHERE hour IS NOT NULL AND dow IS NOT NULL {where}
            GROUP BY hour, dow
        """).fetchall()
        for hour_utc, dow, streams, ms in rows:
            ist_hour = ((hour_utc * 60 + 330) // 60) % 24
            records.append((year, hour_utc, ist_hour, dow, streams, ms))

    conn.executemany("INSERT INTO agg_time_heatmap VALUES (?,?,?,?,?,?)", records)
    print(f"    {len(records)} heatmap cells")


# ── 4. agg_sessions ───────────────────────────────────────────────────────────

def build_sessions(conn, ag):
    drop_create(conn, """
        CREATE TABLE agg_sessions (
            session_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            date             TEXT,
            start_time       TEXT,   -- first stream end_time in session
            end_time         TEXT,   -- last stream end_time in session
            hour_utc         INTEGER,
            hour_ist         INTEGER,
            dow              INTEGER,
            year             TEXT,
            tracks_played    INTEGER,
            unique_tracks    INTEGER,
            unique_artists   INTEGER,
            duration_min     REAL,
            skip_rate        REAL,
            top_artist       TEXT,
            top_genre        TEXT,
            genre_diversity  INTEGER,
            session_type     TEXT,   -- deep_dive/marathon/late_night/focused/shuffle_explore/work_background/mixed
            headline         TEXT,
            headline_type    TEXT    -- 'artist' or 'genre'
        )
    """)

    rows = conn.execute("""
        SELECT end_time, artist, track, ms_played, is_skip, hour, dow
        FROM streams ORDER BY end_time
    """).fetchall()

    def parse_dt(s):
        try: return datetime.strptime(s, "%Y-%m-%d %H:%M")
        except: return None

    # Cluster into sessions
    sessions, current = [], []
    GAP_MS = 30 * 60 * 1000
    for row in rows:
        end_time, artist, track, ms, is_skip, hour, dow = row
        dt = parse_dt(end_time)
        if dt is None: continue
        if not current:
            current.append(row)
        else:
            prev_dt = parse_dt(current[-1][0])
            gap = (dt - prev_dt).total_seconds() * 1000 - current[-1][3]
            if gap > GAP_MS:
                sessions.append(current)
                current = [row]
            else:
                current.append(row)
    if current:
        sessions.append(current)

    records = []
    for sess in sessions:
        if len(sess) < 2:
            continue
        artists_in = [r[1] for r in sess]
        unique_artists = len(set(artists_in))
        tracks_in = len(set((r[1], r[2]) for r in sess))
        skips = sum(r[4] for r in sess)
        n = len(sess)
        skip_rate_frac = skips / n
        first_dt = parse_dt(sess[0][0])
        last_dt  = parse_dt(sess[-1][0])
        duration_min = round((last_dt - first_dt).total_seconds() / 60 + sess[-1][3] / 60000, 1)
        hour = sess[0][5]
        dow  = sess[0][6]
        ist_hour = ((hour * 60 + 330) // 60) % 24 if hour is not None else None
        year = sess[0][0][:4]

        genre_counts = defaultdict(int)
        for a in artists_in:
            for b in ag.get(a, ["Other"]):
                genre_counts[b] += 1
        top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else "Other"

        # Classify
        if unique_artists == 1 and n >= 5:
            stype = "deep_dive"
        elif skip_rate_frac > 0.60 and unique_artists >= 5:
            stype = "shuffle_explore"
        elif duration_min >= 90 and skip_rate_frac < 0.60:
            stype = "marathon"
        elif ist_hour is not None and (ist_hour >= 22 or ist_hour < 4) and n >= 4:
            stype = "late_night"
        elif skip_rate_frac < 0.25 and n >= 6 and unique_artists > 1:
            stype = "focused"
        elif duration_min > 40 and 0.20 < skip_rate_frac < 0.65 and unique_artists >= 4:
            stype = "work_background"
        else:
            stype = "mixed"

        top_artist = max(set(artists_in), key=artists_in.count)
        top_artist_count = artists_in.count(top_artist)
        if unique_artists <= 3 or (top_artist_count / n) >= 0.25:
            headline, htype = top_artist, "artist"
        else:
            headline, htype = top_genre, "genre"

        records.append((
            sess[0][0][:10], sess[0][0], sess[-1][0],
            hour, ist_hour, dow, year,
            n, tracks_in, unique_artists, duration_min,
            round(skip_rate_frac * 100, 1),
            top_artist, top_genre, len(genre_counts),
            stype, headline, htype,
        ))

    conn.executemany("""
        INSERT INTO agg_sessions
        (date, start_time, end_time, hour_utc, hour_ist, dow, year,
         tracks_played, unique_tracks, unique_artists, duration_min, skip_rate,
         top_artist, top_genre, genre_diversity, session_type, headline, headline_type)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, records)
    print(f"    {len(records)} sessions")


# ── 5. agg_genre_year ─────────────────────────────────────────────────────────

def build_genre_year(conn, ag):
    drop_create(conn, """
        CREATE TABLE agg_genre_year (
            year            TEXT,
            genre_bucket    TEXT,
            ms_played       INTEGER,
            pct_of_year     REAL,
            PRIMARY KEY (year, genre_bucket)
        )
    """)

    years = [r[0] for r in conn.execute(
        "SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1"
    ).fetchall()]

    records = []
    for year in years:
        rows = conn.execute("""
            SELECT artist, SUM(ms_played) FROM streams
            WHERE substr(end_time,1,4)=? GROUP BY artist
        """, (year,)).fetchall()

        genre_ms = defaultdict(float)
        for artist, ms in rows:
            buckets = ag.get(artist, ["Other"])
            share = ms / len(buckets)
            for b in buckets:
                genre_ms[b] += share

        total = sum(genre_ms.values()) or 1
        for bucket, ms in genre_ms.items():
            records.append((year, bucket, round(ms), round(ms / total * 100, 2)))

    conn.executemany("INSERT INTO agg_genre_year VALUES (?,?,?,?)", records)
    print(f"    {len(records)} genre-year rows")


# ── 6. agg_popularity_year ────────────────────────────────────────────────────

def build_popularity_year(conn):
    drop_create(conn, """
        CREATE TABLE agg_popularity_year (
            year            TEXT,
            pop_bucket      TEXT,   -- mainstream/popular/mid/niche/underground
            pop_min         INTEGER,
            pop_max         INTEGER,
            full_plays      INTEGER,
            pct_of_year     REAL,
            avg_skip_pct    REAL,
            PRIMARY KEY (year, pop_bucket)
        )
    """)

    BUCKETS = [
        ("mainstream",  80, 100),
        ("popular",     60,  79),
        ("mid",         40,  59),
        ("niche",       20,  39),
        ("underground",  0,  19),
    ]

    years = [r[0] for r in conn.execute(
        "SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1"
    ).fetchall()] + ["all"]

    records = []
    for year in years:
        where = f"AND substr(s.end_time,1,4)='{year}'" if year != "all" else ""
        total_full = conn.execute(f"""
            SELECT COUNT(*) FROM streams s
            JOIN track_info ti ON s.uri=ti.uri
            WHERE s.is_skip=0 AND ti.popularity IS NOT NULL {where}
        """).fetchone()[0] or 1

        for label, lo, hi in BUCKETS:
            row = conn.execute(f"""
                SELECT COUNT(*),
                       ROUND(AVG(s.is_skip)*100, 1)
                FROM streams s
                JOIN track_info ti ON s.uri=ti.uri
                WHERE s.is_skip=0
                  AND ti.popularity BETWEEN {lo} AND {hi} {where}
            """).fetchone()
            full_plays = row[0] or 0
            avg_skip  = row[1] or 0
            records.append((
                year, label, lo, hi,
                full_plays,
                round(full_plays / total_full * 100, 2),
                avg_skip,
            ))

    conn.executemany("INSERT INTO agg_popularity_year VALUES (?,?,?,?,?,?,?)", records)
    print(f"    {len(records)} popularity-year rows")


# ── main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Connecting to spotify.db...")
    conn = connect()

    print("Building genre map...")
    ag = build_artist_genre_map(conn)

    print("\nBuilding aggregate tables:")
    build_artist_stats(conn, ag)
    build_track_stats(conn)
    build_time_heatmap(conn)
    build_sessions(conn, ag)
    build_genre_year(conn, ag)
    build_popularity_year(conn)

    conn.commit()
    conn.close()
    print("\nDone. All agg_ tables written to spotify.db.")
    print("\nQuick reference:")
    print("  agg_artist_stats    — per-artist plays, skip %, category, genre buckets")
    print("  agg_track_stats     — per-track plays, completion %, popularity")
    print("  agg_time_heatmap    — hour×dow×year stream counts (UTC + IST hour)")
    print("  agg_sessions        — every listening session with type + metadata")
    print("  agg_genre_year      — genre bucket % by year")
    print("  agg_popularity_year — popularity tier distribution by year (incl. 'all')")