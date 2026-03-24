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

        year_total_plays = sum(c for _, c, _ in top_artists) or 1

        # Get lifetime plays for intensity calculation
        lifetime = {a: p for a, p in conn.execute(
            "SELECT artist, full_plays FROM agg_artist_stats"
        ).fetchall()}

        result[year] = {
            "streams": total,
            "hours": round(ms / 3_600_000, 1),
            "skip_rate_pct": round(skips / total * 100, 1) if total else 0,
            "top_artists": [{
                "name": a,
                "plays": c,
                "year_share": round(c / (total - (skips or 0)) * 100, 1) if (total - (skips or 0)) else 0,
                "intensity": round(c / lifetime.get(a, c) * 100, 1),
            } for a, c, s in top_artists],
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
# 12. Skip Timing
# ---------------------------------------------------------------------------

def gen_skip_timing(conn, ag):
    """
    At what % of a track do people bail?
    Histogram of completion buckets (0–100% in 10% steps).
    Breakdown by genre and by time of day.
    """
    # Overall histogram
    hist = conn.execute("""
        SELECT CAST(ROUND(MIN(CAST(s.ms_played AS FLOAT)/ti.duration_ms, 1.0)*10)*10 AS INTEGER) AS pct,
               COUNT(*) AS cnt
        FROM streams s
        JOIN track_info ti ON s.uri = ti.uri
        WHERE ti.duration_ms > 30000 AND s.ms_played > 0
        GROUP BY pct ORDER BY pct
    """).fetchall()

    total = sum(r[1] for r in hist) or 1
    histogram = [{"pct": r[0], "count": r[1], "share": round(r[1]/total*100, 1)} for r in hist]

    # By genre — avg completion + skip-at-30s rate
    genre_rows = conn.execute("""
        SELECT s.artist,
               ROUND(MIN(CAST(s.ms_played AS FLOAT)/ti.duration_ms,1.0)*100,1) AS completion
        FROM streams s
        JOIN track_info ti ON s.uri=ti.uri
        WHERE ti.duration_ms > 30000 AND s.ms_played > 0
    """).fetchall()

    genre_completions = defaultdict(list)
    for artist, comp in genre_rows:
        for bucket in ag.get(artist, ["Other"]):
            genre_completions[bucket].append(comp)

    genre_stats = []
    for genre, comps in genre_completions.items():
        if len(comps) < 50:
            continue
        avg_comp = round(sum(comps) / len(comps), 1)
        bail_early = sum(1 for c in comps if c < 30) / len(comps) * 100
        played_full = sum(1 for c in comps if c >= 90) / len(comps) * 100
        genre_stats.append({
            "genre": genre,
            "avg_completion": avg_comp,
            "bail_early_pct": round(bail_early, 1),
            "played_full_pct": round(played_full, 1),
            "total": len(comps),
        })
    genre_stats.sort(key=lambda x: -x["avg_completion"])

    # By hour (IST) — avg completion per hour bucket
    hour_rows = conn.execute("""
        SELECT s.hour,
               ROUND(AVG(MIN(CAST(s.ms_played AS FLOAT)/ti.duration_ms,1.0))*100, 1) AS avg_comp,
               COUNT(*) AS cnt
        FROM streams s
        JOIN track_info ti ON s.uri=ti.uri
        WHERE ti.duration_ms > 30000 AND s.ms_played > 0 AND s.hour IS NOT NULL
        GROUP BY s.hour ORDER BY s.hour
    """).fetchall()

    by_hour = [{
        "hour_ist": ((r[0]*60+330)//60)%24,
        "hour_utc": r[0],
        "avg_completion": r[1],
        "count": r[2],
    } for r in hour_rows]

    # Key finding: what % skipped before 30s
    skipped_before_30s = next((r["share"] for r in histogram if r["pct"] == 0), 0)
    completed_full = next((r["share"] for r in histogram if r["pct"] == 100), 0)

    out("skip_timing.json", {
        "histogram": histogram,
        "genre_stats": genre_stats,
        "by_hour": by_hour,
        "skipped_before_30s_pct": skipped_before_30s,
        "completed_full_pct": completed_full,
    })


# ---------------------------------------------------------------------------
# 13. Seasonal Patterns
# ---------------------------------------------------------------------------

def gen_seasonal(conn, ag):
    """
    Monthly listening volume and genre distribution.
    Reveals seasonal listening habits across 7 years.
    """
    rows = conn.execute("""
        SELECT substr(end_time,1,7) AS month,
               COUNT(*) AS streams,
               SUM(ms_played) AS ms,
               SUM(is_skip) AS skips,
               artist
        FROM streams
        GROUP BY month, artist
        ORDER BY month
    """).fetchall()

    from collections import defaultdict
    monthly = defaultdict(lambda: {"streams": 0, "ms": 0, "skips": 0, "artist_ms": defaultdict(float)})
    for month, streams, ms, skips, artist in rows:
        monthly[month]["streams"] += streams
        monthly[month]["ms"] += ms
        monthly[month]["skips"] += skips
        monthly[month]["artist_ms"][artist] += ms

    # Build series
    series = []
    for month in sorted(monthly.keys()):
        m = monthly[month]
        total_ms = m["ms"] or 1
        genre_ms = defaultdict(float)
        for artist, ams in m["artist_ms"].items():
            for bucket in ag.get(artist, ["Other"]):
                genre_ms[bucket] += ams / len(ag.get(artist, ["Other"]))
        top_genre = max(genre_ms, key=genre_ms.get) if genre_ms else "Other"
        genre_pct = {g: round(v/total_ms*100, 1) for g, v in genre_ms.items()}
        series.append({
            "month": month,
            "year": int(month[:4]),
            "month_num": int(month[5:7]),
            "streams": m["streams"],
            "hours": round(m["ms"]/3_600_000, 1),
            "skip_pct": round(m["skips"]/m["streams"]*100, 1) if m["streams"] else 0,
            "top_genre": top_genre,
            "genre_pct": genre_pct,
        })

    # Average by calendar month (Jan–Dec) across all years
    month_avg = defaultdict(list)
    for s in series:
        month_avg[s["month_num"]].append(s["hours"])
    avg_by_month = [{"month_num": m, "avg_hours": round(sum(v)/len(v), 1)}
                    for m, v in sorted(month_avg.items())]

    # Peak month overall
    peak = max(series, key=lambda x: x["streams"])

    out("seasonal.json", {
        "series": series,
        "avg_by_month": avg_by_month,
        "peak_month": peak["month"],
        "peak_streams": peak["streams"],
    })


# ---------------------------------------------------------------------------
# 14. Loyalty vs Churn
# ---------------------------------------------------------------------------

def gen_loyalty_churn(conn):
    """
    Per year: how many new artists discovered, how many retained from prior year,
    how many dropped (never came back).
    """
    rows = conn.execute("""
        SELECT artist, substr(end_time,1,4) AS year, COUNT(*) AS plays
        FROM streams
        GROUP BY artist, year
        ORDER BY year
    """).fetchall()

    year_artists = defaultdict(set)
    year_plays = defaultdict(lambda: defaultdict(int))
    for artist, year, plays in rows:
        year_artists[year].add(artist)
        year_plays[year][artist] = plays

    years = sorted(year_artists.keys())
    result = []
    cumulative_seen = set()

    for i, year in enumerate(years):
        current = year_artists[year]
        prev = year_artists[years[i-1]] if i > 0 else set()

        new_artists = current - cumulative_seen
        retained = current & prev
        dropped = prev - current

        # Top new discoveries (by plays in discovery year)
        top_new = sorted(new_artists, key=lambda a: -year_plays[year].get(a, 0))[:8]
        top_dropped = sorted(dropped, key=lambda a: -year_plays[years[i-1]].get(a, 0))[:8] if i > 0 else []

        cumulative_seen |= current

        result.append({
            "year": int(year),
            "new": len(new_artists),
            "retained": len(retained),
            "dropped": len(dropped) if i > 0 else 0,
            "total_active": len(current),
            "retention_pct": round(len(retained)/len(prev)*100, 1) if prev else 100,
            "top_new": [{"artist": a, "plays": year_plays[year].get(a, 0)} for a in top_new],
            "top_dropped": [{"artist": a, "plays": year_plays[years[i-1]].get(a, 0)} for a in top_dropped],
        })

    out("loyalty_churn.json", {"by_year": result})


# ---------------------------------------------------------------------------
# 15. Listening Streaks
# ---------------------------------------------------------------------------

def gen_streaks(conn):
    """
    Longest consecutive listening days, biggest silence gaps, monthly cadence.
    """
    from datetime import datetime, timedelta

    days = [r[0] for r in conn.execute("""
        SELECT DISTINCT substr(end_time,1,10) AS day
        FROM streams ORDER BY day
    """).fetchall()]

    if not days:
        out("streaks.json", {})
        return

    day_set = set(days)
    day_objs = [datetime.strptime(d, "%Y-%m-%d") for d in days]

    # Find all streaks
    streaks = []
    streak_start = day_objs[0]
    streak_len = 1
    for i in range(1, len(day_objs)):
        if (day_objs[i] - day_objs[i-1]).days == 1:
            streak_len += 1
        else:
            streaks.append({"start": streak_start.strftime("%Y-%m-%d"),
                            "end": day_objs[i-1].strftime("%Y-%m-%d"),
                            "days": streak_len})
            streak_start = day_objs[i]
            streak_len = 1
    streaks.append({"start": streak_start.strftime("%Y-%m-%d"),
                    "end": day_objs[-1].strftime("%Y-%m-%d"),
                    "days": streak_len})

    top_streaks = sorted(streaks, key=lambda x: -x["days"])[:10]

    # Silence gaps (days with no listening)
    gaps = []
    for i in range(1, len(day_objs)):
        gap = (day_objs[i] - day_objs[i-1]).days - 1
        if gap >= 3:
            gaps.append({
                "from": day_objs[i-1].strftime("%Y-%m-%d"),
                "to": day_objs[i].strftime("%Y-%m-%d"),
                "days": gap,
            })
    top_gaps = sorted(gaps, key=lambda x: -x["days"])[:10]

    # Listening days per month
    month_days = defaultdict(int)
    for d in days:
        month_days[d[:7]] += 1

    monthly_cadence = [{"month": m, "days": c} for m, c in sorted(month_days.items())]

    # Overall stats
    total_span = (day_objs[-1] - day_objs[0]).days + 1
    active_days = len(days)

    out("streaks.json", {
        "top_streaks": top_streaks,
        "top_gaps": top_gaps,
        "monthly_cadence": monthly_cadence,
        "total_active_days": active_days,
        "total_span_days": total_span,
        "activity_pct": round(active_days / total_span * 100, 1),
        "longest_streak": top_streaks[0] if top_streaks else None,
        "longest_gap": top_gaps[0] if top_gaps else None,
    })


# ---------------------------------------------------------------------------
# 16. Artist Quality Score
# ---------------------------------------------------------------------------

def gen_artist_quality(conn):
    """
    Composite quality score per artist:
      engagement  = (1 - skip_pct/100) × avg_completion_pct/100
      depth       = unique_tracks_played (log-scaled)
      loyalty     = longevity_months (log-scaled)
      quality     = engagement × log1p(unique_tracks) × log1p(longevity_months)
    """
    import math

    # Per-artist completion + catalog depth from agg_track_stats
    depth_rows = conn.execute("""
        SELECT artist,
               COUNT(DISTINCT uri)             AS unique_tracks,
               AVG(COALESCE(completion_pct,0)) AS avg_completion,
               SUM(full_plays)                 AS full_plays
        FROM agg_track_stats
        GROUP BY artist
    """).fetchall()
    depth_map = {r[0]: {"unique_tracks": r[1], "avg_completion": r[2] or 0, "full_plays": r[3]}
                 for r in depth_rows}

    # From agg_artist_stats: skip_pct, longevity, hours, category
    artists = conn.execute("""
        SELECT artist, full_plays, skip_pct, hours, category,
               genre_buckets, first_stream, last_stream
        FROM agg_artist_stats
        WHERE full_plays >= 10
        ORDER BY full_plays DESC
    """).fetchall()

    def months_between(a, b):
        from datetime import datetime
        da = datetime.strptime(a[:7], "%Y-%m")
        db = datetime.strptime(b[:7], "%Y-%m")
        return max(1, (db.year - da.year) * 12 + (db.month - da.month))

    records = []
    for artist, full_plays, skip_pct, hours, category, genre_buckets, first, last in artists:
        d = depth_map.get(artist, {"unique_tracks": 1, "avg_completion": 50, "full_plays": full_plays})
        longevity = months_between(first, last)
        engagement = (1 - skip_pct / 100) * (d["avg_completion"] / 100)
        quality = engagement * math.log1p(d["unique_tracks"]) * math.log1p(longevity)
        records.append({
            "artist": artist,
            "quality_score": round(quality, 4),
            "engagement": round(engagement, 3),
            "unique_tracks": d["unique_tracks"],
            "avg_completion": round(d["avg_completion"], 1),
            "full_plays": full_plays,
            "skip_pct": round(skip_pct, 1),
            "longevity_months": longevity,
            "hours": round(hours, 1),
            "category": category,
            "genre": genre_buckets.split(",")[0] if genre_buckets else "Other",
        })

    records.sort(key=lambda r: -r["quality_score"])

    # Normalise to 0–100 for display
    max_q = records[0]["quality_score"] if records else 1
    for r in records:
        r["quality_score_pct"] = round(r["quality_score"] / max_q * 100, 1)

    out("artist_quality.json", {
        "artists": records[:100],   # top 100 for scatter + table
        "top20": records[:20],
    })


# ---------------------------------------------------------------------------
# 13. Album Affinity
# ---------------------------------------------------------------------------

def gen_album_affinity(conn):
    """
    Albums ranked by genuine engagement:
      score = avg_completion × (tracks_played / tracks_in_db) × log1p(full_plays)
    Cross-referenced with saved_tracks (YourLibrary) for saved-but-unplayed gaps.
    """
    import math, os, json

    albums = conn.execute("""
        SELECT ti.album, ti.artist,
               COUNT(DISTINCT ti.uri)                                          AS db_tracks,
               COUNT(DISTINCT s.uri)                                           AS played_tracks,
               SUM(CASE WHEN s.is_skip=0 THEN 1 ELSE 0 END)                   AS full_plays,
               ROUND(AVG(
                 CASE WHEN ti.duration_ms > 0
                      THEN MIN(CAST(s.ms_played AS FLOAT)/ti.duration_ms, 1.0)
                      ELSE NULL END
               )*100, 1)                                                        AS avg_completion,
               MIN(s.end_time)                                                  AS first_played,
               MAX(s.end_time)                                                  AS last_played,
               ti.release_year
        FROM streams s
        JOIN track_info ti ON s.uri = ti.uri
        WHERE ti.album IS NOT NULL AND ti.album != ''
        GROUP BY ti.album, ti.artist
        HAVING played_tracks >= 3
        ORDER BY avg_completion DESC
    """).fetchall()

    # Load saved tracks from YourLibrary.json
    lib_path = os.path.join(os.path.dirname(__file__),
                            "../../spotify_data/Spotify Account Data/YourLibrary.json")
    saved_album_set = set()
    saved_track_uris = set()
    if os.path.exists(lib_path):
        lib = json.load(open(lib_path))
        for a in lib.get("albums", []):
            saved_album_set.add(a["album"].lower())
        for t in lib.get("tracks", []):
            saved_track_uris.add(t["uri"])

    records = []
    for album, artist, db_tracks, played, full_plays, avg_comp, first, last, rel_year in albums:
        if not avg_comp:
            continue
        coverage = played / db_tracks
        score = (avg_comp / 100) * coverage * math.log1p(full_plays)
        records.append({
            "album": album,
            "artist": artist,
            "score": round(score, 4),
            "db_tracks": db_tracks,
            "played_tracks": played,
            "coverage_pct": round(coverage * 100, 1),
            "full_plays": full_plays,
            "avg_completion": avg_comp,
            "first_played": first[:10] if first else None,
            "last_played": last[:10] if last else None,
            "release_year": rel_year,
            "in_library": album.lower() in saved_album_set,
        })

    records.sort(key=lambda r: -r["score"])

    # Normalise score to 0–100
    max_s = records[0]["score"] if records else 1
    for r in records:
        r["score_pct"] = round(r["score"] / max_s * 100, 1)

    # Albums in library but low score (saved but not really listened)
    saved_not_played = [r for r in records if r["in_library"] and r["score_pct"] < 30]

    out("album_affinity.json", {
        "albums": records[:60],
        "top20": records[:20],
        "saved_not_played": saved_not_played[:10],
        "total_albums": len(records),
    })


# ---------------------------------------------------------------------------
# 14. "Not Me" Session Detector
# ---------------------------------------------------------------------------

def gen_borrowed_phone(conn):
    """
    Flags sessions likely not listened by the owner:
    - High track completion (songs played through)
    - Artists the owner normally skips heavily
    - Possibly unusual genre for this listener

    anomaly_score = avg_completion × avg_artist_skip_pct × log1p(duration_min)
    High score = played songs fully that are normally skipped = someone else.
    """
    import math
    from datetime import datetime

    def parse_dt(s):
        try: return datetime.strptime(s, "%Y-%m-%d %H:%M")
        except: return None

    # Artist lifetime skip rates
    artist_skip = {r[0]: r[1] for r in conn.execute(
        "SELECT artist, skip_pct FROM agg_artist_stats"
    ).fetchall()}

    # Fetch streams with completion info
    rows = conn.execute("""
        SELECT s.end_time, s.artist, s.track, s.ms_played, s.is_skip,
               s.hour, s.dow, ti.duration_ms, s.uri
        FROM streams s
        LEFT JOIN track_info ti ON s.uri = ti.uri
        ORDER BY s.end_time
    """).fetchall()

    # Cluster into sessions (same 30-min gap logic)
    GAP_MS = 30 * 60 * 1000
    sessions, current = [], []
    for row in rows:
        dt = parse_dt(row[0])
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
        if len(sess) < 4:
            continue
        n = len(sess)
        artists = [r[1] for r in sess]
        skips = sum(r[4] for r in sess)
        skip_rate = skips / n

        # Completion rate for tracks with known duration
        completions = []
        for r in sess:
            dur = r[7]
            if dur and dur > 0:
                completions.append(min(r[3] / dur, 1.0))
        avg_completion = sum(completions) / len(completions) if completions else 0

        # Avg lifetime skip rate of artists in session
        artist_skips = [artist_skip.get(a, 50) for a in artists]
        avg_artist_skip = sum(artist_skips) / len(artist_skips)

        first_dt = parse_dt(sess[0][0])
        last_dt  = parse_dt(sess[-1][0])
        duration_min = round((last_dt - first_dt).total_seconds() / 60 + sess[-1][3] / 60000, 1)

        # anomaly: high completion + artists you normally skip + decent length
        anomaly_score = avg_completion * (avg_artist_skip / 100) * math.log1p(duration_min)

        hour = sess[0][5]
        ist_hour = ((hour * 60 + 330) // 60) % 24 if hour is not None else None
        dow = sess[0][6]

        top_artist = max(set(artists), key=artists.count)
        unique_artists = len(set(artists))

        records.append({
            "date": sess[0][0][:10],
            "ist_hour": ist_hour,
            "dow": dow,
            "duration_min": duration_min,
            "tracks_played": n,
            "unique_artists": unique_artists,
            "skip_rate": round(skip_rate * 100, 1),
            "avg_completion": round(avg_completion * 100, 1),
            "avg_artist_skip": round(avg_artist_skip, 1),
            "anomaly_score": round(anomaly_score, 4),
            "top_artist": top_artist,
            "artists_preview": list(dict.fromkeys(artists))[:4],
        })

    records.sort(key=lambda r: -r["anomaly_score"])

    # Normalise
    max_s = records[0]["anomaly_score"] if records else 1
    for r in records:
        r["anomaly_pct"] = round(r["anomaly_score"] / max_s * 100, 1)

    # Baseline: your normal high-completion sessions (low anomaly, high completion)
    normal = sorted(
        [r for r in records if r["avg_completion"] > 70 and r["avg_artist_skip"] < 35],
        key=lambda r: -r["avg_completion"]
    )[:5]

    out("borrowed_phone.json", {
        "suspicious": records[:20],
        "normal_high_completion": normal,
        "total_sessions": len(records),
        "avg_completion_all": round(sum(r["avg_completion"] for r in records) / len(records), 1) if records else 0,
    })


# ---------------------------------------------------------------------------
# 15. Artist Lifecycle
# ---------------------------------------------------------------------------

def gen_artist_lifecycle(conn, ag):
    """
    For each significant artist, compute:
    - longevity_months: months between first and last stream
    - peak_month: month with most full plays
    - archetype: anchor / obsession / background / experiment
    - monthly play series for timeline rendering
    """
    from datetime import datetime

    def months_between(a, b):
        da = datetime.strptime(a[:7], "%Y-%m")
        db = datetime.strptime(b[:7], "%Y-%m")
        return max(1, (db.year - da.year) * 12 + (db.month - da.month))

    # Fetch artists with enough data
    artists = conn.execute("""
        SELECT artist, full_plays, skip_pct, hours, first_stream, last_stream,
               category, genre_buckets
        FROM agg_artist_stats
        WHERE full_plays >= 5
        ORDER BY full_plays DESC
    """).fetchall()

    # Monthly full plays per artist
    monthly_rows = conn.execute("""
        SELECT artist, substr(end_time, 1, 7) as month, COUNT(*) as plays
        FROM streams
        WHERE is_skip = 0
        GROUP BY artist, month
    """).fetchall()

    monthly_map = defaultdict(dict)
    for artist, month, plays in monthly_rows:
        monthly_map[artist][month] = plays

    def get_concentration(mdata, full_plays):
        """Fraction of plays in top-3 months — high = burst listener, low = steady."""
        if not mdata or not full_plays:
            return 1.0
        top3 = sum(v for _, v in sorted(mdata.items(), key=lambda x: -x[1])[:3])
        return round(top3 / full_plays, 3)

    def archetype(longevity, full_plays, concentration):
        # Anchor: long relationship, plays spread evenly across time
        if longevity >= 48 and full_plays >= 30 and concentration < 0.45:
            return "anchor"
        # Obsession: most plays happened in a short burst (even if known for years)
        if concentration >= 0.65 and full_plays >= 20:
            return "obsession"
        # Background: always around, never fully committed
        if longevity >= 30 and full_plays < 25:
            return "background"
        return "experiment"

    records = []
    for artist, full_plays, skip_pct, hours, first, last, category, genre_buckets in artists:
        longevity = months_between(first, last)
        mdata = monthly_map.get(artist, {})
        peak_month = max(mdata, key=mdata.get) if mdata else first[:7]
        peak_plays = mdata.get(peak_month, 0)
        plays_per_month = round(full_plays / longevity, 2)
        concentration = get_concentration(mdata, full_plays)
        arc = archetype(longevity, full_plays, concentration)
        buckets = genre_buckets.split(",") if genre_buckets else ["Other"]

        records.append({
            "artist": artist,
            "full_plays": full_plays,
            "skip_pct": round(skip_pct, 1),
            "hours": round(hours, 1),
            "first": first[:7],
            "last": last[:7],
            "longevity_months": longevity,
            "peak_month": peak_month,
            "peak_plays": peak_plays,
            "plays_per_month": plays_per_month,
            "concentration": concentration,
            "archetype": arc,
            "genre": buckets[0],
            "category": category,
        })

    # Archetype counts
    archetype_counts = defaultdict(int)
    for r in records:
        archetype_counts[r["archetype"]] += 1

    # Top per archetype
    def top(arch, n=10):
        return [r for r in records if r["archetype"] == arch][:n]

    # Timeline — balanced across archetypes so all 4 colors show
    # Top N per archetype, sorted by first listen overall
    timeline_pool = []
    for arch, n in [("anchor", 12), ("obsession", 8), ("background", 8), ("experiment", 6)]:
        pool = [r for r in records if r["archetype"] == arch]
        pool.sort(key=lambda r: -r["full_plays"])
        timeline_pool.extend(pool[:n])
    timeline = sorted(timeline_pool, key=lambda r: r["first"])

    out("artist_lifecycle.json", {
        "artists": records,
        "archetype_counts": dict(archetype_counts),
        "anchors": top("anchor", 12),
        "obsessions": top("obsession", 12),
        "background": top("background", 10),
        "experiments": top("experiment", 10),
        "timeline": timeline,
    })


# ---------------------------------------------------------------------------
# 13. Decade DNA
# ---------------------------------------------------------------------------

def gen_decade_dna(conn, ag):
    """
    Release year distribution of everything played, by decade.
    Breakdown by genre bucket per decade.
    Top artists and tracks per decade.
    """

    def decade(year):
        return (year // 10) * 10

    # Deduplicate tracks: same (track, artist) may have multiple URIs.
    # Use earliest release_year per song, sum full_plays.
    raw = conn.execute("""
        SELECT ts.track, ts.artist, ts.release_year, ts.full_plays
        FROM agg_track_stats ts
        WHERE ts.release_year IS NOT NULL
          AND ts.release_year BETWEEN 1955 AND 2026
    """).fetchall()

    # Aggregate by (track, artist): pick min release year, sum plays
    track_agg = {}
    for track, artist, year, plays in raw:
        key = (track, artist)
        if key not in track_agg:
            track_agg[key] = [year, plays]
        else:
            track_agg[key][0] = min(track_agg[key][0], year)  # earliest year
            track_agg[key][1] += plays

    rows = [(year, plays, artist, track) for (track, artist), (year, plays) in track_agg.items()]

    decade_plays = defaultdict(int)
    decade_artists = defaultdict(lambda: defaultdict(int))
    decade_tracks = defaultdict(list)

    for year, plays, artist, track in rows:
        d = decade(year)
        decade_plays[d] += plays
        decade_artists[d][artist] += plays
        decade_tracks[d].append((plays, track, artist))

    total = sum(decade_plays.values()) or 1

    # Decade + genre breakdown
    # Get genre per artist from ag
    decade_genre = defaultdict(lambda: defaultdict(int))
    for year, plays, artist, track in rows:
        d = decade(year)
        buckets = ag.get(artist, ["Other"])
        share = plays / len(buckets)
        for b in buckets:
            decade_genre[d][b] += share

    decades_out = []
    for d in sorted(decade_plays.keys()):
        plays = decade_plays[d]
        top_artists = sorted(decade_artists[d].items(), key=lambda x: -x[1])[:6]
        top_tracks = sorted(decade_tracks[d], key=lambda x: -x[0])[:5]
        genre_breakdown = {g: round(v) for g, v in sorted(decade_genre[d].items(), key=lambda x: -x[1])[:6]}
        decades_out.append({
            "decade": d,
            "label": f"{d}s",
            "plays": plays,
            "pct": round(plays / total * 100, 1),
            "top_artists": [{"artist": a, "plays": p} for a, p in top_artists],
            "top_tracks": [{"track": t, "artist": a, "plays": p} for p, t, a in top_tracks],
            "genre_breakdown": genre_breakdown,
        })

    # Year-level granularity — use deduplicated rows
    year_agg = defaultdict(int)
    for year, plays, artist, track in rows:
        year_agg[year] += plays
    year_rows = sorted(year_agg.items())
    year_dist = [{"year": y, "plays": p} for y, p in year_rows]

    # Median release year (weighted)
    sorted_years = []
    for y, p in year_rows:
        sorted_years.extend([y] * p)
    sorted_years.sort()
    median_year = sorted_years[len(sorted_years) // 2] if sorted_years else 2000

    out("decade_dna.json", {
        "decades": decades_out,
        "year_dist": year_dist,
        "median_release_year": median_year,
        "total_with_year": sum(decade_plays.values()),
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

    print("Generating artist_lifecycle...")
    gen_artist_lifecycle(conn, ag)

    print("Generating decade_dna...")
    gen_decade_dna(conn, ag)

    print("Generating artist_quality...")
    gen_artist_quality(conn)

    print("Generating album_affinity...")
    gen_album_affinity(conn)

    print("Generating skip_timing...")
    gen_skip_timing(conn, ag)

    print("Generating seasonal...")
    gen_seasonal(conn, ag)

    print("Generating loyalty_churn...")
    gen_loyalty_churn(conn)

    print("Generating streaks...")
    gen_streaks(conn)

    conn.close()
    print("\nDone. All JSON files written to ./data/")
