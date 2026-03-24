import React, { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import { GENRE_COLORS } from "../constants/colors.js";

function QTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12, maxWidth: 220 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>{d.artist}</div>
      <div style={{ color: "#aaa" }}>Quality: <b style={{ color: "var(--green)" }}>{d.quality_score_pct}</b></div>
      <div style={{ color: "#aaa" }}>Skip rate: <b style={{ color: "#f0f0f0" }}>{d.skip_pct}%</b></div>
      <div style={{ color: "#aaa" }}>Completion: <b style={{ color: "#f0f0f0" }}>{d.avg_completion}%</b></div>
      <div style={{ color: "#aaa" }}>Unique tracks: <b style={{ color: "#f0f0f0" }}>{d.unique_tracks}</b></div>
      <div style={{ color: "#aaa" }}>Longevity: <b style={{ color: "#f0f0f0" }}>{d.longevity_months} months</b></div>
    </div>
  );
}

export default function ArtistQuality({ data }) {
  const [highlightGenre, setHighlightGenre] = useState(null);

  if (!data?.artists) return null;
  const { artists, top20 } = data;

  const genres = [...new Set(artists.map(a => a.genre))].filter(Boolean);
  const scatterData = artists.filter(a => a.full_plays >= 15);

  const maxPlays = Math.max(...scatterData.map(a => a.full_plays));

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 10</div>
      <h2 className="section-title">Artist Quality Score</h2>
      <p className="section-sub">
        Raw plays reward repetition, not actual taste. Quality here = skip rate × completion × catalog depth × loyalty.
        Who do you actually listen to <em>well</em>?
      </p>

      {/* Scatter: completion vs skip rate, sized by plays */}
      <div style={{ marginBottom: 48 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Completion vs Skip Rate</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
            Top-left = high skip, low completion (you don't really like them). Bottom-right = low skip, high completion — the real favourites.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
            {genres.slice(0, 6).map(g => (
              <button key={g} onClick={() => setHighlightGenre(prev => prev === g ? null : g)}
                style={{
                  background: highlightGenre === g ? (GENRE_COLORS[g] || "#555") + "22" : "transparent",
                  border: `1px solid ${highlightGenre === g ? (GENRE_COLORS[g] || "#555") : "#2a2a2a"}`,
                  color: highlightGenre === g ? (GENRE_COLORS[g] || "#555") : "#555",
                  borderRadius: 12, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                }}>{g}</button>
            ))}
          </div>
          {highlightGenre && (
            <p style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
              {scatterData.filter(d => d.genre === highlightGenre).length} artists shown
            </p>
          )}
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis type="number" dataKey="skip_pct" name="Skip Rate" domain={[0, 80]}
                  stroke="#333" tick={{ fill: "#666", fontSize: 10 }}
                  label={{ value: "skip rate %", fill: "#555", fontSize: 10, position: "insideBottom", offset: -10 }} />
                <YAxis type="number" dataKey="avg_completion" name="Completion" domain={[0, 100]}
                  stroke="#333" tick={{ fill: "#666", fontSize: 10 }}
                  label={{ value: "completion %", fill: "#555", fontSize: 10, angle: -90, position: "insideLeft" }} />
                <Tooltip content={<QTooltip />} />
                <Scatter data={scatterData} isAnimationActive={false}>
                  {scatterData.map((d, i) => {
                    const color = GENRE_COLORS[d.genre] || "#555";
                    const dimmed = highlightGenre && d.genre !== highlightGenre;
                    return (
                      <Cell key={i} fill={color} fillOpacity={dimmed ? 0.1 : 0.7}
                        r={Math.min(3 + d.full_plays / maxPlays * 10, 10)} />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        </div>

      {/* Top 20 quality table — full width below scatter */}
      <div style={{ marginBottom: 48, borderTop: "1px solid var(--border)", paddingTop: 40 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Top 20 by Quality</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px 6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Artist</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Score</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Skip</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Compl.</th>
                  <th style={{ textAlign: "right", padding: "6px 0 6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Unique Tracks</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((a, i) => {
                  const color = GENRE_COLORS[a.genre] || "#555";
                  return (
                    <tr key={a.artist} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "8px 8px 8px 0", color: "#444", fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.artist}</div>
                        <div style={{ fontSize: 10, color: color }}>{a.genre}</div>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <div style={{ width: 60, height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${a.quality_score_pct}%`, background: "var(--green)", borderRadius: 2 }} />
                          </div>
                          <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 12 }}>{a.quality_score_pct}</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", color: a.skip_pct < 35 ? "var(--green)" : a.skip_pct > 55 ? "var(--accent3)" : "var(--accent2)", fontWeight: 600 }}>
                        {a.skip_pct}%
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", color: "var(--muted)" }}>{a.avg_completion}%</td>
                      <td style={{ padding: "8px 0 8px 8px", textAlign: "right", color: "var(--muted)" }}>{a.unique_tracks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
