import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const TIER_COLORS = {
  mainstream:  "#E84855",
  popular:     "#E8A838",
  mid:         "#1DB954",
  niche:       "#5865F2",
  underground: "#9B59B6",
};

const TIER_ORDER = ["mainstream", "popular", "mid", "niche", "underground"];

function TierBar({ bucket, pct, skip_pct, full_plays, label, maxPct }) {
  const [hovered, setHovered] = useState(false);
  const color = TIER_COLORS[bucket];
  return (
    <div
      style={{ marginBottom: 18, cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: hovered ? color : "var(--text)" }}>{label}</span>
        <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
          <span style={{ color: color, fontWeight: 700 }}>{pct}%</span>
          <span style={{ color: "var(--muted)" }}>skip <b style={{ color: skip_pct > 42 ? "var(--accent3)" : skip_pct < 36 ? "var(--green)" : "var(--accent2)" }}>{Math.round(skip_pct)}%</b></span>
          <span style={{ color: "#444" }}>{full_plays.toLocaleString()} plays</span>
        </div>
      </div>
      <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${(pct / maxPct) * 100}%`,
          background: color,
          borderRadius: 4,
          transition: "width 0.4s ease",
          opacity: hovered ? 1 : 0.8,
        }} />
      </div>
    </div>
  );
}

function TrackRow({ track, artist, full_plays, popularity, completion_pct, skip_pct, i, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #111" }}>
      <span style={{ fontSize: 11, color: "#444", width: 20, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{artist}</div>
      </div>
      <div style={{ display: "flex", gap: 12, flexShrink: 0, fontSize: 11 }}>
        <span style={{ color: color, fontWeight: 700 }}>pop {popularity}</span>
        <span style={{ color: "var(--muted)" }}>{full_plays} plays</span>
        {completion_pct != null && (
          <span style={{ color: "#555" }}>{Math.round(completion_pct)}% complete</span>
        )}
      </div>
    </div>
  );
}

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#aaa" }}>Avg popularity: <b style={{ color: "var(--green)" }}>{payload[0]?.value}</b></div>
      <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>0 = obscure · 100 = global hit</div>
    </div>
  );
};

const StackTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => {
    return TIER_ORDER.indexOf(a.dataKey) - TIER_ORDER.indexOf(b.dataKey);
  });
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>{label}</div>
      {sorted.filter(p => p.value > 0.5).map(p => (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: TIER_COLORS[p.dataKey], flexShrink: 0, display: "inline-block" }} />
          <span style={{ color: "#aaa", textTransform: "capitalize" }}>{p.dataKey}</span>
          <span style={{ marginLeft: "auto", fontWeight: 600, color: "#f0f0f0" }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function Popularity({ data }) {
  const [tracksTab, setTracksTab] = useState("underground");

  if (!data?.overall) return null;

  const maxPct = Math.max(...data.overall.map(t => t.pct));
  const firstYear = data.trend[0];
  const lastYear = data.trend[data.trend.length - 1];
  const popDelta = (lastYear.avg_pop - firstYear.avg_pop).toFixed(1);

  // The "honest skip" finding — which tier gets listened to most carefully?
  const lowestSkip = [...data.overall].sort((a, b) => a.skip_pct - b.skip_pct)[0];

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 7</div>
      <h2 className="section-title">How Mainstream Are You?</h2>
      <p className="section-sub">
        Spotify popularity scores every track 0–100 based on global stream counts.
        Here's what 7 years of plays actually reveal about your taste vs. the mainstream.
      </p>

      {/* Hero callouts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent2)", lineHeight: 1 }}>
            +{popDelta}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
            Avg popularity shift, {firstYear.year}→{lastYear.year}
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
            {firstYear.avg_pop} → {lastYear.avg_pop} — you've gotten progressively more mainstream
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>
            {Math.round(data.overall.find(t => t.bucket === "mainstream")?.pct + data.overall.find(t => t.bucket === "popular")?.pct)}%
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Plays are popular or mainstream</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Popularity 60+</div>
        </div>
        <div className="card" style={{ borderColor: TIER_COLORS[lowestSkip.bucket] + "44" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: TIER_COLORS[lowestSkip.bucket], lineHeight: 1 }}>
            {Math.round(lowestSkip.skip_pct)}%
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
            Skip rate on <span style={{ color: TIER_COLORS[lowestSkip.bucket] }}>{lowestSkip.label}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
            Your most genuinely engaged tier — lower than mainstream
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 48 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>What You Actually Listen To</h3>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
            Popularity score 0–100. Hover for skip rate — the honest engagement signal.
          </div>
          {TIER_ORDER.map(bucket => {
            const t = data.overall.find(o => o.bucket === bucket);
            if (!t) return null;
            return <TierBar key={bucket} {...t} maxPct={maxPct} />;
          })}
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Skip Rate vs Popularity</h3>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
            The counterintuitive finding — you skip mainstream tracks at a <em>higher</em> rate than underground ones.
          </p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TIER_ORDER.map(b => data.overall.find(o => o.bucket === b)).filter(Boolean)}
                margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="bucket" tick={{ fill: "#666", fontSize: 10 }} stroke="#333" />
                <YAxis domain={[0, 60]} tick={{ fill: "#666", fontSize: 11 }} stroke="#333" unit="%" />
                <ReferenceLine y={38} stroke="#ffffff22" strokeDasharray="4 4"
                  label={{ value: "avg", fill: "#555", fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                        <div style={{ color: TIER_COLORS[d.bucket], fontWeight: 700 }}>{d.label}</div>
                        <div style={{ color: "#aaa" }}>Skip rate: <b style={{ color: "#f0f0f0" }}>{Math.round(d.skip_pct)}%</b></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="skip_pct" radius={[4, 4, 0, 0]}>
                  {TIER_ORDER.map(b => (
                    <Cell key={b} fill={TIER_COLORS[b]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mainstream creep over time */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>The Mainstream Creep</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          Average popularity score of tracks you fully listened to, by year.
          Every year bar 2020 has trended upward.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis domain={[50, 80]} stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip content={<TrendTooltip />} />
                <ReferenceLine y={60} stroke="#555" strokeDasharray="4 4" label={{ value: "popular threshold", fill: "#555", fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="avg_pop" stroke="var(--accent2)" strokeWidth={2.5}
                  dot={{ fill: "var(--accent2)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tier_by_year} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="year" stroke="#333" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#333" tick={{ fill: "#666", fontSize: 11 }} unit="%" />
                <Tooltip content={<StackTooltip />} />
                {[...TIER_ORDER].reverse().map(b => (
                  <Bar key={b} dataKey={b} stackId="1" fill={TIER_COLORS[b]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Underground gems vs Mainstream hits */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>The Two Extremes</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
          Tracks you played most at each end of the popularity spectrum.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["underground", "Underground Gems (pop <20)"], ["mainstream", "Mainstream Hits (pop 80+)"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTracksTab(key)}
              style={{
                background: tracksTab === key ? TIER_COLORS[key] + "22" : "transparent",
                border: `1px solid ${tracksTab === key ? TIER_COLORS[key] : "#2a2a2a"}`,
                color: tracksTab === key ? TIER_COLORS[key] : "#555",
                borderRadius: 20, padding: "7px 18px",
                fontSize: 13, cursor: "pointer", fontWeight: tracksTab === key ? 700 : 400,
                transition: "all 0.15s",
              }}
            >{label}</button>
          ))}
        </div>

        <div className="card">
          {(tracksTab === "underground" ? data.underground_gems : data.mainstream_hits).map((t, i) => (
            <TrackRow key={i} {...t} i={i} color={TIER_COLORS[tracksTab]} />
          ))}
        </div>
      </div>
    </div>
  );
}
