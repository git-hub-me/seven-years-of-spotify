import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";

export default function LoyaltyChurn({ data }) {
  const [selectedYear, setSelectedYear] = useState(null);

  if (!data?.by_year) return null;
  const { by_year } = data;

  const selected = selectedYear != null ? by_year.find(y => y.year === selectedYear) : null;

  const chartData = by_year.map(y => ({
    year: y.year,
    new: y.new,
    retained: y.retained,
    dropped: y.dropped,
    retention: y.retention_pct,
  }));

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 15</div>
      <h2 className="section-title">Loyalty &amp; Churn</h2>
      <p className="section-sub">
        Each year, how many artists did you discover, stick with, or leave behind?
        2020 had the lowest retention — only <b style={{ color: "var(--accent3)" }}>29.7%</b> of 2019 artists carried over.
      </p>

      <div className="grid-2" style={{ marginBottom: 48 }}>
        {/* Stacked bar: new / retained / dropped */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Artist Flow by Year</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Click a bar to see who came and went.</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>{label}</div>
                      {payload.map(p => (
                        <div key={p.dataKey} style={{ color: p.fill, marginBottom: 2 }}>
                          {p.name}: <b>{p.value}</b>
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Bar dataKey="new" stackId="a" fill="#1DB954" name="New" cursor="pointer"
                  onClick={d => setSelectedYear(prev => prev === d.year ? null : d.year)} />
                <Bar dataKey="retained" stackId="a" fill="#5865F2" name="Retained" cursor="pointer"
                  onClick={d => setSelectedYear(prev => prev === d.year ? null : d.year)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11 }}>
            {[["#1DB954", "New Discoveries"], ["#5865F2", "Retained from Last Year"], ["#E84855", "Dropped"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, color: "#aaa" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Retention rate line */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Artist Retention Rate</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            % of last year's artists that came back. Below 35% = high churn year.
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.slice(1)} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="%" />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                      <div style={{ color: "#f0f0f0", fontWeight: 700 }}>{label}</div>
                      <div style={{ color: "#aaa" }}>Retention: <b style={{ color: "var(--accent2)" }}>{payload[0]?.value}%</b></div>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="retention" stroke="var(--accent2)" strokeWidth={2.5}
                  dot={{ fill: "var(--accent2)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year detail */}
      {selected && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {selected.year}
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13, marginLeft: 12 }}>
                {selected.new} new · {selected.retained} retained · {selected.dropped} dropped · {selected.retention_pct}% retention
              </span>
            </h3>
            <button onClick={() => setSelectedYear(null)}
              style={{ background: "transparent", border: "1px solid #333", color: "var(--muted)", borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
              Clear ×
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginBottom: 12 }}>New Discoveries</div>
              {selected.top_new.slice(0, 6).map((a, i) => (
                <div key={a.artist} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
                  <span>#{i + 1} {a.artist}</span>
                  <span style={{ color: "var(--muted)" }}>{a.plays} plays</span>
                </div>
              ))}
            </div>
            {selected.top_dropped.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent3)", marginBottom: 12 }}>Left Behind</div>
                {selected.top_dropped.slice(0, 6).map((a, i) => (
                  <div key={a.artist} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111", fontSize: 12 }}>
                    <span>#{i + 1} {a.artist}</span>
                    <span style={{ color: "var(--muted)" }}>{a.plays} plays last year</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
