import React, { useState } from "react";

const YEAR_NOTES = {
  "2019": "The beginning. Beatles and classic rock, wall to wall. 122 hours.",
  "2020": "The pandemic year. Slower, a lot more time at home. 116 hours.",
  "2021": "Peak listening. 154 hours. Came back to Mumbai in October.",
  "2022": "Moved to Bangalore in February, new job and back to Mumbai by June. Hip-hop started taking over. 147 hours.",
  "2023": "New job and got engaged in November. Listening dropped to 78 hours but the picks were good.",
  "2024": "Got married in June. Bali in November. Only 25 hours on Spotify, life was louder.",
  "2025": "Indian indie came back. 75 hours and still going.",
  "2026": "Still going. 52 hours and not done yet.",
};

const LIFE_EVENTS = {
  "2021": [{ label: "Back to Mumbai", icon: "🏠", month: "Oct" }],
  "2022": [
    { label: "Moved to Bangalore", icon: "✈️", month: "Feb" },
    { label: "New job · Back to Mumbai", icon: "💼", month: "Jun" },
  ],
  "2023": [
    { label: "New job", icon: "💼", month: "Nov" },
    { label: "Got engaged", icon: "💍", month: "Nov" },
  ],
  "2024": [
    { label: "Got married", icon: "🥂", month: "Jun" },
    { label: "Bali trip", icon: "🌴", month: "Nov" },
  ],
};

export default function YearTimeline({ byYear }) {
  const [selectedYear, setSelectedYear] = useState("2021");
  const [hoveredYear, setHoveredYear] = useState(null);

  if (!byYear) return null;

  const years = Object.keys(byYear).sort();
  const maxHours = Math.max(...Object.values(byYear).map(y => y.hours));

  const year = byYear[selectedYear];

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 5</div>
      <h2 className="section-title">Year by Year</h2>
      <p className="section-sub">
        Each year has its own character. Click to explore what defined each chapter.
      </p>

      {/* Year selector — horizontal bars */}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100, marginBottom: 8 }}>
        {years.map(y => {
          const h = byYear[y].hours;
          const pct = h / maxHours;
          const isSelected = y === selectedYear;
          const hasEvents = !!LIFE_EVENTS[y];
          return (
            <div
              key={y}
              onClick={() => setSelectedYear(y)}
              onMouseEnter={() => setHoveredYear(y)}
              onMouseLeave={() => setHoveredYear(null)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 4 }}
            >
              <div style={{
                fontSize: 10,
                color: isSelected ? "var(--green)" : "var(--muted)",
                fontWeight: isSelected ? 700 : 400,
              }}>{Math.round(h)}h</div>
              <div style={{ position: "relative", width: "100%", height: Math.max(6, pct * 70) }}>
                <div style={{
                  width: "100%",
                  height: "100%",
                  background: isSelected ? "var(--green)" : hoveredYear === y ? "#3a3a3a" : "#2a2a2a",
                  borderRadius: "3px 3px 0 0",
                  border: isSelected ? "1px solid var(--green)" : hasEvents ? "1px solid #555" : "1px solid transparent",
                  transition: "all 0.2s",
                }} />
                {hasEvents && (
                  <div style={{
                    position: "absolute", top: -6, right: -2,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#e8a838",
                    boxShadow: "0 0 4px #e8a83888",
                  }} />
                )}
              </div>
              <div style={{
                fontSize: 12,
                color: isSelected ? "var(--green)" : hoveredYear === y ? "var(--muted)" : "#555",
                fontWeight: isSelected ? 700 : 400,
                transition: "color 0.2s",
              }}>{y}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#444", marginBottom: 24 }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e8a838", marginRight: 6 }} />
        years with life events
      </div>

      {/* Year detail panel */}
      {year && (
        <div className="card" style={{ marginTop: 32, borderColor: "#333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>{selectedYear}</div>
              <div style={{ fontSize: 16, color: "var(--muted)", marginTop: 8, maxWidth: 500 }}>
                {YEAR_NOTES[selectedYear]}
              </div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {[
                { label: "Streams", value: year.streams.toLocaleString() },
                { label: "Hours", value: `${year.hours}h` },
                { label: "Skip Rate", value: `${year.skip_rate_pct}%` },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Life events for this year */}
          {LIFE_EVENTS[selectedYear] && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {LIFE_EVENTS[selectedYear].map((ev, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#e8a83814", border: "1px solid #e8a83844",
                  borderRadius: 20, padding: "4px 12px", fontSize: 12,
                  color: "#e8a838",
                }}>
                  <span>{ev.icon}</span>
                  <span>{ev.month} · {ev.label}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 32 }}>
            {/* Top artists */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Top Artists
              </div>
              {year.top_artists.slice(0, 7).map((a, i) => (
                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 20, fontSize: 11, color: "#444", textAlign: "right" }}>#{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13 }}>{a.name}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.plays}</span>
                    </div>
                    <div style={{ height: 2, background: "#1a1a1a", borderRadius: 1 }}>
                      <div style={{
                        height: "100%",
                        width: `${(a.plays / year.top_artists[0].plays) * 100}%`,
                        background: i === 0 ? "var(--green)" : "#444",
                        borderRadius: 1,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top tracks */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Top Tracks
              </div>
              {year.top_tracks.slice(0, 7).map((t, i) => (
                <div key={`${t.track}-${t.artist}`} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: "#444", marginRight: 6 }}>#{i + 1}</span>{t.track}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{t.plays}×</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginLeft: 20 }}>{t.artist}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Genre breakdown for the year */}
          {Object.keys(year.genre_pct || {}).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Genre Mix
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                {Object.entries(year.genre_pct)
                  .filter(([, v]) => v > 2)
                  .sort((a, b) => b[1] - a[1])
                  .map(([genre, pct]) => (
                    <div
                      key={genre}
                      title={`${genre}: ${pct}%`}
                      style={{
                        flex: pct,
                        background: {
                          "Indian Indie/Folk": "#E8A838",
                          "Hip-Hop": "#E84855",
                          "Classic Rock": "#5865F2",
                          "Alternative/Indie Rock": "#9B59B6",
                          "Folk/Acoustic": "#FDCB6E",
                          "Pop": "#38B2E8",
                          "Electronic": "#00CEC9",
                          "Jazz/Blues": "#6C5CE7",
                          "Punjabi/Bhangra": "#1DB954",
                          "Other": "#333",
                        }[genre] || "#444",
                      }}
                    />
                  ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                {Object.entries(year.genre_pct)
                  .filter(([, v]) => v > 5)
                  .sort((a, b) => b[1] - a[1])
                  .map(([genre, pct]) => (
                    <span key={genre} style={{ fontSize: 11, color: "var(--muted)" }}>
                      {genre}: <b style={{ color: "var(--text)" }}>{pct}%</b>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
