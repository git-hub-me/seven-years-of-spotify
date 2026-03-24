import React, { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const ARCHETYPES = {
  anchor: {
    color: "#1DB954",
    label: "Anchor",
    icon: "⚓",
    definition: "Long relationship, plays spread evenly over years. The artists that never left.",
  },
  obsession: {
    color: "#E84855",
    label: "Obsession",
    icon: "🔥",
    definition: "65%+ of plays crammed into 3 months. You went deep, fast — then moved on.",
  },
  background: {
    color: "#5865F2",
    label: "Background",
    icon: "🎧",
    definition: "Always present but low engagement. Comfortable filler you never committed to.",
  },
  experiment: {
    color: "#E8A838",
    label: "Experiment",
    icon: "🧪",
    definition: "Short-lived or low plays. Tried, didn't stick — or still finding their footing.",
  },
};

const ARCHETYPE_ORDER = ["anchor", "obsession", "background", "experiment"];

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const a = ARCHETYPES[d.archetype];
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12, maxWidth: 220 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 4 }}>{d.artist}</div>
      <div style={{ color: a.color, fontSize: 11, marginBottom: 6 }}>{a.icon} {a.label}</div>
      <div style={{ color: "#aaa" }}>Plays: <b style={{ color: "#f0f0f0" }}>{d.full_plays}</b></div>
      <div style={{ color: "#aaa" }}>Longevity: <b style={{ color: "#f0f0f0" }}>{d.longevity_months} months</b></div>
      <div style={{ color: "#aaa" }}>Peak: <b style={{ color: "#f0f0f0" }}>{d.peak_month} ({d.peak_plays} plays)</b></div>
      <div style={{ color: "#aaa" }}>Burst score: <b style={{ color: "#f0f0f0" }}>{Math.round(d.concentration * 100)}%</b></div>
    </div>
  );
}

function ArtistRow({ artist, i, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #111" }}>
      <span style={{ fontSize: 11, color: "#444", width: 20, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist.artist}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{artist.genre} · {artist.first} → {artist.last}</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexShrink: 0, fontSize: 11 }}>
        <span style={{ color: color, fontWeight: 700 }}>{artist.full_plays} plays</span>
        <span style={{ color: "var(--muted)" }}>{artist.longevity_months}mo</span>
        {artist.archetype === "obsession" && (
          <span style={{ color: "#E84855" }}>peak {artist.peak_month}</span>
        )}
      </div>
    </div>
  );
}

const LIST_CAP = 8;

