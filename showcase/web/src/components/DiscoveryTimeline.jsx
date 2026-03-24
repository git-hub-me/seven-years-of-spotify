import React, { useState } from "react";

export default function DiscoveryTimeline({ data }) {
  const [selectedYear, setSelectedYear] = useState(null);

  if (!data?.by_year) return null;
  const { by_year, artists } = data;

  const years = Object.keys(by_year).sort();
  const totalArtists = artists.length;

  // Cumulative discovery count per year
  let cumulative = 0;
  const yearStats = years.map(y => {
    const count = by_year[y].length;
    cumulative += count;
    return { year: y, new: count, cumulative };
  });

  const selected = selectedYear ? by_year[selectedYear] : null;

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 16</div>
      <h2 className="section-title">Discovery Timeline</h2>
      <p className="section-sub">
        <b style={{ color: "var(--accent2)" }}>{totalArtists.toLocaleString()}</b> artists discovered across 7 years.
        2019 was the big bang — your first year on the platform and the most exploratory.
        Click a year to see who you found.
      </p>

      {/* Year bars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 40 }}>
        {yearStats.map(({ year, new: n }) => {
          const isSelected = selectedYear === year;
          const maxNew = Math.max(...yearStats.map(y => y.new));
          return (
            <div
              key={year}
              onClick={() => setSelectedYear(prev => prev === year ? null : year)}
              style={{ cursor: "pointer", textAlign: "center" }}
            >
              <div style={{
                height: 80,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                marginBottom: 6,
              }}>
                <div style={{
                  width: "60%",
                  height: `${(n / maxNew) * 100}%`,
                  background: isSelected ? "var(--accent2)" : "var(--green)",
                  borderRadius: "3px 3px 0 0",
                  opacity: selectedYear && !isSelected ? 0.3 : 0.85,
                  transition: "all 0.15s",
                  minHeight: 4,
                }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "var(--accent2)" : "var(--text)" }}>{n}</div>
              <div style={{ fontSize: 11, color: isSelected ? "var(--accent2)" : "#555" }}>{year}</div>
            </div>
          );
        })}
      </div>

      {/* Selected year detail */}
      {selected && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              Discovered in {selectedYear}
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13, marginLeft: 12 }}>
                {selected.length} new artists
              </span>
            </h3>
            <button onClick={() => setSelectedYear(null)}
              style={{ background: "transparent", border: "1px solid #333", color: "var(--muted)", borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
              Clear ×
            </button>
          </div>

          {/* Top 8 discoveries (by subsequent plays) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {selected.slice(0, 8).map((a, i) => (
              <div key={a.artist} className="card" style={{ borderLeft: `3px solid var(--accent2)` }}>
                <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>#{i + 1} · First heard {a.first_heard}</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.artist}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {a.full_plays} plays · {a.hours}h
                </div>
              </div>
            ))}
          </div>

          {/* Rest as compact list */}
          {selected.length > 8 && (
            <div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>+ {selected.length - 8} more artists discovered this year:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selected.slice(8).map(a => (
                  <span key={a.artist} style={{
                    fontSize: 12, color: "var(--muted)",
                    background: "#111", borderRadius: 4,
                    padding: "3px 8px",
                  }}>{a.artist}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All-time top discoveries (kept forever) */}
      {!selected && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Discoveries That Stuck</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Artists discovered during the 7 years who became part of the permanent rotation.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {artists
              .filter(a => a.full_plays >= 50)
              .sort((a, b) => b.full_plays - a.full_plays)
              .slice(0, 8)
              .map(a => (
                <div key={a.artist} className="card">
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                    Discovered {a.first_heard} · {a.year_discovered}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.artist}</div>
                  <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>
                    {a.full_plays} plays · {a.hours}h total
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
