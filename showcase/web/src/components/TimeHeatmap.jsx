import React, { useState } from "react";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// IST = UTC+5:30 — convert UTC hour index to IST label for display
function utcToIstLabel(utcHour) {
  const totalMins = utcHour * 60 + 330;
  const istHour = Math.floor(totalMins / 60) % 24;
  const istMin = totalMins % 60;
  const suffix = istHour < 12 ? "am" : "pm";
  const h = istHour % 12 || 12;
  return istMin === 0 ? `${h}${suffix}` : `${h}:${String(istMin).padStart(2, "0")}${suffix}`;
}

const IST_HOUR_LABELS = Array.from({ length: 24 }, (_, i) => utcToIstLabel(i));

// Multi-stop inferno palette: empty → deep purple → violet → hot pink → orange → golden
const COLOR_STOPS = [
  { t: 0.00, r: 17,  g: 17,  b: 17  },
  { t: 0.01, r: 30,  g: 12,  b: 55  },
  { t: 0.20, r: 88,  g: 15,  b: 130 },
  { t: 0.45, r: 185, g: 40,  b: 110 },
  { t: 0.70, r: 240, g: 95,  b: 30  },
  { t: 1.00, r: 252, g: 215, b: 55  },
];

function interpolateColor(value, max) {
  if (value === 0 || max === 0) return "#111111";
  const t = Math.min(value / max, 1);
  let lo = COLOR_STOPS[0], hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i].t && t <= COLOR_STOPS[i + 1].t) {
      lo = COLOR_STOPS[i]; hi = COLOR_STOPS[i + 1]; break;
    }
  }
  const u = (t - lo.t) / (hi.t - lo.t || 1);
  return `rgb(${Math.round(lo.r + u * (hi.r - lo.r))},${Math.round(lo.g + u * (hi.g - lo.g))},${Math.round(lo.b + u * (hi.b - lo.b))})`;
}

export default function TimeHeatmap({ data }) {
  const [selectedYear, setSelectedYear] = useState("all");

  if (!data?.all?.matrix) return null;

  const slice = selectedYear === "all" ? data.all : data.by_year[selectedYear];
  const { matrix, hourly, daily, total_streams, total_hours } = slice;

  const maxStreams = Math.max(...matrix.flat().map(c => c.streams), 1);
  const totalStreamsAll = data.all.total_streams || 1;

  const fridayTotal = daily?.find(d => d.dow === 4)?.streams || 0;
  const fridayPct = ((fridayTotal / (total_streams || 1)) * 100).toFixed(1);
  const peakHour = hourly?.reduce((best, h) => h.ms > (best?.ms || 0) ? h : best, null);

  const years = data.years || [];

  return (
    <div className="section" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="section-label">Chapter 3</div>
      <h2 className="section-title">When I Listen</h2>
      <p className="section-sub">
        {selectedYear === "all" ? "7 years" : selectedYear} of listening compressed into a single grid.
        Each cell is streams at that hour × day.{" "}
        <span style={{ color: "#555", fontSize: 13 }}>All times in IST (UTC+5:30).</span>
      </p>

      {/* Year selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedYear("all")}
          style={{
            background: selectedYear === "all" ? "#ffffff18" : "transparent",
            border: `1px solid ${selectedYear === "all" ? "#888" : "#2a2a2a"}`,
            color: selectedYear === "all" ? "#f0f0f0" : "#555",
            borderRadius: 20, padding: "6px 18px",
            fontSize: 13, cursor: "pointer",
            fontWeight: selectedYear === "all" ? 700 : 400,
            transition: "all 0.15s",
          }}
        >All years</button>
        {years.map(y => {
          const isActive = selectedYear === y;
          const yearStreams = data.by_year[y]?.total_streams || 0;
          const pct = Math.round(yearStreams / totalStreamsAll * 100);
          return (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              title={`${yearStreams.toLocaleString()} streams · ${data.by_year[y]?.total_hours}h`}
              style={{
                background: isActive ? "#1DB95422" : "transparent",
                border: `1px solid ${isActive ? "var(--green)" : "#2a2a2a"}`,
                color: isActive ? "var(--green)" : "#555",
                borderRadius: 20, padding: "6px 16px",
                fontSize: 13, cursor: "pointer",
                fontWeight: isActive ? 700 : 400,
                transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              }}
            >
              <span>{y}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{pct}%</span>
            </button>
          );
        })}
      </div>

      {/* Quick stats for selected year */}
      <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
        {[
          { label: "Streams", value: (total_streams || 0).toLocaleString(), color: "var(--text)" },
          { label: "Hours listened", value: `${total_hours}h`, color: "var(--accent2)" },
          { label: "Friday share", value: `${fridayPct}%`, color: "var(--green)" },
          { label: "Peak hour (IST)", value: peakHour ? IST_HOUR_LABELS[peakHour.hour] : "–", color: "#9B59B6" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: "1 1 130px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 520 }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
            <div />
            {DOW_LABELS.map(d => (
              <div key={d} style={{
                textAlign: "center", fontSize: 11,
                color: d === "Fri" ? "var(--green)" : "var(--muted)",
                fontWeight: d === "Fri" ? 700 : 400,
                padding: "4px 0",
              }}>{d}</div>
            ))}
          </div>

          {/* Hour rows (UTC index, IST label) */}
          {Array.from({ length: 24 }, (_, utcHour) => (
            <div key={utcHour} style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
              <div style={{
                fontSize: 10, color: "var(--muted)",
                display: "flex", alignItems: "center",
                justifyContent: "flex-end", paddingRight: 8,
              }}>
                {utcHour % 3 === 0 ? IST_HOUR_LABELS[utcHour] : ""}
              </div>
              {Array.from({ length: 7 }, (_, dow) => {
                const cell = matrix[utcHour][dow];
                return (
                  <div
                    key={dow}
                    title={`${DOW_LABELS[dow]} ${IST_HOUR_LABELS[utcHour]} IST: ${cell.streams} streams`}
                    style={{
                      height: 18, borderRadius: 3,
                      background: interpolateColor(cell.streams, maxStreams),
                      border: dow === 4 ? "1px solid #1DB95433" : "1px solid transparent",
                      cursor: "default", transition: "transform 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>0</span>
            <div style={{
              width: 160, height: 10, borderRadius: 5,
              background: "linear-gradient(to right, #1e0c37, #580f82, #b9286e, #f05f1e, #fcd737)",
            }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{maxStreams} streams/cell</span>
          </div>
        </div>
      </div>

      {/* Day-of-week bar */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Streams by Day{selectedYear !== "all" ? ` — ${selectedYear}` : ""}
        </h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
          {daily?.map(d => {
            const pct = d.streams / (total_streams || 1);
            const isFri = d.dow === 4;
            return (
              <div key={d.dow} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: isFri ? "var(--green)" : "var(--muted)" }}>
                  {(pct * 100).toFixed(0)}%
                </div>
                <div style={{
                  width: "100%",
                  height: Math.max(4, pct * 200),
                  background: isFri ? "var(--green)" : "#2a2a2a",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                }} />
                <div style={{ fontSize: 11, color: isFri ? "var(--green)" : "var(--muted)", fontWeight: isFri ? 700 : 400 }}>
                  {DOW_LABELS[d.dow]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
