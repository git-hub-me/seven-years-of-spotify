import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

export const SESSION_TYPES = {
  deep_dive: {
    color: "#E8A838",
    label: "Deep Dive",
    icon: "🐇",
    definition: "Single artist, 5+ tracks. You locked in and didn't come up for air.",
  },
  marathon: {
    color: "#E84855",
    label: "Marathon",
    icon: "⏱",
    definition: "90+ consecutive minutes, <60% skip rate. Sessions that sneak up on you.",
  },
  late_night: {
    color: "#5865F2",
    label: "Late Night",
    icon: "🌙",
    definition: "Sessions starting 10pm–4am IST. Slower, more emotional, less structured.",
  },
  focused: {
    color: "#1DB954",
    label: "Focused",
    icon: "🎯",
    definition: "Multi-artist, <25% skip rate, 6+ tracks. Intentional, deliberate listening.",
  },
  shuffle_explore: {
    color: "#9B59B6",
    label: "Shuffle & Explore",
    icon: "🔀",
    definition: "5+ artists, 60%+ skip rate. Discovery mode — searching without quite knowing what for.",
  },
  work_background: {
    color: "#00CEC9",
    label: "Work Background",
    icon: "💻",
    definition: "40+ minutes, 4+ artists, moderate skip rate. Music as ambient environment.",
  },
  mixed: {
    color: "#555",
    label: "Casual",
    icon: "〰",
    definition: "Everyday listening that doesn't fit a clear pattern.",
  },
};

const TYPE_ORDER = ["deep_dive", "marathon", "late_night", "focused", "shuffle_explore", "work_background", "mixed"];
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function engagementScore(s) {
  return s.duration_min * (1 - s.skip_rate / 100);
}

const StackTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>{label}</div>
      {sorted.map(p => (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: SESSION_TYPES[p.dataKey]?.color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ color: "#aaa" }}>{SESSION_TYPES[p.dataKey]?.label}</span>
          <span style={{ marginLeft: "auto", fontWeight: 600, color: "#f0f0f0" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SessionArchaeology({ data }) {
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortCol, setSortCol] = useState("score");
  const [showBestSessions, setShowBestSessions] = useState(false);

  if (!data?.sessions) return null;

  const { sessions, total_sessions, avg_session_tracks, avg_session_duration_min } = data;

  // Derive years from session dates
  const years = useMemo(() => {
    const ys = [...new Set(sessions.map(s => s.date.slice(0, 4)))].sort();
    return ys;
  }, [sessions]);

  // Sessions filtered by year
  const filteredSessions = useMemo(() =>
    selectedYear === "all" ? sessions : sessions.filter(s => s.date.startsWith(selectedYear)),
    [sessions, selectedYear]
  );

  // Stacked bar: session types per year
  const yearTypeData = useMemo(() => {
    return years.map(y => {
      const ys = sessions.filter(s => s.date.startsWith(y));
      const row = { year: y };
      TYPE_ORDER.forEach(t => { row[t] = ys.filter(s => s.session_type === t).length; });
      return row;
    });
  }, [sessions, years]);

  // Per-type stats for selected year
  const typeStats = useMemo(() => {
    return TYPE_ORDER.map(t => {
      const ts = filteredSessions.filter(s => s.session_type === t);
      if (!ts.length) return null;
      return {
        type: t,
        count: ts.length,
        avg_duration: Math.round(ts.reduce((a, s) => a + s.duration_min, 0) / ts.length),
        avg_skip: Math.round(ts.reduce((a, s) => a + s.skip_rate, 0) / ts.length),
        avg_tracks: Math.round(ts.reduce((a, s) => a + s.tracks_played, 0) / ts.length),
      };
    }).filter(Boolean);
  }, [filteredSessions]);

  // Best sessions table
  const bestSessions = useMemo(() => {
    return [...filteredSessions]
      .sort((a, b) => {
        if (sortCol === "score") return engagementScore(b) - engagementScore(a);
        if (sortCol === "duration") return b.duration_min - a.duration_min;
        if (sortCol === "tracks") return b.tracks_played - a.tracks_played;
        return 0;
      })
      .slice(0, 30);
  }, [filteredSessions, sortCol]);

  const filteredCount = filteredSessions.length;

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 4</div>
      <h2 className="section-title">Session Archaeology</h2>
      <p className="section-sub">
        {total_sessions.toLocaleString()} listening sessions over 7 years, grouped by 30 min gaps between tracks.
        Avg {avg_session_tracks} tracks · {avg_session_duration_min} minutes each.
      </p>

      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
        {typeStats.slice(0, 6).map(ts => {
          const t = SESSION_TYPES[ts.type];
          return (
            <div key={ts.type} className="card" style={{ borderTop: `2px solid ${t.color}` }}>
              <div style={{ fontSize: 11, color: t.color, fontWeight: 700, marginBottom: 4 }}>{t.icon} {t.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>{ts.count}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                avg {ts.avg_tracks} tracks · {ts.avg_duration}min
              </div>
              <div style={{ fontSize: 11, marginTop: 2, color: ts.avg_skip > 50 ? "var(--accent3)" : ts.avg_skip < 30 ? "var(--green)" : "var(--accent2)" }}>
                {ts.avg_skip}% skipped
              </div>
            </div>
          );
        })}
      </div>

      {/* Year selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        {["all", ...years].map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={{
              background: selectedYear === y ? "var(--green)22" : "transparent",
              border: `1px solid ${selectedYear === y ? "var(--green)" : "#2a2a2a"}`,
              color: selectedYear === y ? "var(--green)" : "#555",
              borderRadius: 20, padding: "5px 14px",
              fontSize: 12, cursor: "pointer",
              fontWeight: selectedYear === y ? 700 : 400,
              transition: "all 0.15s",
            }}
          >{y === "all" ? "All Years" : y}</button>
        ))}
        {selectedYear !== "all" && (
          <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center", marginLeft: 4 }}>
            {filteredCount} sessions
          </span>
        )}
      </div>

      {/* Stacked bar — session types by year */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Session Mix by Year</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          How your listening modes shifted — casual dominates, but deep dives and focus sessions reveal the meaningful days.
        </p>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearTypeData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
              <Tooltip content={<StackTooltip />} />
              {[...TYPE_ORDER].reverse().map(t => (
                <Bar key={t} dataKey={t} stackId="1" fill={SESSION_TYPES[t].color} name={SESSION_TYPES[t].label} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16, justifyContent: "center" }}>
          {TYPE_ORDER.map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#aaa" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: SESSION_TYPES[t].color, flexShrink: 0, display: "inline-block" }} />
              {SESSION_TYPES[t].label}
            </div>
          ))}
        </div>
      </div>

      {/* Per-type stats table */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
          By Type {selectedYear !== "all" ? `· ${selectedYear}` : "· All Years"}
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Type</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Sessions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Avg Tracks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Avg Duration</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Avg Skip</th>
                <th style={{ textAlign: "left", padding: "8px 0 8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>What it means</th>
              </tr>
            </thead>
            <tbody>
              {typeStats.map(ts => {
                const t = SESSION_TYPES[ts.type];
                return (
                  <tr key={ts.type} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 12px 10px 0" }}>
                      <span style={{ color: t.color, fontWeight: 700 }}>{t.icon} {t.label}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{ts.count}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>{ts.avg_tracks}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>{ts.avg_duration}min</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <span style={{ color: ts.avg_skip > 50 ? "var(--accent3)" : ts.avg_skip < 30 ? "var(--green)" : "var(--accent2)", fontWeight: 600 }}>
                        {ts.avg_skip}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 0 10px 12px", color: "#555", fontSize: 12, maxWidth: 280 }}>{t.definition}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best sessions table */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            Best Sessions {selectedYear !== "all" ? `· ${selectedYear}` : ""}
          </h3>
          <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
            <span style={{ color: "#555" }}>Sort by:</span>
            {[
              { key: "score", label: "Engagement" },
              { key: "duration", label: "Duration" },
              { key: "tracks", label: "Tracks" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortCol(key)}
                style={{
                  background: sortCol === key ? "var(--green)22" : "transparent",
                  border: `1px solid ${sortCol === key ? "var(--green)" : "#2a2a2a"}`,
                  color: sortCol === key ? "var(--green)" : "#555",
                  borderRadius: 12, padding: "3px 10px",
                  fontSize: 11, cursor: "pointer",
                  fontWeight: sortCol === key ? 700 : 400,
                }}
              >{label}</button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowBestSessions(p => !p)}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--muted)", borderRadius: 8, padding: "8px 16px",
            fontSize: 12, cursor: "pointer", font: "inherit", marginBottom: 20,
          }}
        >
          {showBestSessions ? "▲ Hide sessions" : "▼ Show best sessions"}
        </button>
        {showBestSessions && <>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          Engagement = duration × (1 – skip rate). Top 30 shown.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "8px 8px 8px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Date</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Type</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Headlined By</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Tracks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Duration</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Skipped</th>
                <th style={{ textAlign: "right", padding: "8px 0 8px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {bestSessions.map((s, i) => {
                const t = SESSION_TYPES[s.session_type] || SESSION_TYPES.mixed;
                const score = Math.round(engagementScore(s));
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "9px 8px 9px 0", color: "#444", textAlign: "right", minWidth: 24 }}>{i + 1}</td>
                    <td style={{ padding: "9px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {s.date}
                      {s.dow != null && <span style={{ color: "#444", marginLeft: 6 }}>{DOW_LABELS[s.dow]}</span>}
                    </td>
                    <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                      <span style={{ color: t.color, fontWeight: 600 }}>{t.icon} {t.label}</span>
                    </td>
                    <td style={{ padding: "9px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.headline}
                      {s.headline_type === "genre" && (
                        <span style={{ color: "#444", marginLeft: 6, fontSize: 11 }}>({s.top_artist})</span>
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text)" }}>{s.tracks_played}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{s.duration_min}m</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      <span style={{ color: s.skip_rate > 60 ? "var(--accent3)" : s.skip_rate < 25 ? "var(--green)" : "var(--accent2)" }}>
                        {Math.round(s.skip_rate)}%
                      </span>
                    </td>
                    <td style={{ padding: "9px 0 9px 12px", textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>}
      </div>
    </div>
  );
}
