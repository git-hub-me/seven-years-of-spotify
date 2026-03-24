import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell,
} from "recharts";
import { GENRE_COLORS } from "../constants/colors.js";

const MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Seasonal({ data }) {
  const [selectedYear, setSelectedYear] = useState("all");

  if (!data?.series) return null;
  const { series, avg_by_month, peak_month } = data;

  const years = [...new Set(series.map(s => s.year))].sort();

  const filteredSeries = selectedYear === "all"
    ? series
    : series.filter(s => s.year === parseInt(selectedYear));

  // For genre breakdown bar — top genres by avg across filtered series
  const genreAgg = {};
  filteredSeries.forEach(s => {
    Object.entries(s.genre_pct).forEach(([g, pct]) => {
      genreAgg[g] = (genreAgg[g] || 0) + pct;
    });
  });
  const topGenres = Object.entries(genreAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 14</div>
      <h2 className="section-title">Seasonal Listening</h2>
      <p className="section-sub">
        Your peak listening month is <b style={{ color: "var(--accent2)" }}>{peak_month}</b>.
        October and March consistently lead — something about those months pulls you to music.
      </p>

      {/* Year selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        {["all", ...years].map(y => (
          <button key={y} onClick={() => setSelectedYear(String(y))}
            style={{
              background: selectedYear === String(y) ? "var(--green)22" : "transparent",
              border: `1px solid ${selectedYear === String(y) ? "var(--green)" : "#2a2a2a"}`,
              color: selectedYear === String(y) ? "var(--green)" : "#555",
              borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer",
              fontWeight: selectedYear === String(y) ? 700 : 400,
            }}>{y === "all" ? "All Years" : y}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
        {/* Monthly streams over time / filtered */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {selectedYear === "all" ? "Monthly Volume (All Years)" : `Monthly Volume · ${selectedYear}`}
          </h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredSeries} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="month" stroke="#333" tick={{ fill: "#666", fontSize: 9 }}
                  tickFormatter={v => { const [y, m] = v.split("-"); return `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)]} '${y.slice(2)}`; }}
                  interval={selectedYear === "all" ? 5 : 0} />
                <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "#f0f0f0" }}>{d.month}</div>
                      <div style={{ color: "#aaa" }}>{d.streams} streams · {d.hours}h</div>
                      <div style={{ color: "#aaa" }}>Top genre: <b style={{ color: GENRE_COLORS[d.top_genre] || "#888" }}>{d.top_genre}</b></div>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="streams" stroke="var(--green)" strokeWidth={1.5}
                  fill="url(#volGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average by calendar month OR selected year hours */}
        <div>
          {selectedYear === "all" ? (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Average Hours by Month</h3>
              <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                Across all years — which months consistently pull more listening?
              </p>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={avg_by_month} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="month_num" stroke="#333" tick={{ fill: "#666", fontSize: 11 }}
                      tickFormatter={v => MONTH_SHORT[v]} />
                    <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="h" />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                          <div style={{ color: "#f0f0f0", fontWeight: 700 }}>{MONTH_SHORT[d.month_num]}</div>
                          <div style={{ color: "#aaa" }}>Avg <b style={{ color: "var(--accent2)" }}>{d.avg_hours}h</b> per year</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="avg_hours" radius={[3, 3, 0, 0]}>
                      {avg_by_month.map((m, i) => {
                        const max = Math.max(...avg_by_month.map(x => x.avg_hours));
                        return <Cell key={i} fill={m.avg_hours === max ? "var(--green)" : "var(--accent2)"} opacity={0.85} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Hours by Month · {selectedYear}</h3>
              <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                Actual listening hours for each month of {selectedYear}.
              </p>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredSeries} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="month_num" stroke="#333" tick={{ fill: "#666", fontSize: 11 }}
                      tickFormatter={v => MONTH_SHORT[v]} />
                    <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="h" />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                          <div style={{ color: "#f0f0f0", fontWeight: 700 }}>{MONTH_SHORT[d.month_num]} {selectedYear}</div>
                          <div style={{ color: "#aaa" }}><b style={{ color: "var(--accent2)" }}>{d.hours}h</b> · {d.streams} streams</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="hours" fill="var(--accent2)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Genre per month (selected year or recent year) */}
      {selectedYear !== "all" && filteredSeries.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Genre Mix by Month · {selectedYear}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Month</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#555", fontWeight: 600, fontSize: 11 }}>Streams</th>
                  <th style={{ textAlign: "left", padding: "6px 12px", color: "#555", fontWeight: 600, fontSize: 11 }}>Top Genre</th>
                  <th style={{ textAlign: "right", padding: "6px 0", color: "#555", fontWeight: 600, fontSize: 11 }}>Skip%</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeries.map(s => (
                  <tr key={s.month} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "8px 0", fontWeight: 600 }}>{MONTH_SHORT[s.month_num]}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--muted)" }}>{s.streams}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ color: GENRE_COLORS[s.top_genre] || "#888", fontWeight: 600 }}>{s.top_genre}</span>
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right", color: s.skip_pct > 50 ? "var(--accent3)" : "var(--muted)" }}>
                      {s.skip_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
