"""
generate.py — Reads spotify.db and outputs pre-computed JSON files for the showcase site.

Outputs (all in ./data/):
  overview.json          — top-level lifetime stats
  by_year.json           — per-year breakdown (artists, tracks, hours, genres)
  genre_evolution.json   — genre % share by year (for stacked area chart)
  skip_honesty.json      — artist skip rates vs play counts
  time_heatmap.json      — hour × dow listening matrix
  discovery_timeline.json— when each significant artist was first heard
  top_tracks.json        — top tracks with completion rates
  sessions.json          — session archaeology (clusters, types, patterns)
  dual_identity.json     — Indian indie vs hip-hop vs rock split over time
"""

import sqlite3
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "../../spotify_data/spotify.db")
OUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT_DIR, exist_ok=True)

def out(name, data):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {name} ({os.path.getsize(path)//1024}kb)")

def connect():
    return sqlite3.connect(DB_PATH)

# ---------------------------------------------------------------------------
# Genre bucketing
# ---------------------------------------------------------------------------

GENRE_BUCKETS = {
    "Indian Indie/Folk": [
        "indian indie", "indian folk", "hindi indie", "desi pop", "hindi pop",
        "indian pop", "bollywood", "marathi", "punjabi folk", "indian classical",
        "hindustani classical", "carnatic", "tamil pop", "telugu pop",
        "indian singer-songwriter", "filmi", "kollywood", "tollywood",
    ],
    "Hip-Hop": [
        "hip hop", "rap", "trap", "east coast hip hop", "west coast hip hop",
        "conscious hip hop", "southern hip hop", "underground hip hop",
        "gangsta rap", "alternative hip hop", "dirty south rap", "crunk",
        "snap", "g funk", "memphis hip hop", "chicago rap",
        "desi hip hop", "hindi hip hop",  # Indian hip-hop genres — NOT Punjabi
    ],
    "Classic Rock": [
        "classic rock", "rock", "hard rock", "blues rock", "psychedelic rock",
        "progressive rock", "glam rock", "british invasion", "garage rock",
        "acid rock", "art rock", "heartland rock", "southern rock",
    ],
    "Alternative/Indie Rock": [
        "alternative rock", "indie rock", "grunge", "post-grunge",
        "shoegaze", "dream pop", "noise rock", "post-punk", "college rock",
        "lo-fi indie", "indie", "alt-rock",
    ],
    "Pop": [
        "pop", "dance pop", "electropop", "synth-pop", "indie pop",
        "teen pop", "post-teen pop", "art pop", "chamber pop",
    ],
    "Electronic": [
        "electronic", "edm", "house", "techno", "ambient", "downtempo",
        "trip hop", "idm", "chillwave", "synthwave", "drum and bass",
        "dubstep", "electro", "trance",
    ],
    "Folk/Acoustic": [
        "folk", "acoustic", "singer-songwriter", "americana", "country folk",
        "contemporary folk", "anti-folk", "baroque pop",
    ],
    "Jazz/Blues": [
        "jazz", "blues", "soul", "r&b", "neo soul", "motown",
        "rhythm and blues", "smooth jazz", "bebop",
    ],
    "Punjabi/Bhangra": [
        "punjabi pop", "bhangra", "punjabi hip hop",
        "modern punjabi pop", "haryanvi pop",
        # NOTE: "desi hip hop" intentionally excluded — that's Mumbai/Hindi rap,
        # not Punjabi. Only explicitly Punjabi-tagged genres go here.
    ],
}

def classify_genres(genre_string):
    """Return list of broad bucket names that match this artist's genres.

    Matching rule: keyword must be a substring of the tag (not the other way around).
    e.g. tag='hip hop' should NOT match keyword='punjabi hip hop'.
         tag='punjabi hip hop' SHOULD match keyword='punjabi hip hop'.
    """
    if not genre_string:
        return []
    tags = [g.strip().lower() for g in genre_string.split(",")]
    matched = set()
    for bucket, keywords in GENRE_BUCKETS.items():
        for tag in tags:
            for kw in keywords:
                if kw in tag:   # keyword substring of tag only — never tag in kw
                    matched.add(bucket)
                    break
    return list(matched) if matched else ["Other"]

# ---------------------------------------------------------------------------
# 1. Build artist → genres lookup
# ---------------------------------------------------------------------------

def build_artist_genre_map(conn):
    rows = conn.execute("SELECT name, genres FROM artists WHERE genres IS NOT NULL").fetchall()
    mapping = {}
    for name, genres in rows:
        buckets = classify_genres(genres)
        mapping[name] = buckets if buckets else ["Other"]
    return mapping  # artist name → [bucket, ...]

# ---------------------------------------------------------------------------
# 2. Overview
# ---------------------------------------------------------------------------

def gen_overview(conn, ag):
    row = conn.execute("""
        SELECT COUNT(*), SUM(ms_played), COUNT(DISTINCT artist), COUNT(DISTINCT track),
               MIN(end_time), MAX(end_time), SUM(is_skip)
        FROM streams
    """).fetchone()
    total, ms, artists, tracks, first, last, skips = row

    # Year span
    start_year = int(first[:4])
    end_year = int(last[:4])

    # Most-played artist ever
    top_artist = conn.execute("""
        SELECT artist, COUNT(*) as c FROM streams WHERE is_skip=0
        GROUP BY artist ORDER BY c DESC LIMIT 1
    """).fetchone()

    # Most-played track ever
    top_track = conn.execute("""
        SELECT track, artist, COUNT(*) as c FROM streams WHERE is_skip=0
        GROUP BY track, artist ORDER BY c DESC LIMIT 1
    """).fetchone()

    # Best year (most hours)
    best_year = conn.execute("""
        SELECT substr(end_time,1,4) as y, SUM(ms_played) as ms
        FROM streams GROUP BY y ORDER BY ms DESC LIMIT 1
    """).fetchone()

    out("overview.json", {
        "total_streams": total,
        "total_hours": round(ms / 3_600_000, 1),
        "unique_artists": artists,
        "unique_tracks": tracks,
        "skip_rate_pct": round(skips / total * 100, 1),
        "first_stream": first,
        "last_stream": last,
        "years_active": end_year - start_year + 1,
        "top_artist_ever": {"name": top_artist[0], "plays": top_artist[1]},
        "top_track_ever": {"track": top_track[0], "artist": top_track[1], "plays": top_track[2]},
        "peak_year": {"year": int(best_year[0]), "hours": round(best_year[1] / 3_600_000, 1)},
    })

# ---------------------------------------------------------------------------
# 3. By-year breakdown
# ---------------------------------------------------------------------------

def gen_by_year(conn, ag):
    years = conn.execute("""
        SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1
    """).fetchall()
    years = [r[0] for r in years]

    result = {}
    for year in years:
        stats = conn.execute("""
            SELECT COUNT(*), SUM(ms_played), SUM(is_skip)
            FROM streams WHERE substr(end_time,1,4)=?
        """, (year,)).fetchone()
        total, ms, skips = stats

        top_artists = conn.execute("""
            SELECT artist, COUNT(*) as c, SUM(is_skip) as s
            FROM streams WHERE substr(end_time,1,4)=? AND is_skip=0
            GROUP BY artist ORDER BY c DESC LIMIT 10
        """, (year,)).fetchall()

        top_tracks = conn.execute("""
            SELECT track, artist, COUNT(*) as c
            FROM streams WHERE substr(end_time,1,4)=? AND is_skip=0
            GROUP BY track, artist ORDER BY c DESC LIMIT 10
        """, (year,)).fetchall()

        # Genre distribution for this year
        genre_ms = defaultdict(float)
        rows = conn.execute("""
            SELECT s.artist, SUM(s.ms_played)
            FROM streams s WHERE substr(s.end_time,1,4)=?
            GROUP BY s.artist
        """, (year,)).fetchall()
        for artist, artist_ms in rows:
            buckets = ag.get(artist, ["Other"])
            share = artist_ms / len(buckets)
            for b in buckets:
                genre_ms[b] += share
        total_genre_ms = sum(genre_ms.values()) or 1
        genre_pct = {k: round(v / total_genre_ms * 100, 1) for k, v in sorted(genre_ms.items(), key=lambda x: -x[1])}

        result[year] = {
            "streams": total,
            "hours": round(ms / 3_600_000, 1),
            "skip_rate_pct": round(skips / total * 100, 1) if total else 0,
            "top_artists": [{"name": a, "plays": c} for a, c, s in top_artists],
            "top_tracks": [{"track": t, "artist": a, "plays": c} for t, a, c in top_tracks],
            "genre_pct": genre_pct,
        }

    out("by_year.json", result)

# ---------------------------------------------------------------------------
# 4. Genre evolution (stacked area chart data)
# ---------------------------------------------------------------------------

def gen_genre_evolution(conn, ag):
    years = conn.execute("""
        SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1
    """).fetchall()
    years = [r[0] for r in years]

    all_buckets = set()
    year_data = {}

    for year in years:
        genre_ms = defaultdict(float)
        rows = conn.execute("""
            SELECT s.artist, SUM(s.ms_played)
            FROM streams s WHERE substr(s.end_time,1,4)=?
            GROUP BY s.artist
        """, (year,)).fetchall()
        for artist, artist_ms in rows:
            buckets = ag.get(artist, ["Other"])
            share = artist_ms / len(buckets)
            for b in buckets:
                genre_ms[b] += share
        total_ms = sum(genre_ms.values()) or 1
        year_data[year] = {k: round(v / total_ms * 100, 1) for k, v in genre_ms.items()}
        all_buckets.update(genre_ms.keys())

    # Format for recharts: [{year, GenreA, GenreB, ...}, ...]
    series = []
    for year in years:
        point = {"year": int(year)}
        for bucket in all_buckets:
            point[bucket] = year_data[year].get(bucket, 0)
        series.append(point)

    out("genre_evolution.json", {
        "series": series,
        "buckets": sorted(all_buckets),
    })

# ---------------------------------------------------------------------------
# 5. Skip honesty
# ---------------------------------------------------------------------------

def gen_skip_honesty(conn):
    rows = conn.execute("""
        SELECT artist,
               COUNT(*) as total,
               SUM(is_skip) as skips,
               SUM(ms_played) as ms
        FROM streams
        GROUP BY artist
        HAVING total >= 10
        ORDER BY total DESC
    """).fetchall()

    data = []
    for artist, total, skips, ms in rows:
        full_plays = total - skips
        skip_pct = round(skips / total * 100, 1)
        hours = round(ms / 3_600_000, 2)
        # Categories — priority order, first match wins.
        # Thresholds tuned for 7-year / 28k stream dataset.
        if full_plays >= 200 and skip_pct < 42:
            # 200+ full plays AND you still come back: lifetime obsession
            category = "obsession"
        elif full_plays >= 50 and skip_pct < 38:
            # Consistent listener who rarely skips: genuine love
            category = "true_love"
        elif full_plays >= 20 and skip_pct >= 60:
            # Keep adding to queue despite skipping most of it
            category = "aspirational"
        elif full_plays >= 20 and 38 <= skip_pct < 60:
            # Complex relationship — respect but not unconditional
            category = "complicated"
        elif full_plays >= 20 and skip_pct < 38:
            # Decent plays, low skip but not enough for true_love tier
            category = "reliable"
        else:
            category = "casual"

        data.append({
            "artist": artist,
            "total_plays": total,
            "full_plays": full_plays,
            "skip_pct": skip_pct,
            "hours": hours,
            "category": category,
        })

    out("skip_honesty.json", sorted(data, key=lambda x: -x["total_plays"]))

# ---------------------------------------------------------------------------
# 6. Time heatmap (hour × dow)
# ---------------------------------------------------------------------------

def _build_heatmap_slice(conn, year_filter=None):
    """Build matrix + hourly + daily for a given year (or all years if None)."""
    where = f"WHERE substr(end_time,1,4)='{year_filter}'" if year_filter else ""

    rows = conn.execute(f"""
        SELECT hour, dow, COUNT(*) as streams, SUM(ms_played) as ms
        FROM streams {where}
        GROUP BY hour, dow
    """).fetchall()

    matrix = [[{"streams": 0, "ms": 0} for _ in range(7)] for _ in range(24)]
    for hour, dow, streams, ms in rows:
        if hour is not None and dow is not None:
            matrix[hour][dow] = {"streams": streams, "ms": ms}

    hourly = conn.execute(f"""
        SELECT hour, COUNT(*) as c, SUM(ms_played) as ms
        FROM streams {where}{"AND" if where else "WHERE"} hour IS NOT NULL
        GROUP BY hour ORDER BY hour
    """.replace("ANDAND", "AND")).fetchall()

    daily = conn.execute(f"""
        SELECT dow, COUNT(*) as c, SUM(ms_played) as ms
        FROM streams {where}{"AND" if where else "WHERE"} dow IS NOT NULL
        GROUP BY dow ORDER BY dow
    """.replace("ANDAND", "AND")).fetchall()

    total = conn.execute(f"SELECT COUNT(*), SUM(ms_played) FROM streams {where}").fetchone()

    return {
        "matrix": matrix,
        "hourly": [{"hour": h, "streams": c, "ms": ms} for h, c, ms in hourly],
        "daily": [{"dow": d, "streams": c, "ms": ms} for d, c, ms in daily],
        "total_streams": total[0],
        "total_hours": round((total[1] or 0) / 3_600_000, 1),
    }

def gen_time_heatmap(conn):
    years = [r[0] for r in conn.execute(
        "SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1"
    ).fetchall()]

    result = {
        "all": _build_heatmap_slice(conn),
        "dow_labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "years": years,
        "by_year": {y: _build_heatmap_slice(conn, y) for y in years},
    }
    out("time_heatmap.json", result)

# ---------------------------------------------------------------------------
# 7. Discovery timeline
# ---------------------------------------------------------------------------

def gen_discovery_timeline(conn):
    # First stream per artist + total subsequent plays
    rows = conn.execute("""
        SELECT artist,
               MIN(end_time) as first_heard,
               COUNT(*) as total_plays,
               SUM(is_skip) as skips,
               SUM(ms_played) as ms
        FROM streams
        GROUP BY artist
        HAVING total_plays >= 5
        ORDER BY first_heard
    """).fetchall()

    data = []
    for artist, first, total, skips, ms in rows:
        data.append({
            "artist": artist,
            "first_heard": first[:10],  # date only
            "total_plays": total,
            "full_plays": total - skips,
            "hours": round(ms / 3_600_000, 2),
            "year_discovered": int(first[:4]),
        })

    # Group by year for summary
    by_year = defaultdict(list)
    for d in data:
        by_year[d["year_discovered"]].append(d)

    out("discovery_timeline.json", {
        "artists": data,
        "by_year": {
            str(y): sorted(artists, key=lambda x: -x["total_plays"])
            for y, artists in sorted(by_year.items())
        },
    })

# ---------------------------------------------------------------------------
# 8. Top tracks with completion rate
# ---------------------------------------------------------------------------

def gen_top_tracks(conn):
    rows = conn.execute("""
        SELECT s.track, s.artist,
               COUNT(*) as plays,
               SUM(s.is_skip) as skips,
               AVG(s.ms_played) as avg_ms,
               ti.duration_ms,
               ti.popularity,
               ti.release_year
        FROM streams s
        LEFT JOIN track_info ti ON s.uri = ti.uri
        GROUP BY s.track, s.artist
        HAVING plays >= 3
        ORDER BY plays DESC
        LIMIT 100
    """).fetchall()

    data = []
    for track, artist, plays, skips, avg_ms, dur_ms, pop, rel_year in rows:
        completion = None
        if dur_ms and dur_ms > 0:
            completion = round(min(avg_ms / dur_ms * 100, 100), 1)
        data.append({
            "track": track,
            "artist": artist,
            "plays": plays,
            "full_plays": plays - skips,
            "skip_pct": round(skips / plays * 100, 1),
            "avg_ms": round(avg_ms),
            "duration_ms": dur_ms,
            "completion_pct": completion,
            "popularity": pop,
            "release_year": rel_year,
        })

    out("top_tracks.json", data)

# ---------------------------------------------------------------------------
# 9. Sessions archaeology
# ---------------------------------------------------------------------------

def gen_sessions(conn, ag):
    """
    Cluster consecutive streams into sessions (gap < 30 min = same session).
    Compute session types, lengths, mood mixing.
    """
    rows = conn.execute("""
        SELECT end_time, artist, track, ms_played, is_skip, hour, dow
        FROM streams ORDER BY end_time
    """).fetchall()

    sessions = []
    current = []
    GAP_MS = 30 * 60 * 1000  # 30 minutes

    def parse_dt(s):
        try:
            return datetime.strptime(s, "%Y-%m-%d %H:%M")
        except:
            return None

    for row in rows:
        end_time, artist, track, ms, is_skip, hour, dow = row
        dt = parse_dt(end_time)
        if dt is None:
            continue
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

    # Analyze each session
    analyzed = []
    for sess in sessions:
        if len(sess) < 2:
            continue

        artists_in = [r[1] for r in sess]
        tracks_in = len(set((r[1], r[2]) for r in sess))
        total_ms = sum(r[3] for r in sess)
        skips = sum(r[4] for r in sess)
        first_dt = parse_dt(sess[0][0])
        last_dt = parse_dt(sess[-1][0])
        duration_min = round((last_dt - first_dt).total_seconds() / 60 + (sess[-1][3] / 60000), 1)
        hour = sess[0][5]
        dow = sess[0][6]

        # Genre mix
        genre_counts = defaultdict(int)
        for a in artists_in:
            for b in ag.get(a, ["Other"]):
                genre_counts[b] += 1
        top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else "Other"
        genre_diversity = len(genre_counts)

        # Session type — priority order, first match wins.
        # Segments are designed to be mutually exclusive and meaningful.
        unique_artists = len(set(artists_in))
        n = len(sess)
        skip_rate_frac = skips / n

        # Convert UTC hour to IST (UTC+5:30) for time-of-day logic.
        # IST late night = IST 22:00–04:00 = UTC 16:30–22:30 ≈ UTC hours 17–22.
        ist_hour = ((hour * 60 + 330) // 60) % 24 if hour is not None else None

        if unique_artists == 1 and n >= 5:
            # Rabbit hole: you locked onto one artist and stayed
            session_type = "deep_dive"
        elif skip_rate_frac > 0.60 and unique_artists >= 5:
            # Actively flipping through songs — must be checked BEFORE marathon
            # because a 2h session with 80% skip rate is not a marathon, it's a shuffle
            session_type = "shuffle_explore"
        elif duration_min >= 90 and skip_rate_frac < 0.60:
            # True endurance: long AND you were actually listening, not skipping
            session_type = "marathon"
        elif (ist_hour is not None and (ist_hour >= 22 or ist_hour < 4)) and n >= 4:
            # Late night IST (10pm–4am IST = UTC 17–22)
            session_type = "late_night"
        elif skip_rate_frac < 0.25 and n >= 6 and unique_artists > 1:
            # Intentional, deliberate listening — very low skip rate
            session_type = "focused"
        elif duration_min > 40 and 0.20 < skip_rate_frac < 0.65 and unique_artists >= 4:
            # Long session, mixed skipping — background work music
            session_type = "work_background"
        else:
            session_type = "mixed"

        top_artist = max(set(artists_in), key=artists_in.count)
        top_artist_count = artists_in.count(top_artist)

        # Headline: use top artist only when they meaningfully dominate the session.
        # For high-diversity sessions, the genre is a more honest headline.
        if unique_artists <= 3 or (top_artist_count / n) >= 0.25:
            headline = top_artist
            headline_type = "artist"
        else:
            headline = top_genre
            headline_type = "genre"

        analyzed.append({
            "date": sess[0][0][:10],
            "start_hour_utc": hour,
            "start_hour": ist_hour,  # IST for display
            "dow": dow,
            "tracks_played": n,
            "unique_tracks": tracks_in,
            "unique_artists": unique_artists,
            "duration_min": duration_min,
            "skip_rate": round(skip_rate_frac * 100, 1),
            "top_genre": top_genre,
            "genre_diversity": genre_diversity,
            "session_type": session_type,
            "top_artist": top_artist,
            "top_artist_count": top_artist_count,
            "headline": headline,
            "headline_type": headline_type,
        })

    # Summary stats
    types = defaultdict(int)
    for s in analyzed:
        types[s["session_type"]] += 1

    # Average session by hour bucket
    hour_buckets = {"morning": (5, 11), "afternoon": (12, 16), "evening": (17, 21), "night": (22, 4)}
    bucket_stats = defaultdict(lambda: {"count": 0, "avg_tracks": 0, "avg_duration": 0})
    for s in analyzed:
        h = s["start_hour"] or 0
        for bucket, (start, end) in hour_buckets.items():
            if start <= end:
                if start <= h <= end:
                    bucket_stats[bucket]["count"] += 1
                    bucket_stats[bucket]["avg_tracks"] += s["tracks_played"]
                    bucket_stats[bucket]["avg_duration"] += s["duration_min"]
            else:
                if h >= start or h <= end:
                    bucket_stats[bucket]["count"] += 1
                    bucket_stats[bucket]["avg_tracks"] += s["tracks_played"]
                    bucket_stats[bucket]["avg_duration"] += s["duration_min"]

    for b in bucket_stats:
        c = bucket_stats[b]["count"] or 1
        bucket_stats[b]["avg_tracks"] = round(bucket_stats[b]["avg_tracks"] / c, 1)
        bucket_stats[b]["avg_duration"] = round(bucket_stats[b]["avg_duration"] / c, 1)

    # Deep-dive sessions (most interesting for storytelling)
    deep_dives = sorted(
        [s for s in analyzed if s["session_type"] == "deep_dive"],
        key=lambda x: -x["tracks_played"]
    )[:20]

    out("sessions.json", {
        "total_sessions": len(analyzed),
        "sessions": analyzed,
        "type_counts": dict(types),
        "hour_bucket_stats": dict(bucket_stats),
        "top_deep_dives": deep_dives,
        "avg_session_tracks": round(sum(s["tracks_played"] for s in analyzed) / len(analyzed), 1) if analyzed else 0,
        "avg_session_duration_min": round(sum(s["duration_min"] for s in analyzed) / len(analyzed), 1) if analyzed else 0,
    })

# ---------------------------------------------------------------------------
# 10. Dual identity
# ---------------------------------------------------------------------------

def gen_dual_identity(conn, ag):
    """
    Classify each session (and each year) by dominant identity:
    Indian Indie/Folk vs Hip-Hop vs Classic Rock vs other.
    """
    IDENTITIES = ["Indian Indie/Folk", "Hip-Hop", "Classic Rock", "Alternative/Indie Rock", "Punjabi/Bhangra"]

    # By year
    years = conn.execute("SELECT DISTINCT substr(end_time,1,4) FROM streams ORDER BY 1").fetchall()
    years = [r[0] for r in years]

    by_year = {}
    for year in years:
        rows = conn.execute("""
            SELECT artist, SUM(ms_played) as ms FROM streams
            WHERE substr(end_time,1,4)=? AND is_skip=0
            GROUP BY artist
        """, (year,)).fetchall()

        identity_ms = defaultdict(float)
        total_ms = 0
        for artist, ms in rows:
            total_ms += ms
            buckets = ag.get(artist, [])
            share = ms / len(buckets) if buckets else ms
            for b in buckets:
                identity_ms[b] += share

        total = sum(identity_ms.values()) or 1
        by_year[year] = {
            identity: round(identity_ms.get(identity, 0) / total * 100, 1)
            for identity in IDENTITIES
        }
        by_year[year]["Other"] = round(
            max(0, 100 - sum(by_year[year].values())), 1
        )

    # Artists per identity (for display)
    identity_artists = defaultdict(list)
    rows = conn.execute("""
        SELECT artist,
               SUM(CASE WHEN is_skip=0 THEN 1 ELSE 0 END) as full_plays,
               SUM(is_skip) as skips,
               COUNT(*) as total
        FROM streams
        GROUP BY artist HAVING full_plays >= 10
        ORDER BY full_plays DESC
    """).fetchall()
    for artist, full_plays, skips, total in rows:
        for bucket in ag.get(artist, []):
            if bucket in IDENTITIES:
                identity_artists[bucket].append({
                    "name": artist,
                    "plays": full_plays,
                    "skip_pct": round(skips / total * 100, 1) if total else 0,
                })

    out("dual_identity.json", {
        "by_year": by_year,
        "identities": IDENTITIES,
        "identity_artists": {k: v[:15] for k, v in identity_artists.items()},
    })

# ---------------------------------------------------------------------------
# 11. Popularity
# ---------------------------------------------------------------------------

def gen_popularity(conn):
    """
    Uses agg_popularity_year and agg_track_stats (already built by build_agg_tables.py).
    Reads directly from those tables for speed.
    """

    TIER_ORDER = ["mainstream", "popular", "mid", "niche", "underground"]
    TIER_LABELS = {
        "mainstream":  "Mainstream (80–100)",
        "popular":     "Popular (60–79)",
        "mid":         "Mid-tier (40–59)",
        "niche":       "Niche (20–39)",
        "underground": "Underground (<20)",
    }

    # 1. Overall tier breakdown with real skip rates from raw streams
    overall_rows = conn.execute("""
        SELECT apy.pop_bucket, apy.pop_min, apy.pop_max,
               apy.full_plays, apy.pct_of_year,
               ROUND(AVG(s.is_skip)*100, 1) as raw_skip_pct
        FROM agg_popularity_year apy
        JOIN streams s ON 1=1
        JOIN track_info ti ON s.uri = ti.uri
            AND ti.popularity BETWEEN apy.pop_min AND apy.pop_max
        WHERE apy.year = 'all'
        GROUP BY apy.pop_bucket
        ORDER BY apy.pop_min DESC
    """).fetchall()

    overall = []
    for bucket, lo, hi, full_plays, pct, skip_pct in overall_rows:
        overall.append({
            "bucket": bucket,
            "label": TIER_LABELS[bucket],
            "pop_min": lo, "pop_max": hi,
            "full_plays": full_plays,
            "pct": pct,
            "skip_pct": skip_pct,
        })

    # 2. Avg popularity per year (the trend)
    trend = conn.execute("""
        SELECT substr(s.end_time,1,4) as year,
               ROUND(AVG(ti.popularity), 1) as avg_pop,
               COUNT(*) as full_plays
        FROM streams s
        JOIN track_info ti ON s.uri = ti.uri
        WHERE s.is_skip = 0 AND ti.popularity IS NOT NULL
        GROUP BY year ORDER BY year
    """).fetchall()

    trend_series = [{"year": int(y), "avg_pop": p, "full_plays": c} for y, p, c in trend]

    # 3. Tier % by year (stacked bar data)
    by_year_rows = conn.execute("""
        SELECT year, pop_bucket, pct_of_year
        FROM agg_popularity_year
        WHERE year != 'all'
        ORDER BY year, pop_min DESC
    """).fetchall()

    by_year = {}
    for year, bucket, pct in by_year_rows:
        by_year.setdefault(year, {})[bucket] = pct

    tier_by_year = [
        {"year": int(y), **by_year[y]}
        for y in sorted(by_year.keys())
    ]

    # 4. Underground gems — low popularity but heavily played
    underground = conn.execute("""
        SELECT track, artist, full_plays, popularity, completion_pct, skip_pct
        FROM agg_track_stats
        WHERE popularity < 20 AND full_plays >= 3
        ORDER BY full_plays DESC LIMIT 12
    """).fetchall()

    # 5. Mainstream hits — high popularity, well played
    mainstream = conn.execute("""
        SELECT track, artist, full_plays, popularity, completion_pct, skip_pct
        FROM agg_track_stats
        WHERE popularity >= 80 AND full_plays >= 5
        ORDER BY full_plays DESC LIMIT 12
    """).fetchall()

    def track_row(r):
        return {"track": r[0], "artist": r[1], "full_plays": r[2],
                "popularity": r[3], "completion_pct": r[4], "skip_pct": r[5]}

    out("popularity.json", {
        "overall": overall,
        "trend": trend_series,
        "tier_by_year": tier_by_year,
        "tier_order": TIER_ORDER,
        "tier_labels": TIER_LABELS,
        "underground_gems": [track_row(r) for r in underground],
        "mainstream_hits":  [track_row(r) for r in mainstream],
    })

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Connecting to spotify.db...")
    conn = connect()

    print("Building artist→genre map...")
    ag = build_artist_genre_map(conn)
    print(f"  {len(ag)} artists mapped")

    print("Generating overview...")
    gen_overview(conn, ag)

    print("Generating by_year...")
    gen_by_year(conn, ag)

    print("Generating genre_evolution...")
    gen_genre_evolution(conn, ag)

    print("Generating skip_honesty...")
    gen_skip_honesty(conn)

    print("Generating time_heatmap...")
    gen_time_heatmap(conn)

    print("Generating discovery_timeline...")
    gen_discovery_timeline(conn)

    print("Generating top_tracks...")
    gen_top_tracks(conn)

    print("Generating sessions (this may take a moment)...")
    gen_sessions(conn, ag)

    print("Generating dual_identity...")
    gen_dual_identity(conn, ag)

    print("Generating popularity...")
    gen_popularity(conn)

    conn.close()
    print("\nDone. All JSON files written to ./data/")