export default function ArtistLifecycle({ data }) {
  const [activeArchetype, setActiveArchetype] = useState(null);
  const [showAllAnchors, setShowAllAnchors] = useState(false);
  const [showAllObsessions, setShowAllObsessions] = useState(false);

  if (!data?.artists) return null;

  const { archetype_counts, anchors, obsessions, background, timeline } = data;

  // Scatter data — significant artists only
  const scatterData = data.artists.filter(a => a.full_plays >= 10);

  const filtered = activeArchetype
    ? scatterData.filter(a => a.archetype === activeArchetype)
    : scatterData;

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 8</div>
      <h2 className="section-title">Artist Lifecycle</h2>
      <p className="section-sub">
        Every artist has an arc: discovery, peak, fade, or staying power.
        Plotted by how long they've been in rotation vs how concentrated the listening was.
      </p>

      {/* Archetype hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {ARCHETYPE_ORDER.map(key => {
          const a = ARCHETYPES[key];
          const count = archetype_counts[key] || 0;
          const isActive = activeArchetype === key;
          return (
            <button
              key={key}
              type="button"
              className="card"
              onClick={() => setActiveArchetype(prev => prev === key ? null : key)}
              style={{
                borderTop: `2px solid ${a.color}`,
                cursor: "pointer",
                opacity: activeArchetype && !isActive ? 0.4 : 1,
                transition: "opacity 0.15s",
                font: "inherit",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 11, color: a.color, fontWeight: 700, marginBottom: 4 }}>{a.icon} {a.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>{count}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{a.definition}</div>
            </button>
          );
        })}
      </div>

      {/* Scatter: longevity vs plays */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Longevity vs Plays</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          x = months between first and last play · y = full plays · colour = archetype. Click a card above to isolate.
        </p>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                type="number" dataKey="longevity_months" name="Longevity"
                stroke="#333" tick={{ fill: "#666", fontSize: 11 }}
                label={{ value: "months active", fill: "#555", fontSize: 10, position: "insideBottomRight", offset: -4 }}
              />
              <YAxis
                type="number" dataKey="full_plays" name="Plays"
                stroke="#333" tick={{ fill: "#666", fontSize: 11 }}
              />
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={filtered} isAnimationActive={false}>
                {filtered.map((d, i) => (
                  <Cell
                    key={i}
                    fill={ARCHETYPES[d.archetype]?.color || "#555"}
                    fillOpacity={0.75}
                    r={Math.min(3 + d.full_plays / 40, 9)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anchors + Obsessions side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: ARCHETYPES.anchor.color }}>⚓ Anchors</span>
          </h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Steady across all 7 years. These artists never disappeared from your rotation.
          </p>
          <div className="card" style={{ padding: "4px 16px" }}>
            {(showAllAnchors ? anchors : anchors.slice(0, LIST_CAP)).map((a, i) => (
              <ArtistRow key={a.artist} artist={a} i={i} color={ARCHETYPES.anchor.color} />
            ))}
          </div>
          {anchors.length > LIST_CAP && (
            <button onClick={() => setShowAllAnchors(p => !p)} style={{
              marginTop: 8, background: "transparent", border: "1px solid var(--border)",
              color: "var(--muted)", borderRadius: 8, padding: "6px 16px",
              fontSize: 12, cursor: "pointer", width: "100%",
            }}>
              {showAllAnchors ? "▲ Show less" : `▼ +${anchors.length - LIST_CAP} more`}
            </button>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: ARCHETYPES.obsession.color }}>🔥 Obsessions</span>
          </h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Short, intense bursts. 65%+ of plays crammed into 3 months — the rabbit holes you fell into.
          </p>
          <div className="card" style={{ padding: "4px 16px" }}>
            {(showAllObsessions ? obsessions : obsessions.slice(0, LIST_CAP)).map((a, i) => (
              <ArtistRow key={a.artist} artist={a} i={i} color={ARCHETYPES.obsession.color} />
            ))}
          </div>
          {obsessions.length > LIST_CAP && (
            <button onClick={() => setShowAllObsessions(p => !p)} style={{
              marginTop: 8, background: "transparent", border: "1px solid var(--border)",
              color: "var(--muted)", borderRadius: 8, padding: "6px 16px",
              fontSize: 12, cursor: "pointer", width: "100%",
            }}>
              {showAllObsessions ? "▲ Show less" : `▼ +${obsessions.length - LIST_CAP} more`}
            </button>
          )}
        </div>
      </div>

      {/* Timeline gantt */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Artist Timelines</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
          When each artist entered and exited your rotation. Bar thickness = play count. Dot = peak month.
        </p>

        {/* Archetype legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {ARCHETYPE_ORDER.map(key => {
            const a = ARCHETYPES[key];
            const count = timeline.filter(t => t.archetype === key).length;
            if (!count) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 28, height: 4, borderRadius: 2, background: a.color, display: "inline-block" }} />
                <span style={{ color: "#aaa" }}>{a.icon} {a.label}</span>
                <span style={{ color: "#444" }}>({count})</span>
              </div>
            );
          })}
          <span style={{ color: "#333", fontSize: 12, marginLeft: 8 }}>·</span>
          <span style={{ color: "#444", fontSize: 11 }}>◆ peak month</span>
        </div>

        {(() => {
          const totalMonths = (2026 - 2019) * 12 + 4;
          const maxPlays = Math.max(...timeline.map(a => a.full_plays));

          const toOffset = (ym) => {
            const [y, m] = ym.split("-").map(Number);
            return ((y - 2019) * 12 + (m - 1)) / totalMonths * 100;
          };
          const toWidth = (first, last) => {
            const [y1, m1] = first.split("-").map(Number);
            const [y2, m2] = last.split("-").map(Number);
            return Math.max(1, (((y2 - y1) * 12 + (m2 - m1)) / totalMonths) * 100);
          };
          const barHeight = (plays) => Math.round(6 + (plays / maxPlays) * 14);

          return (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 560 }}>
              {/* Year markers */}
              <div style={{ display: "flex", marginBottom: 6, marginLeft: 130 }}>
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                  <div key={y} style={{ flex: 1, fontSize: 10, color: "#333", borderLeft: "1px solid #1a1a1a", paddingLeft: 3 }}>{y}</div>
                ))}
              </div>

              {timeline.map((a) => {
                const color = ARCHETYPES[a.archetype]?.color || "#555";
                const left = toOffset(a.first);
                const width = toWidth(a.first, a.last);
                const bh = barHeight(a.full_plays);
                const peakLeft = toOffset(a.peak_month);

                return (
                  <div key={a.artist} style={{ display: "flex", alignItems: "center", marginBottom: 4, minHeight: bh + 4 }}>
                    {/* Artist name */}
                    <div style={{
                      width: 126, flexShrink: 0,
                      fontSize: 11,
                      color: ARCHETYPES[a.archetype]?.color || "#aaa",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      textAlign: "right", paddingRight: 10,
                      fontWeight: a.full_plays > 100 ? 700 : 400,
                    }}>
                      {a.artist}
                    </div>

                    {/* Track */}
                    <div style={{ flex: 1, height: bh, background: "#111", borderRadius: 3, position: "relative" }}>
                      {/* Active span bar */}
                      <div style={{
                        position: "absolute",
                        left: `${left}%`,
                        width: `${width}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 3,
                        opacity: 0.7,
                        minWidth: 4,
                      }} />
                      {/* Peak marker */}
                      <div style={{
                        position: "absolute",
                        left: `${peakLeft}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: Math.max(6, bh * 0.6),
                        height: Math.max(6, bh * 0.6),
                        borderRadius: "50%",
                        background: color,
                        border: "2px solid #0a0a0a",
                        zIndex: 1,
                      }} />
                      {/* Play count label on wider bars */}
                      {width > 12 && (
                        <div style={{
                          position: "absolute",
                          left: `calc(${left}% + 6px)`,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 9,
                          color: "#0a0a0a",
                          fontWeight: 700,
                          pointerEvents: "none",
                          opacity: 0.8,
                        }}>{a.full_plays}</div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom year grid lines */}
              <div style={{ display: "flex", marginTop: 6, marginLeft: 130 }}>
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                  <div key={y} style={{ flex: 1, fontSize: 10, color: "#333", borderLeft: "1px solid #1a1a1a", paddingLeft: 3 }}>{y}</div>
                ))}
              </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
