import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

export const GENRE_COLORS = {
  "Indian Indie/Folk": "#E8A838",
  "Hip-Hop": "#E84855",
  "Classic Rock": "#5865F2",
  "Alternative/Indie Rock": "#9B59B6",
  "Punjabi/Bhangra": "#1DB954",
  "Pop": "#38B2E8",
  "Electronic": "#00CEC9",
  "Folk/Acoustic": "#FDCB6E",
  "Jazz/Blues": "#6C5CE7",
  "Other": "#333",
};

const GENRE_DEFINITIONS = {
  "Indian Indie/Folk": "Hindi/Urdu indie, folk, and acoustic artists — Anuv Jain, Prateek Kuhad, The Local Train, A.R. Rahman. Identified via Spotify tags: 'indian indie', 'hindi pop', 'bollywood', 'desi pop'.",
  "Hip-Hop": "Western hip-hop and rap — Kendrick Lamar, Eminem, MF DOOM, Jay-Z, Dr. Dre. Includes desi hip-hop (DIVINE, Naezy). Tag: 'hip hop', 'rap', 'trap'.",
  "Classic Rock": "Rock from the 60s–90s — Beatles, Pink Floyd, RHCP, Rolling Stones. Tags: 'classic rock', 'rock', 'psychedelic rock', 'british invasion'.",
  "Alternative/Indie Rock": "Post-90s alternative — Radiohead, Nirvana, Tame Impala, Arctic Monkeys. Tags: 'alternative rock', 'indie rock', 'grunge'.",
  "Punjabi/Bhangra": "Punjabi pop and bhangra artists — AP Dhillon, Diljit Dosanjh, Karan Aujla. Tags: 'punjabi pop', 'bhangra', 'punjabi hip hop'. Note: small category by volume.",
  "Pop": "Mainstream pop — Taylor Swift, Dua Lipa, Coldplay. Tags: 'pop', 'dance pop', 'indie pop'.",
  "Electronic": "Electronic and EDM — Daft Punk, Avicii, The Chainsmokers. Tags: 'electronic', 'edm', 'house'.",
  "Folk/Acoustic": "Western folk and acoustic singer-songwriters — Bob Dylan, Ed Sheeran. Tags: 'folk', 'singer-songwriter', 'americana'.",
  "Jazz/Blues": "Jazz, blues, soul, and R&B. Tags: 'jazz', 'blues', 'soul', 'neo soul'.",
  "Other": "Artists with Spotify genre tags that don't map cleanly to any of the above buckets.",
};

const SHOW_BUCKETS = [
  "Hip-Hop", "Classic Rock", "Alternative/Indie Rock",
  "Indian Indie/Folk", "Folk/Acoustic", "Pop", "Electronic", "Jazz/Blues", "Punjabi/Bhangra",
];

const CustomTooltip = ({ active, payload, label, highlighted }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload]
    .sort((a, b) => b.value - a.value)
    .filter(p => p.value > 0.5);
  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #333",
      borderRadius: 8, padding: "12px 16px", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#f0f0f0" }}>{label}</div>
      {sorted.map(p => (
        <div key={p.name} style={{
          display: "flex", gap: 8, alignItems: "center", marginBottom: 4,
          opacity: highlighted && highlighted !== p.name ? 0.4 : 1,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
          <span style={{ color: "#aaa" }}>{p.name}</span>
          <span style={{ marginLeft: "auto", fontWeight: 600, color: "#f0f0f0" }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function GenreEvolution({ data }) {
  const [highlighted, setHighlighted] = useState(null);

  if (!data?.series) return null;

  const buckets = SHOW_BUCKETS.filter(b =>
    data.series.some(pt => (pt[b] || 0) > 1)
  );

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 1</div>
      <h2 className="section-title">The Shape of Seven Years</h2>
      <p className="section-sub">
        Genre share by year — not what Spotify showed you, but what you actually played.
        <b style={{ color: "var(--text)" }}> Click a genre</b> in the legend to isolate it.
      </p>

      {/* Genre definition box — shows on highlight */}
      <div style={{
        height: 56,
        marginBottom: 24,
        transition: "all 0.2s",
      }}>
        {highlighted ? (
          <div style={{
            background: (GENRE_COLORS[highlighted] || "#888") + "11",
            border: `1px solid ${GENRE_COLORS[highlighted] || "#888"}33`,
            borderRadius: 8, padding: "10px 16px",
            fontSize: 13, color: "#ccc", lineHeight: 1.6,
          }}>
            <b style={{ color: GENRE_COLORS[highlighted] || "#aaa" }}>{highlighted}:</b>{" "}
            {GENRE_DEFINITIONS[highlighted] || ""}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#555", paddingTop: 16 }}>
            Click any genre in the legend below to see its definition and isolate it on the chart.
          </div>
        )}
      </div>

      <div className="chart-wrap" style={{ height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              {buckets.map(b => (
                <linearGradient key={b} id={`grad-${b.replace(/[^a-zA-Z]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GENRE_COLORS[b] || "#888"} stopOpacity={0.85} />
                  <stop offset="95%" stopColor={GENRE_COLORS[b] || "#888"} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 12 }} />
            <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip content={<CustomTooltip highlighted={highlighted} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 20, cursor: "pointer" }}
              onClick={(e) => setHighlighted(prev => prev === e.value ? null : e.value)}
              formatter={(value) => (
                <span style={{
                  color: highlighted ? (highlighted === value ? GENRE_COLORS[value] || "#f0f0f0" : "#444") : "#aaa",
                  fontWeight: highlighted === value ? 700 : 400,
                  transition: "color 0.15s",
                  cursor: "pointer",
                }}>{value}</span>
              )}
            />
            {buckets.map(b => (
              <Area
                key={b}
                type="monotone"
                dataKey={b}
                stackId="1"
                stroke={GENRE_COLORS[b] || "#888"}
                fill={`url(#grad-${b.replace(/[^a-zA-Z]/g, "")})`}
                fillOpacity={highlighted ? (highlighted === b ? 1 : 0.1) : 1}
                strokeWidth={highlighted === b ? 2.5 : 1}
                strokeOpacity={highlighted ? (highlighted === b ? 1 : 0.2) : 0.8}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Genre bucket reference */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Genre Bucket Reference</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
          Genre tags come from Spotify's artist metadata. Each artist's genres are mapped to these broad buckets.
          Artists tagged across multiple buckets are split proportionally by listening time.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {buckets.map(b => (
            <div
              key={b}
              onClick={() => setHighlighted(prev => prev === b ? null : b)}
              style={{
                padding: "10px 14px",
                border: `1px solid ${highlighted === b ? GENRE_COLORS[b] : "#222"}`,
                borderLeft: `3px solid ${GENRE_COLORS[b] || "#555"}`,
                borderRadius: 8,
                cursor: "pointer",
                background: highlighted === b ? (GENRE_COLORS[b] + "11") : "transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: GENRE_COLORS[b] || "#888", marginBottom: 4 }}>{b}</div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{GENRE_DEFINITIONS[b]}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#444", marginTop: 20 }}>
        Genre classification uses Spotify artist tags only — no audio features. Source: artists table in spotify.db.
      </p>
    </div>
  );
}
