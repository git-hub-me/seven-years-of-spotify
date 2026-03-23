import React, { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import GenreEvolution from "./components/GenreEvolution.jsx";
import SkipHonesty from "./components/SkipHonesty.jsx";
import TimeHeatmap from "./components/TimeHeatmap.jsx";
import SessionArchaeology from "./components/SessionArchaeology.jsx";
import YearTimeline from "./components/YearTimeline.jsx";
import DualIdentity from "./components/DualIdentity.jsx";
import Popularity from "./components/Popularity.jsx";

const DATA_FILES = [
  "overview", "genre_evolution", "skip_honesty",
  "time_heatmap", "sessions", "by_year", "dual_identity", "popularity",
];

function Nav() {
  const links = [
    { href: "#genre", label: "Genre" },
    { href: "#honesty", label: "Skip Honesty" },
    { href: "#time", label: "When" },
    { href: "#sessions", label: "Sessions" },
    { href: "#years", label: "Years" },
    { href: "#identity", label: "Identity" },
    { href: "#popularity", label: "Mainstream?" },
  ];
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#0a0a0aee",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1f1f1f",
      padding: "0 24px",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        height: 52,
        gap: 32,
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: "var(--green)", letterSpacing: "-0.5px" }}>Seven.</span>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13,
                color: "var(--muted)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.target.style.color = "var(--text)"}
              onMouseLeave={e => e.target.style.color = "var(--muted)"}
            >{l.label}</a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Built with Spotify Extended Streaming History (2019–2026) · 28,214 streams · No audio features used
      </p>
      <p style={{ color: "#444", fontSize: 12, marginTop: 8 }}>
        Analysis: Python + SQLite · Visualizations: React + Recharts · Data never leaves your browser
      </p>
    </footer>
  );
}

export default function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      DATA_FILES.map(name =>
        fetch(`./${name}.json`)
          .then(r => r.json())
          .then(json => [name, json])
          .catch(() => [name, null])
      )
    ).then(results => {
      const d = Object.fromEntries(results);
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--green)", marginBottom: 16 }}>Seven.</div>
          <div style={{ fontSize: 14, color: "#555" }}>Loading 7 years of data...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav />

      <main>
        <Hero overview={data.overview} genreEvolution={data.genre_evolution} />

        <div id="genre">
          <GenreEvolution data={data.genre_evolution} />
        </div>

        <div id="honesty">
          <SkipHonesty data={data.skip_honesty} />
        </div>

        <div id="time">
          <TimeHeatmap data={data.time_heatmap} />
        </div>

        <div id="sessions">
          <SessionArchaeology data={data.sessions} />
        </div>

        <div id="years">
          <YearTimeline byYear={data.by_year} />
        </div>

        <div id="identity">
          <DualIdentity data={data.dual_identity} />
        </div>

        <div id="popularity">
          <Popularity data={data.popularity} />
        </div>
      </main>

      <Footer />
    </>
  );
}
