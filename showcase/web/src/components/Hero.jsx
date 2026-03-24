import React from "react";
import { GENRE_COLORS } from "../constants/colors.js";

export default function Hero({ overview, genreEvolution }) {
  if (!overview) return null;

  // Compute dominant genre across all years
  const allGenreTotals = {};
  if (genreEvolution?.series) {
    for (const pt of genreEvolution.series) {
      for (const [k, v] of Object.entries(pt)) {
        if (k === "year") continue;
        allGenreTotals[k] = (allGenreTotals[k] || 0) + v;
      }
    }
  }
  const topGenres = Object.entries(allGenreTotals)
    .filter(([k]) => k !== "Other")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section" style={{ paddingBottom: 60 }}>
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">A Data Portrait</div>
          <h1 style={{
            fontSize: "clamp(52px, 10vw, 100px)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-2px",
            marginBottom: 16,
          }}>
            Seven Years<span style={{ color: "var(--green)" }}> of Spotify</span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: "var(--muted)", maxWidth: 600 }}>
            {overview.years_active} years of listening. {overview.total_streams.toLocaleString()} streams.
            An honest look at what the numbers actually say about who I am as a listener.
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
            {overview.first_stream.slice(0, 7)} — {overview.last_stream.slice(0, 7)} · Built with Spotify Extended History
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{overview.total_streams.toLocaleString()}</div>
            <div className="stat-label">Total Streams</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(overview.total_hours).toLocaleString()}h</div>
            <div className="stat-label">Listening Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.unique_artists.toLocaleString()}</div>
            <div className="stat-label">Unique Artists</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.unique_tracks.toLocaleString()}</div>
            <div className="stat-label">Unique Tracks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent3)" }}>
              {overview.skip_rate_pct}%
            </div>
            <div className="stat-label">Raw Skip Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent2)" }}>
              {overview.peak_year.year}
            </div>
            <div className="stat-label">Peak Year ({overview.peak_year.hours}h)</div>
          </div>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Top identity:</span>
          {topGenres.map(g => (
            <span key={g} style={{
              background: GENRE_COLORS[g] + "22",
              border: `1px solid ${GENRE_COLORS[g]}44`,
              color: GENRE_COLORS[g],
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 13,
              fontWeight: 600,
            }}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
