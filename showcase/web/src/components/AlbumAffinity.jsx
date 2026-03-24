import React, { useState } from "react";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ScoreBar({ pct, color = "var(--green)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>{pct}</span>
    </div>
  );
}

function AlbumRow({ album, i, isExpanded, onToggle }) {
  const inLib = album.in_library;
  return (
    <div style={{ borderBottom: "1px solid #111" }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer" }}
      >
        <span style={{ fontSize: 11, color: "#444", width: 24, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {album.album}
            {inLib && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--green)", border: "1px solid var(--green)44", borderRadius: 4, padding: "1px 5px" }}>saved</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{album.artist} · {album.release_year || "?"}</div>
        </div>
        <div style={{ display: "flex", gap: 16, flexShrink: 0, fontSize: 11, alignItems: "center" }}>
          <span style={{ color: "var(--muted)" }}>{album.played_tracks}/{album.db_tracks} tracks</span>
          <span style={{ color: album.avg_completion > 65 ? "var(--green)" : album.avg_completion > 50 ? "var(--accent2)" : "var(--muted)" }}>
            {album.avg_completion}% complete
          </span>
          <span style={{ color: "var(--muted)" }}>{album.full_plays} plays</span>
          <div style={{ width: 60 }}>
            <ScoreBar pct={album.score_pct} />
          </div>
          <span style={{ color: "#555", fontSize: 12, marginLeft: 4 }}>{isExpanded ? "▾" : "▸"}</span>
        </div>
      </div>
      {isExpanded && (
        <div style={{ paddingLeft: 36, paddingBottom: 12, fontSize: 12, color: "#555", display: "flex", gap: 24 }}>
          <span>Coverage: <b style={{ color: "var(--text)" }}>{album.coverage_pct}%</b></span>
          <span>First played: <b style={{ color: "var(--text)" }}>{album.first_played}</b></span>
          <span>Last played: <b style={{ color: "var(--text)" }}>{album.last_played}</b></span>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function AlbumAffinity({ data }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  if (!data?.albums) return null;
  const { albums, total_albums } = data;

  const filtered = filter === "saved" ? albums.filter(a => a.in_library)
    : filter === "unsaved" ? albums.filter(a => !a.in_library)
    : albums;

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hiddenCount = filtered.length - PAGE_SIZE;

  const perfect = albums.filter(a => a.coverage_pct === 100);
  const avgCompletion = Math.round(albums.reduce((s, a) => s + a.avg_completion, 0) / albums.length);

  function changeFilter(key) {
    setFilter(key);
    setExpanded(null);
    setShowAll(false);
  }

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 11</div>
      <h2 className="section-title">Album Affinity</h2>
      <p className="section-sub">
        Albums where you didn't just play a hit — you played the whole thing.
        Ranked by completion × coverage × volume. {perfect.length} albums played cover-to-cover.
      </p>

      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent2)", lineHeight: 1 }}>{total_albums}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Albums with 3+ tracks played</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>{perfect.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Played every known track</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent2)", lineHeight: 1 }}>{avgCompletion}%</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Avg track completion across all albums</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--green)", lineHeight: 1.2 }}>{albums[0]?.album}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Highest affinity album</div>
          <div style={{ fontSize: 11, color: "#444" }}>{albums[0]?.artist}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["all", "All Albums"], ["saved", "Saved in Library"], ["unsaved", "Not Saved"]].map(([key, label]) => (
          <button key={key} onClick={() => changeFilter(key)} style={{
            background: filter === key ? "var(--green)22" : "transparent",
            border: `1px solid ${filter === key ? "var(--green)" : "#2a2a2a"}`,
            color: filter === key ? "var(--green)" : "#555",
            borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer",
            fontWeight: filter === key ? 700 : 400,
          }}>{label} {key === "saved" ? `(${albums.filter(a => a.in_library).length})` : ""}</button>
        ))}
      </div>

      {/* Album list */}
      <div className="card" style={{ padding: "0 16px" }}>
        {visible.map((a, i) => (
          <AlbumRow
            key={`${a.album}-${a.artist}`}
            album={a} i={i}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(prev => prev === i ? null : i)}
          />
        ))}
      </div>

      {/* Show more / less */}
      {filtered.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll(p => !p)}
          style={{
            marginTop: 12, background: "transparent",
            border: "1px solid var(--border)", color: "var(--muted)",
            borderRadius: 8, padding: "8px 20px", fontSize: 12,
            cursor: "pointer", width: "100%",
          }}
        >
          {showAll ? "▲ Show less" : `▼ Show ${hiddenCount} more albums`}
        </button>
      )}
    </div>
  );
}
