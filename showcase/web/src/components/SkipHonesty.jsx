import React, { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";

// Category definitions — shown in the legend/tooltip
export const CATEGORIES = {
  obsession: {
    color: "#1DB954",
    label: "Obsession",
    definition: "200+ full plays, <42% skip rate. These aren't just favourites — they're part of who you are.",
  },
  true_love: {
    color: "#38B2E8",
    label: "True Love",
    definition: "50+ full plays, <38% skip rate. Consistent, deliberate listening over years.",
  },
  reliable: {
    color: "#9B59B6",
    label: "Reliable",
    definition: "20+ full plays, low-moderate skip. You trust them — they usually deliver.",
  },
  complicated: {
    color: "#E8A838",
    label: "Complicated",
    definition: "20+ full plays but 38–60% skip rate. You keep them in rotation despite mixed feelings.",
  },
  aspirational: {
    color: "#E84855",
    label: "Aspirational",
    definition: "20+ full plays, 60%+ skip rate. You keep adding them to the queue hoping it'll click.",
  },
  casual: {
    color: "#444",
    label: "Casual",
    definition: "Under 20 full plays. Passing encounters — neither committed nor rejected.",
  },
};

const SPOTLIGHT_ARTISTS = [
  "The Beatles", "Anuv Jain", "The Local Train", "MF DOOM",
  "Red Hot Chili Peppers", "Radiohead", "Taylor Swift", "Kendrick Lamar",
  "Eminem", "Pink Floyd", "Nirvana", "Prateek Kuhad", "Maroon 5",
  "JAY-Z", "Queen", "The Rolling Stones",
];

function DefinitionTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <span
        style={{
          cursor: "help", color: "var(--muted)", fontSize: 12,
          border: "1px solid #333", borderRadius: "50%",
          width: 16, height: 16, display: "inline-flex",
          alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >?</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "120%", left: "50%",
          transform: "translateX(-50%)", zIndex: 10,
          background: "#1a1a1a", border: "1px solid #333",
          borderRadius: 8, padding: "8px 12px", width: 220,
          fontSize: 12, color: "#ccc", lineHeight: 1.5,
        }}>{text}</div>
      )}
    </span>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cat = CATEGORIES[d.category];
  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #333",
      borderRadius: 8, padding: "12px 16px", fontSize: 12, maxWidth: 220,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#f0f0f0", fontSize: 13 }}>{d.artist}</div>
      <div style={{ color: "#aaa" }}>Full plays: <b style={{ color: "#f0f0f0" }}>{d.full_plays}</b></div>
      <div style={{ color: "#aaa" }}>Skip rate: <b style={{ color: "#f0f0f0" }}>{Math.round(d.skip_pct)}%</b></div>
      <div style={{ color: "#aaa" }}>Hours: <b style={{ color: "#f0f0f0" }}>{d.hours}h</b></div>
      <div style={{ marginTop: 8, borderTop: "1px solid #2a2a2a", paddingTop: 8 }}>
        <span style={{ color: cat?.color, fontWeight: 700, fontSize: 11 }}>{cat?.label}</span>
        <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{cat?.definition}</div>
      </div>
    </div>
  );
};

