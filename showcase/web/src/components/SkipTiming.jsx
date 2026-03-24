import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, ReferenceLine,
} from "recharts";

const MONTH_LABELS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HOUR_LABEL = (h) =>
  h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

const pctColor = (pct) => {
  if (pct >= 90) return "var(--green)";
  if (pct >= 60) return "var(--accent2)";
  if (pct >= 30) return "#E8A838";
  return "var(--accent3)";
};

export default function SkipTiming({ data }) {
  if (!data?.histogram) return null;

  const { histogram, genre_stats, by_hour, skipped_before_30s_pct, completed_full_pct } = data;

  // Aggregate IST hours into buckets for readability
  const istHours = by_hour.map(h => ({
    ...h,
    label: HOUR_LABEL(h.hour_ist),
  }));

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 13</div>
      <h2 className="section-title">The 30-Second Rule</h2>
      <p className="section-sub">
        <b style={{ color: "var(--accent3)" }}>{skipped_before_30s_pct}%</b> of tracks were abandoned before 30 seconds.
        <b style={{ color: "var(--green)" }}> {completed_full_pct}%</b> were played to completion.
        Everything in between tells a story about patience and taste.
      </p>

      <div className="grid-2" style={{ marginBottom: 48 }}>
        {/* Completion histogram */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Where Tracks Get Abandoned</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
            Bimodal — either you know immediately it's not right, or you commit. Almost nothing in between survives past 60%.
          </p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="pct" stroke="#333" tick={{ fill: "#666", fontSize: 10 }}
                  tickFormatter={v => `${v}%`} />
                <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} label={{ value: "tracks", fill: "#666", fontSize: 10, angle: -90, position: "insideLeft" }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                      <div style={{ color: "#aaa" }}>Abandoned at <b style={{ color: "#f0f0f0" }}>{d.pct}%</b></div>
                      <div style={{ color: "#aaa" }}>{d.count.toLocaleString()} tracks · <b style={{ color: "var(--green)" }}>{d.share}%</b></div>
                    </div>
                  );
                }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {histogram.map((h, i) => (
                    <Cell key={i} fill={pctColor(h.pct)} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre breakdown */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Patience by Genre</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
            Which genres get a real chance before you bail?
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Genre</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Avg Completion</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Bailed &lt;30s</th>
                  <th style={{ textAlign: "right", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Played Full</th>
                </tr>
              </thead>
              <tbody>
                {genre_stats.map(g => (
                  <tr key={g.genre} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "9px 0", fontWeight: 600 }}>{g.genre}</td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--accent2)", fontWeight: 700 }}>{g.avg_completion}%</td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--accent3)" }}>{g.bail_early_pct}%</td>
                    <td style={{ padding: "9px 0", textAlign: "right", color: "var(--green)" }}>{g.played_full_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Completion by hour of day */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Patience by Time of Day (IST)</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          Are you more patient with music at certain hours? Late night tends to mean longer listening.
        </p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={istHours} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="label" stroke="#333" tick={{ fill: "#666", fontSize: 9 }} interval={2} />
              <YAxis domain={[40, 75]} stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="%" />
              <ReferenceLine y={completed_full_pct} stroke="#333" strokeDasharray="4 4"
                label={{ value: "avg", fill: "#555", fontSize: 10 }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                    <div style={{ color: "#f0f0f0", fontWeight: 700 }}>{d.label} IST</div>
                    <div style={{ color: "#aaa" }}>Avg completion: <b style={{ color: "var(--green)" }}>{d.avg_completion}%</b></div>
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="avg_completion" stroke="var(--accent2)" strokeWidth={2}
                dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
