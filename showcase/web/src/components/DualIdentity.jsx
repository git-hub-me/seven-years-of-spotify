import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

const IDENTITY_COLORS = {
  "Indian Indie/Folk": "#E8A838",
  "Hip-Hop": "#E84855",
  "Classic Rock": "#5865F2",
  "Alternative/Indie Rock": "#9B59B6",
};

const SHOW_IDENTITIES = ["Indian Indie/Folk", "Hip-Hop", "Classic Rock", "Alternative/Indie Rock"];

export default function DualIdentity({ data }) {
  if (!data?.by_year) return null;

  const years = Object.keys(data.by_year).sort();
  const series = years.map(y => ({ year: parseInt(y), ...data.by_year[y] }));

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 6</div>
      <h2 className="section-title">The Two Faces</h2>
      <p className="section-sub">
        There are two distinct listeners living in this data. Indian indie/folk for the quiet moments.
        Hip-hop for the energy. Classic rock as the bedrock. They almost never mix in the same session.
      </p>

      <div className="chart-wrap" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="year" stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#555" tick={{ fill: "#888", fontSize: 11 }} unit="%" domain={[0, 70]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 16px", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "#f0f0f0" }}>{label}</div>
                    {payload.sort((a, b) => b.value - a.value).map(p => (
                      <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ width: 10, height: 2, background: p.color, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ color: "#aaa" }}>{p.name}</span>
                        <span style={{ marginLeft: "auto", fontWeight: 600, color: "#f0f0f0" }}>{p.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              formatter={(v) => <span style={{ color: "#aaa" }}>{v}</span>}
            />
            {SHOW_IDENTITIES.map(id => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={IDENTITY_COLORS[id]}
                strokeWidth={2.5}
                dot={{ fill: IDENTITY_COLORS[id], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Identity artist breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 48 }}>
        {SHOW_IDENTITIES.filter(id => data.identity_artists[id]?.length).map(id => (
          <div key={id} className="card" style={{ borderTop: `3px solid ${IDENTITY_COLORS[id]}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: IDENTITY_COLORS[id], marginBottom: 12 }}>
              {id}
            </div>
            {data.identity_artists[id].slice(0, 6).map((a, i) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#444", width: 16, textAlign: "right" }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{a.name}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{a.plays} plays</span>
                <span style={{
                  fontSize: 10,
                  color: a.skip_pct < 30 ? "var(--green)" : a.skip_pct > 60 ? "var(--accent3)" : "var(--accent2)",
                  fontWeight: 600,
                }}>{Math.round(a.skip_pct)}% skip</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