export default function SkipHonesty({ data }) {
  const [activeCategory, setActiveCategory] = useState("all");

  if (!data?.length) return null;

  const catOrder = ["obsession", "true_love", "reliable", "complicated", "aspirational", "casual"];

  const filtered = activeCategory === "all"
    ? data.filter(d => d.total_plays >= 10)
    : data.filter(d => d.category === activeCategory);

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 2</div>
      <h2 className="section-title">The Honest Chart</h2>
      <p className="section-sub">
        Spotify Wrapped shows play count. Skip rate tells the truth.
        Every dot is an artist — plotted by full listens vs how often you bailed.
        The bottom-right is where your real taste lives.
      </p>

      {/* Metric definitions */}
      <div className="card" style={{ marginBottom: 32, fontSize: 13, lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>How to read this</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
          <div><b style={{ color: "var(--text)" }}>Full plays</b> <span style={{ color: "var(--muted)" }}>— streams where you listened &gt;30 seconds (X axis)</span></div>
          <div><b style={{ color: "var(--text)" }}>Skip rate</b> <span style={{ color: "var(--muted)" }}>— % of all plays that ended before 30s (Y axis)</span></div>
          <div><b style={{ color: "var(--green)" }}>Bottom-right</b> <span style={{ color: "var(--muted)" }}>— many full plays, low skip = genuine love</span></div>
          <div><b style={{ color: "var(--accent3)" }}>Top area</b> <span style={{ color: "var(--muted)" }}>— keep adding to queue despite skipping = aspirational</span></div>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveCategory("all")}
          style={{
            background: activeCategory === "all" ? "#ffffff22" : "transparent",
            border: `1px solid ${activeCategory === "all" ? "#888" : "#333"}`,
            color: activeCategory === "all" ? "#f0f0f0" : "#555",
            borderRadius: 20, padding: "6px 16px", fontSize: 13,
            cursor: "pointer", fontWeight: activeCategory === "all" ? 600 : 400,
          }}
        >All artists</button>
        {catOrder.map(key => {
          const cat = CATEGORIES[key];
          const count = data.filter(d => d.category === key).length;
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              title={cat.definition}
              style={{
                background: isActive ? cat.color + "22" : "transparent",
                border: `1px solid ${isActive ? cat.color : "#333"}`,
                color: isActive ? cat.color : "#555",
                borderRadius: 20, padding: "6px 16px", fontSize: 13,
                cursor: "pointer", fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {cat.label} <span style={{ opacity: 0.6, fontSize: 11 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Active category definition */}
      {activeCategory !== "all" && (
        <div style={{
          background: CATEGORIES[activeCategory].color + "11",
          border: `1px solid ${CATEGORIES[activeCategory].color}33`,
          borderRadius: 8, padding: "10px 16px",
          fontSize: 13, color: "#ccc", marginBottom: 24,
        }}>
          <b style={{ color: CATEGORIES[activeCategory].color }}>{CATEGORIES[activeCategory].label}:</b>{" "}
          {CATEGORIES[activeCategory].definition}
        </div>
      )}

      <div className="chart-wrap" style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis
              dataKey="full_plays"
              type="number"
              name="Full Plays"
              stroke="#333"
              tick={{ fill: "#666", fontSize: 11 }}
              label={{ value: "Full Plays (>30s) →", fill: "#555", fontSize: 11, position: "insideBottom", offset: -20 }}
            />
            <YAxis
              dataKey="skip_pct"
              type="number"
              name="Skip %"
              stroke="#333"
              tick={{ fill: "#666", fontSize: 11 }}
              domain={[0, 100]}
              label={{ value: "Skip Rate %", fill: "#555", fontSize: 11, angle: -90, position: "insideLeft", offset: 10 }}
            />
            <ReferenceLine y={38} stroke="#1DB954" strokeDasharray="4 4" strokeOpacity={0.3}
              label={{ value: "true love threshold", fill: "#1DB95466", fontSize: 10, position: "insideTopRight" }} />
            <ReferenceLine y={60} stroke="#E84855" strokeDasharray="4 4" strokeOpacity={0.3}
              label={{ value: "aspirational threshold", fill: "#E8485566", fontSize: 10, position: "insideTopRight" }} />
            <Tooltip content={<CustomTooltip />} />
            {catOrder.map(cat => (
              <Scatter
                key={cat}
                name={CATEGORIES[cat].label}
                data={filtered.filter(d => d.category === cat)}
                fill={CATEGORIES[cat].color}
                fillOpacity={activeCategory === "all" ? (cat === "casual" ? 0.3 : 0.75) : 0.85}
                r={cat === "obsession" ? 7 : cat === "true_love" ? 5 : 4}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Spotlight table */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Artist Spotlight</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
          Notable artists and their honesty score. Sorted by full plays.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Artist", "Full Plays", "Skip Rate", "Hours", "Verdict"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data
                .filter(d => SPOTLIGHT_ARTISTS.includes(d.artist))
                .sort((a, b) => b.full_plays - a.full_plays)
                .map(d => {
                  const cat = CATEGORIES[d.category];
                  return (
                    <tr key={d.artist} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.artist}</td>
                      <td style={{ padding: "10px 12px", color: "var(--green)", fontWeight: 700 }}>{d.full_plays}</td>
                      <td style={{
                        padding: "10px 12px",
                        color: d.skip_pct >= 60 ? "var(--accent3)" : d.skip_pct < 38 ? "var(--green)" : "var(--accent2)",
                        fontWeight: 600,
                      }}>{Math.round(d.skip_pct)}%</td>
                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{d.hours}h</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          background: cat?.color + "22",
                          color: cat?.color,
                          border: `1px solid ${cat?.color}44`,
                          borderRadius: 12,
                          padding: "3px 10px",
                          fontSize: 11, fontWeight: 700,
                        }} title={cat?.definition}>
                          {cat?.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
