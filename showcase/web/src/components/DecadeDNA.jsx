import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import { GENRE_COLORS } from "../constants/colors.js";

const DECADE_COLORS = {
  1960: "#9B59B6",
  1970: "#5865F2",
  1980: "#E84855",
  1990: "#E8A838",
  2000: "#00CEC9",
  2010: "#1DB954",
  2020: "#f0f0f0",
};

function DecadeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 4 }}>{label}s</div>
      <div style={{ color: "#aaa" }}>Plays: <b style={{ color: "#f0f0f0" }}>{payload[0]?.value?.toLocaleString()}</b></div>
      <div style={{ color: "#aaa" }}>Share: <b style={{ color: "var(--green)" }}>{payload[1]?.value}%</b></div>
    </div>
  );
}

function YearTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#aaa" }}>{label}: <b style={{ color: "#f0f0f0" }}>{payload[0]?.value} plays</b></div>
    </div>
  );
}

export default function DecadeDNA({ data }) {
  const [selectedDecade, setSelectedDecade] = useState(null);

  if (!data?.decades) return null;

  const { decades, year_dist, median_release_year } = data;

  const selected = selectedDecade != null
    ? decades.find(d => d.decade === selectedDecade)
    : null;

  const barData = decades.map(d => ({
    label: `${d.decade}s`,
    decade: d.decade,
    plays: d.plays,
    pct: d.pct,
  }));

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 9</div>
      <h2 className="section-title">Decade DNA</h2>
      <p className="section-sub">
        What era actually dominates your ears? Your median release year is{" "}
        <b style={{ color: "var(--accent2)" }}>{median_release_year}</b> — you're listening
        to music that's on average {new Date().getFullYear() - median_release_year} years old.
      </p>

      {/* Hero: decade bar chart */}
      <div className="grid-2" style={{ marginBottom: 48 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Plays by Decade</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Click a bar to see what defines that era for you.
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="label" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip content={<DecadeTooltip />} />
                <Bar dataKey="plays" radius={[4, 4, 0, 0]} cursor="pointer"
                  onClick={d => setSelectedDecade(prev => prev === d.decade ? null : d.decade)}>
                  {barData.map(d => (
                    <Cell
                      key={d.decade}
                      fill={DECADE_COLORS[d.decade] || "#555"}
                      opacity={selectedDecade && selectedDecade !== d.decade ? 0.3 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Year-by-year fine chart */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Year by Year</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
            Individual release years — the peaks reveal your real taste anchors.
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={year_dist} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent2)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 10 }}
                  tickCount={8}
                />
                <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip content={<YearTooltip />} />
                <Area
                  type="monotone" dataKey="plays"
                  stroke="var(--accent2)" strokeWidth={1.5}
                  fill="url(#yearGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Decade detail panel */}
      {selected ? (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: DECADE_COLORS[selected.decade] }}>{selected.label}</span>
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13, marginLeft: 12 }}>
                {selected.pct}% of plays
              </span>
            </h3>
            <button
              onClick={() => setSelectedDecade(null)}
              style={{ background: "transparent", border: "1px solid #333", color: "var(--muted)", borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}
            >Clear ×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {/* Top artists */}
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12 }}>Top Artists</div>
              {selected.top_artists.map((a, i) => (
                <div key={a.artist} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
                  <span style={{ color: i === 0 ? DECADE_COLORS[selected.decade] : "var(--text)" }}>
                    #{i + 1} {a.artist}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{a.plays}</span>
                </div>
              ))}
            </div>
            {/* Top tracks */}
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12 }}>Most Played Tracks</div>
              {selected.top_tracks.map((t, i) => (
                <div key={t.track} style={{ padding: "6px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.track}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>{t.artist} · {t.plays} plays</div>
                </div>
              ))}
            </div>
            {/* Genre breakdown */}
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12 }}>Genre Mix</div>
              {Object.entries(selected.genre_breakdown).map(([genre, plays]) => (
                <div key={genre} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
                  <span style={{ color: GENRE_COLORS[genre] || "#888" }}>{genre}</span>
                  <span style={{ color: "var(--muted)" }}>{plays} plays</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* All decades overview grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 48 }}>
          {decades.map(d => (
            <div
              key={d.decade}
              className="card"
              style={{
                borderLeft: `3px solid ${DECADE_COLORS[d.decade] || "#555"}`,
                cursor: "pointer",
              }}
              onClick={() => setSelectedDecade(d.decade)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: DECADE_COLORS[d.decade] || "#555" }}>{d.label}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{d.pct}%</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                {d.top_artists.slice(0, 3).map(a => a.artist).join(" · ")}
              </div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${d.pct * 3}%`, background: DECADE_COLORS[d.decade], borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
