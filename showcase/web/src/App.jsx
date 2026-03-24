import React, { useEffect, useRef, useState } from "react";
import Hero from "./components/Hero.jsx";
import GenreEvolution from "./components/GenreEvolution.jsx";
import SkipHonesty from "./components/SkipHonesty.jsx";
import TimeHeatmap from "./components/TimeHeatmap.jsx";
import SessionArchaeology from "./components/SessionArchaeology.jsx";
import YearTimeline from "./components/YearTimeline.jsx";
import DualIdentity from "./components/DualIdentity.jsx";
import Popularity from "./components/Popularity.jsx";
import ArtistLifecycle from "./components/ArtistLifecycle.jsx";
import DecadeDNA from "./components/DecadeDNA.jsx";
import ArtistQuality from "./components/ArtistQuality.jsx";
import AlbumAffinity from "./components/AlbumAffinity.jsx";
import SkipTiming from "./components/SkipTiming.jsx";
import Seasonal from "./components/Seasonal.jsx";
import LoyaltyChurn from "./components/LoyaltyChurn.jsx";
import Streaks from "./components/Streaks.jsx";
import DiscoveryTimeline from "./components/DiscoveryTimeline.jsx";

const DATA_FILES = [
  "overview", "genre_evolution", "skip_honesty",
  "time_heatmap", "sessions", "by_year", "dual_identity", "popularity",
  "artist_lifecycle", "decade_dna", "artist_quality", "album_affinity",
  "skip_timing", "seasonal", "loyalty_churn", "streaks", "discovery_timeline",
];

function Nav() {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sectionIds = [
      "genre", "honesty", "time", "sessions", "years", "identity",
      "popularity", "lifecycle", "decades", "quality", "albums",
      "skiptiming", "seasonal", "churn", "streaks", "discovery",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const links = [
    { href: "#genre", label: "Genre" },
    { href: "#honesty", label: "Skips" },
    { href: "#time", label: "When" },
    { href: "#sessions", label: "Sessions" },
    { href: "#years", label: "Years" },
    { href: "#identity", label: "Identity" },
    { href: "#popularity", label: "Mainstream" },
    { href: "#lifecycle", label: "Artist Arcs" },
    { href: "#decades", label: "Decades" },
    { href: "#quality", label: "Quality" },
    { href: "#albums", label: "Albums" },
    { href: "#skiptiming", label: "30s Rule" },
    { href: "#seasonal", label: "Seasonal" },
    { href: "#churn", label: "Loyalty" },
    { href: "#streaks", label: "Streaks" },
    { href: "#discovery", label: "Discovery" },
  ];

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#0a0a0aee",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1f1f1f",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        height: 52,
        padding: "0 24px",
        gap: 0,
      }}>
        {/* Brand — fixed, never shrinks */}
        <a href="#top" style={{
          fontSize: 15,
          fontWeight: 900,
          color: "var(--green)",
          letterSpacing: "-0.5px",
          flexShrink: 0,
          marginRight: 24,
          whiteSpace: "nowrap",
          textDecoration: "none",
        }}>
          Seven Years of Spotify
        </a>

        {/* Links — horizontal scroll with fade-right indicator */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <div className="nav-links" style={{
            display: "flex",
            gap: 20,
            overflowX: "auto",
            flexWrap: "nowrap",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}>
          {links.map(l => {
            const isActive = activeSection === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontSize: 12,
                  color: isActive ? "var(--green)" : "var(--muted)",
                  textDecoration: "none",
                  transition: "color 0.15s, border-color 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  paddingBottom: 2,
                  borderBottom: isActive ? "2px solid var(--green)" : "2px solid transparent",
                }}
              >{l.label}</a>
            );
          })}
          </div>
          {/* Fade hint — indicates more links are scrollable */}
          <div style={{
            position: "absolute",
            right: 0, top: 0, bottom: 0,
            width: 48,
            background: "linear-gradient(to right, transparent, #0a0a0a)",
            pointerEvents: "none",
          }} />
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
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--green)", marginBottom: 24 }}>Seven Years of Spotify</div>
          <div style={{
            width: 32, height: 32,
            borderRadius: "50%",
            border: "3px solid #1f1f1f",
            borderTopColor: "var(--green)",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav />

      <main id="top">
        <Hero overview={data.overview} genreEvolution={data.genre_evolution} />

        {data.genre_evolution && (
          <div id="genre">
            <GenreEvolution data={data.genre_evolution} />
          </div>
        )}

        {data.skip_honesty && (
          <div id="honesty">
            <SkipHonesty data={data.skip_honesty} />
          </div>
        )}

        {data.time_heatmap && (
          <div id="time">
            <TimeHeatmap data={data.time_heatmap} />
          </div>
        )}

        {data.sessions && (
          <div id="sessions">
            <SessionArchaeology data={data.sessions} />
          </div>
        )}

        {data.by_year && (
          <div id="years">
            <YearTimeline byYear={data.by_year} />
          </div>
        )}

        {data.dual_identity && (
          <div id="identity">
            <DualIdentity data={data.dual_identity} />
          </div>
        )}

        {data.popularity && (
          <div id="popularity">
            <Popularity data={data.popularity} />
          </div>
        )}

        {data.artist_lifecycle && (
          <div id="lifecycle">
            <ArtistLifecycle data={data.artist_lifecycle} />
          </div>
        )}

        {data.decade_dna && (
          <div id="decades">
            <DecadeDNA data={data.decade_dna} />
          </div>
        )}

        {data.artist_quality && (
          <div id="quality">
            <ArtistQuality data={data.artist_quality} />
          </div>
        )}

        {data.album_affinity && (
          <div id="albums">
            <AlbumAffinity data={data.album_affinity} />
          </div>
        )}

        {data.skip_timing && (
          <div id="skiptiming">
            <SkipTiming data={data.skip_timing} />
          </div>
        )}

        {data.seasonal && (
          <div id="seasonal">
            <Seasonal data={data.seasonal} />
          </div>
        )}

        {data.loyalty_churn && (
          <div id="churn">
            <LoyaltyChurn data={data.loyalty_churn} />
          </div>
        )}

        {data.streaks && (
          <div id="streaks">
            <Streaks data={data.streaks} />
          </div>
        )}

        {data.discovery_timeline && (
          <div id="discovery">
            <DiscoveryTimeline data={data.discovery_timeline} />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
