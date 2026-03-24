import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Streaks({ data }) {
  if (!data?.top_streaks) return null;

  const {
    top_streaks, top_gaps, monthly_cadence,
    total_active_days, total_span_days, activity_pct,
    longest_streak, longest_gap,
  } = data;

  // Group monthly_cadence by year for the heatmap
  const years = [...new Set(monthly_cadence.map(m => m.month.slice(0, 4)))].sort();
  const cadenceMap = Object.fromEntries(monthly_cadence.map(m => [m.month, m.days]));
  const maxDays = Math.max(...monthly_cadence.map(m => m.days));

  const dayColor = (days) => {
    if (!days) return "#111";
    const t = days / maxDays;
    if (t > 0.8) return "#1DB954";
    if (t > 0.5) return "#E8A838";
    if (t > 0.2) return "#5865F2";
    return "#3a3a3a";
  };

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 16</div>
      <h2 className="section-title">Streaks &amp; Silence</h2>
      <p className="section-sub">
        You listened on <b style={{ color: "var(--green)" }}>{total_active_days.toLocaleString()}</b> out of{" "}
        {total_span_days.toLocaleString()} days — <b style={{ color: "var(--accent2)" }}>{activity_pct}%</b> of the time.
        Longest streak: <b style={{ color: "var(--green)" }}>{longest_streak?.days} days</b>.
        Longest silence: <b style={{ color: "var(--accent3)" }}>{longest_gap?.days} days</b>.
      </p>

      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>{longest_streak?.days}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Longest streak (days)</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{longest_streak?.start} → {longest_streak?.end}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent3)", lineHeight: 1 }}>{longest_gap?.days}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Longest silence (days)</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{longest_gap?.from} → {longest_gap?.to}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent2)", lineHeight: 1 }}>{activity_pct}%</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Days with any listening</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{total_active_days} of {total_span_days} days</div>
        </div>
      </div>

      {/* Monthly cadence heatmap */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Monthly Activity</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          Days listened per month across all years.
        </p>

        {/* Month headers */}
        <div style={{ display: "flex", marginLeft: 40, marginBottom: 4 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ flex: 1, fontSize: 10, color: "#444", textAlign: "center" }}>
              {MONTH_SHORT[i + 1]}
            </div>
          ))}
        </div>

        {years.map(year => (
          <div key={year} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div style={{ width: 36, fontSize: 11, color: "#555", flexShrink: 0 }}>{year}</div>
            {Array.from({ length: 12 }, (_, i) => {
              const month = `${year}-${String(i + 1).padStart(2, "0")}`;
              const days = cadenceMap[month] || 0;
              return (
                <div key={i} style={{ flex: 1, margin: "0 1px" }}>
                  <div
                    title={`${month}: ${days} days`}
                    style={{
                      height: 20,
                      background: dayColor(days),
                      borderRadius: 2,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 12, marginLeft: 40, alignItems: "center", fontSize: 11, color: "#444" }}>
          <span style={{ fontSize: 11, color: "#444" }}>Less</span>
          {["#2a2a2a", "#5865F2", "#E8A838", "#1DB954"].map(c => (
            <span key={c} style={{ width: 12, height: 12, background: c, borderRadius: 2, display: "inline-block" }} />
          ))}
          <span style={{ fontSize: 11, color: "#444" }}>More</span>
        </div>
      </div>

      {/* Top streaks + gaps side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            <span style={{ color: "var(--green)" }}>Top Listening Streaks</span>
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Period</th>
                <th style={{ textAlign: "right", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {top_streaks.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                  <td style={{ padding: "8px 0", color: "#444" }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{s.start} → {s.end}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{s.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            <span style={{ color: "var(--accent3)" }}>Longest Silences</span>
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Period</th>
                <th style={{ textAlign: "right", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {top_gaps.map((g, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                  <td style={{ padding: "8px 0", color: "#444" }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{g.from} → {g.to}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: "var(--accent3)" }}>{g.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
