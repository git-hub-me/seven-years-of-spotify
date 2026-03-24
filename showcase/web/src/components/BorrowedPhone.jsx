import React, { useState } from "react";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`
);

function AnomalyBar({ pct }) {
  const color = pct > 80 ? "#E84855" : pct > 60 ? "#E8A838" : "#555";
  const label = pct > 80 ? "high" : pct > 60 ? "mid" : "low";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 4, background: "#1a1a1a", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}</span>
      <span style={{ fontSize: 10, color: "#555" }}>({label})</span>
    </div>
  );
}

export default function BorrowedPhone({ data }) {
  const [showAll, setShowAll] = useState(false);

  if (!data?.suspicious) return null;
  const { suspicious, normal_high_completion, total_sessions, avg_completion_all } = data;

  const display = showAll ? suspicious : suspicious.slice(0, 10);

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 12</div>
      <h2 className="section-title">Not Me?</h2>
      <p className="section-sub">
        You skip songs you don't like. So when a long session plays through artists you normally skip —
        someone else was probably holding the phone. Anomaly = high completion × artists you usually skip × session length.
      </p>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 40, fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
        <b style={{ color: "var(--text)" }}>Signal:</b> Your average track completion is{" "}
        <b style={{ color: "var(--accent2)" }}>{avg_completion_all}%</b> across{" "}
        {total_sessions.toLocaleString()} sessions. Sessions flagged here have 80%+ completion
        but are dominated by artists you skip 45%+ of the time normally.
        High score = someone else's taste playing through on your account.
      </div>

      <div className="grid-2" style={{ marginBottom: 48 }}>
        {/* Suspicious sessions */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: "#E84855" }}>⚠ Flagged Sessions</span>
          </h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Sorted by anomaly score. Red = highly suspicious.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px 6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Date</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Top Artist</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Compl.</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Dur.</th>
                  <th style={{ textAlign: "left", padding: "6px 0 6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {display.map((s, i) => {
                  const timeLabel = s.ist_hour != null ? HOUR_LABELS[s.ist_hour] : "?";
                  const dowLabel = s.dow != null ? DOW_LABELS[s.dow] : "";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "9px 8px 9px 0" }}>
                        <div style={{ color: "var(--text)", fontWeight: 600 }}>{s.date}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{dowLabel} {timeLabel}</div>
                      </td>
                      <td style={{ padding: "9px 8px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div style={{ color: "var(--text)" }}>{s.top_artist}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{s.unique_artists} artists</div>
                      </td>
                      <td style={{ padding: "9px 8px", textAlign: "right" }}>
                        <span style={{ color: s.avg_completion > 90 ? "#E84855" : "var(--accent2)", fontWeight: 700 }}>
                          {s.avg_completion}%
                        </span>
                        <div style={{ fontSize: 10, color: "#444" }}>skip {s.avg_artist_skip}% norm.</div>
                      </td>
                      <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--muted)" }}>
                        {s.duration_min}m
                      </td>
                      <td style={{ padding: "9px 0 9px 8px" }}>
                        <AnomalyBar pct={s.anomaly_pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {suspicious.length > 10 && (
            <button onClick={() => setShowAll(p => !p)} style={{
              marginTop: 12, background: "transparent", border: "1px solid #2a2a2a",
              color: "#555", borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer",
            }}>
              {showAll ? "Show less" : `Show all ${suspicious.length}`}
            </button>
          )}
        </div>

        {/* Your normal high-completion for contrast */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: "var(--green)" }}>✓ Your Normal Deep Listens</span>
          </h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            For contrast — sessions where you completed songs because you actually love the music.
            Low artist skip rate + high completion = genuine you.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px 6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Date</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Top Artist</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Compl.</th>
                  <th style={{ textAlign: "right", padding: "6px 0 6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Skip norm.</th>
                </tr>
              </thead>
              <tbody>
                {normal_high_completion.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "9px 8px 9px 0" }}>
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>{s.date}</div>
                      <div style={{ fontSize: 10, color: "#444" }}>
                        {s.dow != null ? DOW_LABELS[s.dow] : ""} {s.ist_hour != null ? HOUR_LABELS[s.ist_hour] : ""}
                      </div>
                    </td>
                    <td style={{ padding: "9px 8px", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.top_artist}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--green)", fontWeight: 700 }}>
                      {s.avg_completion}%
                    </td>
                    <td style={{ padding: "9px 0 9px 8px", textAlign: "right", color: "var(--green)" }}>
                      {s.avg_artist_skip}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
