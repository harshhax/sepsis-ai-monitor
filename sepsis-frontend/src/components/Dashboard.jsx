import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, RadialBarChart, RadialBar
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// ─── COLORS & THEME ──────────────────────────────────────────────────────────
const ALERT_CONFIG = {
  normal:  { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "NORMAL",       glow: "0 0 20px rgba(16,185,129,0.4)" },
  watch:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "WATCH",        glow: "0 0 20px rgba(245,158,11,0.4)" },
  concern: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "CONCERN",      glow: "0 0 20px rgba(249,115,22,0.4)" },
  sepsis:  { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "SEPSIS ALERT", glow: "0 0 20px rgba(239,68,68,0.6)" },
};

// ─── SIMULATOR (runs in-browser, no backend needed for demo) ─────────────────
function createPatients() {
  return [
    { patientId: "ICU-101", name: "James Thornton", age: 67, ward: "ICU-A", profile: "deteriorating",
      base: { hr: 95, temp: 37.8, spo2: 95, rr: 20, sys: 105, dia: 70, wbc: 11000, lactate: 1.5, cr: 1.1 } },
    { patientId: "ICU-102", name: "Maria Santos", age: 54, ward: "ICU-A", profile: "stable",
      base: { hr: 75, temp: 37.1, spo2: 98, rr: 16, sys: 120, dia: 80, wbc: 8000, lactate: 1.0, cr: 0.9 } },
    { patientId: "ICU-103", name: "Robert Chen", age: 72, ward: "ICU-B", profile: "critical",
      base: { hr: 125, temp: 39.2, spo2: 88, rr: 30, sys: 85, dia: 55, wbc: 18000, lactate: 3.5, cr: 2.8 } },
    { patientId: "ICU-104", name: "Sarah Williams", age: 45, ward: "ICU-B", profile: "recovering",
      base: { hr: 82, temp: 37.4, spo2: 96, rr: 18, sys: 115, dia: 75, wbc: 9500, lactate: 1.2, cr: 1.0 } },
    { patientId: "ICU-105", name: "Ahmed Al-Rashid", age: 61, ward: "ICU-C", profile: "watch",
      base: { hr: 102, temp: 38.1, spo2: 93, rr: 23, sys: 98, dia: 65, wbc: 13500, lactate: 2.1, cr: 1.4 } },
  ].map(p => ({ ...p, tick: 0, history: [] }));
}

function jitter(val, range) {
  return +(val + (Math.random() - 0.5) * range).toFixed(1);
}

function evolvePatient(p) {
  const t = p.tick / 60;
  const wave = Math.sin(p.tick / 10);
  const b = p.base;
  let v;
  if (p.profile === "deteriorating") {
    const prog = Math.min(t, 1);
    v = { hr: jitter(b.hr + prog*25,5), temp: jitter(b.temp + prog*1.2,0.2), spo2: jitter(b.spo2 - prog*7,1),
          rr: jitter(b.rr + prog*10,2), sys: Math.round(b.sys - prog*20), dia: Math.round(b.dia - prog*12),
          wbc: Math.round(b.wbc + prog*8000), lactate: jitter(b.lactate + prog*2.5,0.2), cr: jitter(b.cr + prog*1.5,0.1) };
  } else if (p.profile === "stable") {
    v = { hr: jitter(b.hr,4), temp: jitter(b.temp,0.15), spo2: jitter(b.spo2,0.5),
          rr: jitter(b.rr,1), sys: Math.round(jitter(b.sys,5)), dia: Math.round(jitter(b.dia,3)),
          wbc: Math.round(jitter(b.wbc,300)), lactate: jitter(b.lactate,0.1), cr: jitter(b.cr,0.05) };
  } else if (p.profile === "critical") {
    v = { hr: jitter(b.hr + wave*10,6), temp: jitter(b.temp + wave*0.4,0.3), spo2: jitter(b.spo2 + wave*3,1.5),
          rr: jitter(b.rr + wave*4,2), sys: Math.round(b.sys + wave*8), dia: Math.round(b.dia + wave*5),
          wbc: Math.round(jitter(b.wbc,800)), lactate: jitter(b.lactate + wave*0.5,0.2), cr: jitter(b.cr,0.1) };
  } else if (p.profile === "recovering") {
    const prog = Math.min(t,1);
    v = { hr: jitter(b.hr - prog*8,3), temp: jitter(b.temp - prog*0.5,0.15), spo2: jitter(b.spo2 + prog*2,0.5),
          rr: jitter(b.rr - prog*2,1), sys: Math.round(b.sys + prog*5), dia: Math.round(b.dia + prog*3),
          wbc: Math.round(b.wbc - prog*1500), lactate: jitter(b.lactate - prog*0.3,0.1), cr: jitter(b.cr - prog*0.1,0.05) };
  } else { // watch
    v = { hr: jitter(b.hr + wave*8,4), temp: jitter(b.temp + wave*0.3,0.2), spo2: jitter(b.spo2 + wave*2,1),
          rr: jitter(b.rr + wave*3,1.5), sys: Math.round(b.sys + wave*6), dia: Math.round(b.dia + wave*4),
          wbc: Math.round(jitter(b.wbc,600)), lactate: jitter(b.lactate + wave*0.3,0.15), cr: jitter(b.cr,0.08) };
  }
  // clamp
  v.hr = Math.max(40, Math.min(200, v.hr));
  v.temp = Math.max(34, Math.min(42, v.temp));
  v.spo2 = Math.max(70, Math.min(100, v.spo2));
  v.rr = Math.max(8, Math.min(45, v.rr));
  v.wbc = Math.max(1000, Math.min(50000, v.wbc));
  v.lactate = Math.max(0.5, Math.min(15, v.lactate));
  v.cr = Math.max(0.4, Math.min(10, v.cr));
  return v;
}

function calcRisk(v) {
  let score = 0, flags = [];
  const sys = v.sys || parseInt((v.bp || "120/80").split("/")[0]);
  if (v.hr > 130) { score+=20; flags.push("Severe tachycardia"); }
  else if (v.hr > 110) { score+=14; flags.push("Tachycardia"); }
  else if (v.hr > 100) { score+=8; flags.push("Mild tachycardia"); }
  if (v.temp > 39.5) { score+=18; flags.push("High fever"); }
  else if (v.temp > 38.3) { score+=12; flags.push("Fever"); }
  else if (v.temp > 38) { score+=6; flags.push("Low-grade fever"); }
  else if (v.temp < 36) { score+=15; flags.push("Hypothermia"); }
  if (v.spo2 < 88) { score+=20; flags.push("Critical hypoxemia"); }
  else if (v.spo2 < 92) { score+=14; flags.push("Hypoxemia"); }
  else if (v.spo2 < 94) { score+=7; flags.push("Borderline SpO₂"); }
  if (v.rr > 30) { score+=18; flags.push("Severe tachypnea"); }
  else if (v.rr > 25) { score+=12; flags.push("Tachypnea"); }
  else if (v.rr > 22) { score+=6; flags.push("Mild tachypnea"); }
  if (sys < 80) { score+=20; flags.push("Severe hypotension"); }
  else if (sys < 90) { score+=14; flags.push("Hypotension"); }
  else if (sys < 100) { score+=7; flags.push("Borderline BP"); }
  if (v.wbc > 20000) { score+=12; flags.push("Severe leukocytosis"); }
  else if (v.wbc > 12000) { score+=7; flags.push("Leukocytosis"); }
  else if (v.wbc < 4000) { score+=10; flags.push("Leukopenia"); }
  if (v.lactate > 4) { score+=15; flags.push("Severe lactic acidosis"); }
  else if (v.lactate > 2) { score+=9; flags.push("Elevated lactate"); }
  score = Math.min(score, 100);
  let alertLevel = "normal";
  if (score > 80) alertLevel = "sepsis";
  else if (score > 60) alertLevel = "concern";
  else if (score > 40) alertLevel = "watch";
  return { score, alertLevel, flags };
}

// ─── AI MOCK INTERPRETATION ───────────────────────────────────────────────────
function getMockAnalysis(vitals, score, note) {
  if (note) {
    const lower = note.toLowerCase();
    if (lower.includes("distress") || lower.includes("deteriorat") || lower.includes("fever"))
      return "⚠️ Clinical note indicates significant distress. Combined with current vital derangements, this patient requires urgent reassessment. Elevated inflammatory markers and hemodynamic instability suggest possible early septic shock. Recommend immediate escalation of care, blood cultures × 2, and initiation of sepsis bundle protocol within 1 hour.";
    return "📋 Clinical note reviewed. Findings are consistent with current vital signs data. Continue close monitoring and reassess in 30 minutes. Ensure adequate IV access and have resuscitation medications at bedside.";
  }
  if (score > 80) return "⚠️ HIGH SEPSIS RISK: Multiple SIRS criteria met with critical vital derangements. Hemodynamic compromise evident. IMMEDIATE: Blood cultures × 2, broad-spectrum antibiotics within 1hr, 30mL/kg IV crystalloid, vasopressors if MAP <65 mmHg. NOTIFY ATTENDING STAT.";
  if (score > 60) return "⚠️ ELEVATED CONCERN: Significant vital sign derangements present. Early sepsis criteria partially met. RECOMMEND: Blood cultures, early antibiotic consideration, increase monitoring to Q15min, prepare resuscitation access.";
  if (score > 40) return "🔶 WATCH STATUS: Borderline vital signs with mild inflammatory markers. Does not fully meet SIRS criteria yet. RECOMMEND: Q30min vitals, IV access, medication review, clinician notification for bedside assessment.";
  return "✅ LOW RISK: Vitals within acceptable ranges. No immediate sepsis indicators present. Continue routine ICU monitoring protocol. Reassess if clinical condition changes.";
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function VitalBadge({ label, value, unit, normal, warning, critical, flip = false }) {
  let color = "#10b981";
  const v = parseFloat(value);
  if (flip) {
    if (critical !== undefined && v < critical) color = "#ef4444";
    else if (warning !== undefined && v < warning) color = "#f97316";
  } else {
    if (critical !== undefined && v > critical) color = "#ef4444";
    else if (warning !== undefined && v > warning) color = "#f97316";
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2,
      borderLeft: `3px solid ${color}`, minWidth: 90
    }}>
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</span>
      <span style={{ color, fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
        {typeof value === "number" ? value.toFixed(value > 100 ? 0 : 1) : value}
        <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>{unit}</span>
      </span>
    </div>
  );
}

function RiskGauge({ score, alertLevel }) {
  const cfg = ALERT_CONFIG[alertLevel] || ALERT_CONFIG.normal;
  const angle = -135 + (score / 100) * 270;

  return (
    <div style={{ position: "relative", width: 130, height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="130" height="130" style={{ position: "absolute" }}>
        {/* Background arc */}
        <path d="M 20 100 A 45 45 0 1 1 110 100" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
        {/* Colored arc */}
        <path d="M 20 100 A 45 45 0 1 1 110 100" fill="none" stroke={cfg.color}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 212} 212`}
          style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }} />
        {/* Needle */}
        <g transform={`rotate(${angle}, 65, 65)`}>
          <line x1="65" y1="65" x2="65" y2="30" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="65" cy="65" r="5" fill={cfg.color} />
      </svg>
      <div style={{ textAlign: "center", zIndex: 1, marginTop: 10 }}>
        <div style={{ color: cfg.color, fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono', monospace", lineHeight: 1, textShadow: cfg.glow }}>
          {score}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>RISK SCORE</div>
      </div>
    </div>
  );
}

function AlertBanner({ patients }) {
  const critical = patients.filter(p => p.alertLevel === "sepsis");
  const concern = patients.filter(p => p.alertLevel === "concern");
  const watch = patients.filter(p => p.alertLevel === "watch");

  if (critical.length === 0 && concern.length === 0 && watch.length === 0) {
    return (
      <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 18px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 16 }}>🟢</span>
        <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>All patients stable — No active alerts</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
      {critical.map(p => (
        <div key={p.patientId} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
          animation: "pulse 1.5s infinite", boxShadow: "0 0 20px rgba(239,68,68,0.2)" }}>
          <span style={{ fontSize: 14 }}>🚨</span>
          <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>SEPSIS ALERT — {p.name} ({p.patientId})</span>
        </div>
      ))}
      {concern.map(p => (
        <div key={p.patientId} style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ color: "#f97316", fontSize: 12, fontWeight: 600 }}>CONCERN — {p.name} ({p.patientId})</span>
        </div>
      ))}
      {watch.map(p => (
        <div key={p.patientId} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔶</span>
          <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>WATCH — {p.name} ({p.patientId})</span>
        </div>
      ))}
    </div>
  );
}

function PatientListItem({ patient, selected, onClick }) {
  const cfg = ALERT_CONFIG[patient.alertLevel] || ALERT_CONFIG.normal;
  return (
    <div onClick={onClick} style={{
      cursor: "pointer", padding: "12px 14px", borderRadius: 10, marginBottom: 6,
      background: selected ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
      border: selected ? `1px solid ${cfg.color}40` : "1px solid rgba(255,255,255,0.06)",
      borderLeft: `3px solid ${cfg.color}`,
      boxShadow: selected ? cfg.glow : "none",
      transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{patient.name}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{patient.patientId} · {patient.ward} · Age {patient.age}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: cfg.color, fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{patient.score}</div>
          <div style={{ color: cfg.color, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>{cfg.label}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${patient.score}%`, background: cfg.color, borderRadius: 2,
          boxShadow: `0 0 8px ${cfg.color}`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function MiniChart({ data, dataKey, color, label }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      <ResponsiveContainer width="100%" height={65}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            fill={`url(#grad-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClinicalNotesPanel({ patient, onAnalyze }) {
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!note.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const result = getMockAnalysis(patient?.vitals, patient?.score, note);
    setAnalysis(result);
    setLoading(false);
    if (onAnalyze) onAnalyze(result);
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>
        🩺 Clinical Notes Analyzer
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Enter clinical observations... e.g. 'Patient showing increased respiratory distress and elevated temperature.'"
        style={{
          width: "100%", minHeight: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 12, resize: "vertical",
          fontFamily: "system-ui", outline: "none", boxSizing: "border-box"
        }}
      />
      <button onClick={handleAnalyze} disabled={!note.trim() || loading} style={{
        marginTop: 10, background: loading ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.7)",
        border: "1px solid rgba(99,102,241,0.5)", color: "#fff", borderRadius: 7,
        padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: note.trim() && !loading ? "pointer" : "not-allowed",
        transition: "all 0.2s"
      }}>
        {loading ? "⚡ Analyzing..." : "⚡ AI Analyze"}
      </button>
      {analysis && (
        <div style={{ marginTop: 14, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ color: "rgba(99,102,241,0.8)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>AI Clinical Interpretation</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.6 }}>{analysis}</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("ICU-101");
  const [activeTab, setActiveTab] = useState("overview");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const patientsRef = useRef(createPatients());
  const tickRef = useRef(0);

  // Simulate tick
  useEffect(() => {
    const init = patientsRef.current.map(p => {
      const v = evolvePatient(p);
      const { score, alertLevel, flags } = calcRisk(v);
      const snap = { ...v, bp: `${v.sys}/${v.dia}`, score, alertLevel, flags, ts: Date.now() };
      p.history.push(snap);
      return { patientId: p.patientId, name: p.name, age: p.age, ward: p.ward, profile: p.profile, ...snap, history: [snap] };
    });
    setPatients(init);

    const interval = setInterval(() => {
      tickRef.current += 1;
      setPatients(prev => {
        return patientsRef.current.map((p, i) => {
          p.tick = tickRef.current;
          const v = evolvePatient(p);
          const { score, alertLevel, flags } = calcRisk(v);
          const snap = { ...v, bp: `${v.sys}/${v.dia}`, score, alertLevel, flags, ts: Date.now() };
          p.history.push(snap);
          if (p.history.length > 30) p.history.shift();
          return { patientId: p.patientId, name: p.name, age: p.age, ward: p.ward, profile: p.profile, ...snap, history: [...p.history] };
        });
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const selected = patients.find(p => p.patientId === selectedId) || patients[0];
  const cfg = selected ? (ALERT_CONFIG[selected.alertLevel] || ALERT_CONFIG.normal) : ALERT_CONFIG.normal;

  const handleQuickAnalyze = async () => {
    if (!selected) return;
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setAiAnalysis(getMockAnalysis(selected, selected.score, ""));
    setAiLoading(false);
  };

  const historyForChart = (selected?.history || []).map((h, i) => ({
    t: i, hr: h.hr, temp: h.temp, spo2: h.spo2, rr: h.rr, risk: h.score
  }));

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0d14", color: "#fff",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      padding: 0
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0d14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
            🫀
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>SepsisGuard <span style={{ color: "rgba(99,102,241,0.8)", fontWeight: 400 }}>AI</span></div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>ICU Real-Time Monitoring System</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "blink 2s infinite", boxShadow: "0 0 6px #10b981" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>LIVE</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace" }}>
            {new Date().toLocaleTimeString()}
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7,
            padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {patients.filter(p => p.alertLevel !== "normal").length} Active Alerts
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <div style={{ padding: "16px 24px 0" }}>
        <AlertBanner patients={patients} />
      </div>

      {/* Main Layout */}
      <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 0 }}>

        {/* Patient List Sidebar */}
        <div style={{ width: 260, flexShrink: 0, background: "rgba(255,255,255,0.01)", borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 12px", overflowY: "auto" }}>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "monospace", marginBottom: 10, paddingLeft: 4 }}>
            Patients ({patients.length})
          </div>
          {patients.map(p => (
            <PatientListItem key={p.patientId} patient={p} selected={selectedId === p.patientId}
              onClick={() => setSelectedId(p.patientId)} />
          ))}

          {/* Ward Summary */}
          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "monospace" }}>Ward Summary</div>
            {["ICU-A","ICU-B","ICU-C"].map(ward => {
              const wp = patients.filter(p => p.ward === ward);
              const critical = wp.filter(p => p.alertLevel === "sepsis" || p.alertLevel === "concern").length;
              return (
                <div key={ward} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{ward}</span>
                  <span style={{ color: critical > 0 ? "#ef4444" : "#10b981", fontSize: 11, fontFamily: "monospace" }}>
                    {critical > 0 ? `${critical} alert${critical > 1 ? "s" : ""}` : "stable"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {selected && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {/* Patient Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`,
                    border: `2px solid ${cfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20 }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      {selected.patientId} · {selected.ward} · Age {selected.age} · 
                      <span style={{ color: cfg.color, fontWeight: 600, marginLeft: 4 }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
                {/* Tab nav */}
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3 }}>
                  {["overview", "charts", "ai"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: activeTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
                      color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.4)",
                      border: "none", cursor: "pointer", textTransform: "capitalize", letterSpacing: "0.04em"
                    }}>{tab}</button>
                  ))}
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div>
                  {/* Risk + Vitals Row */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                    {/* Risk Gauge */}
                    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${cfg.color}30`,
                      borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 8, boxShadow: selected.alertLevel === "sepsis" ? cfg.glow : "none" }}>
                      <RiskGauge score={selected.score} alertLevel={selected.alertLevel} />
                      <div style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, borderRadius: 6,
                        padding: "4px 12px", fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: "0.08em" }}>
                        {cfg.label}
                      </div>
                    </div>

                    {/* Vitals Grid */}
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, alignContent: "start" }}>
                      <VitalBadge label="Heart Rate" value={selected.hr} unit="bpm" warning={100} critical={120} />
                      <VitalBadge label="Temperature" value={selected.temp} unit="°C" warning={38} critical={39.5} />
                      <VitalBadge label="SpO₂" value={selected.spo2} unit="%" warning={94} critical={92} flip />
                      <VitalBadge label="Resp. Rate" value={selected.rr} unit="/min" warning={22} critical={28} />
                      <VitalBadge label="Blood Press." value={selected.bp} unit="mmHg" />
                      <VitalBadge label="WBC" value={(selected.wbc/1000).toFixed(1)} unit="k/μL" warning={12} critical={18} />
                      <VitalBadge label="Lactate" value={selected.lactate} unit="mmol/L" warning={2} critical={4} />
                      <VitalBadge label="Creatinine" value={selected.cr} unit="mg/dL" warning={1.5} critical={2.5} />
                    </div>
                  </div>

                  {/* Flags */}
                  {selected.flags && selected.flags.length > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>
                        Risk Flags
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selected.flags.map((flag, i) => (
                          <span key={i} style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
                            color: cfg.color, fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick mini charts */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <MiniChart data={historyForChart} dataKey="hr" color="#f87171" label="Heart Rate Trend" />
                    <MiniChart data={historyForChart} dataKey="spo2" color="#60a5fa" label="SpO₂ Trend" />
                    <MiniChart data={historyForChart} dataKey="temp" color="#fb923c" label="Temperature Trend" />
                    <MiniChart data={historyForChart} dataKey="risk" color={cfg.color} label="Risk Score Trend" />
                  </div>
                </div>
              )}

              {/* CHARTS TAB */}
              {activeTab === "charts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { key: "hr", label: "Heart Rate (bpm)", color: "#f87171", refLine: 100 },
                    { key: "temp", label: "Temperature (°C)", color: "#fb923c", refLine: 38 },
                    { key: "spo2", label: "SpO₂ (%)", color: "#60a5fa", refLine: 94 },
                    { key: "rr", label: "Respiratory Rate (/min)", color: "#a78bfa", refLine: 22 },
                    { key: "risk", label: "Sepsis Risk Score", color: cfg.color, refLine: 60 },
                  ].map(({ key, label, color, refLine }) => (
                    <div key={key} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "monospace" }}>{label}</div>
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={historyForChart} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="t" tick={false} axisLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                            labelStyle={{ color: "rgba(255,255,255,0.4)" }} itemStyle={{ color }} />
                          <Area type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#g-${key})`} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}

              {/* AI TAB */}
              {activeTab === "ai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Quick AI Analysis */}
                  <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 18 }}>
                    <div style={{ color: "rgba(99,102,241,0.8)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>
                      ⚡ AI Vitals Interpretation
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      {[
                        { l: "HR", v: `${selected.hr} bpm` }, { l: "Temp", v: `${selected.temp}°C` },
                        { l: "SpO₂", v: `${selected.spo2}%` }, { l: "RR", v: `${selected.rr}/min` },
                        { l: "BP", v: selected.bp }, { l: "WBC", v: `${(selected.wbc/1000).toFixed(1)}k` },
                        { l: "Risk", v: `${selected.score}/100` },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                          <span style={{ color: "rgba(255,255,255,0.35)" }}>{l}: </span>
                          <span style={{ color: "#fff", fontFamily: "monospace" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleQuickAnalyze} disabled={aiLoading} style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.6))",
                      border: "1px solid rgba(99,102,241,0.4)", color: "#fff", borderRadius: 8,
                      padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer"
                    }}>
                      {aiLoading ? "🔄 Analyzing vitals..." : "🤖 Generate AI Analysis"}
                    </button>
                    {aiAnalysis && (
                      <div style={{ marginTop: 14, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 14,
                        borderLeft: `3px solid ${cfg.color}` }}>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.7 }}>{aiAnalysis}</div>
                      </div>
                    )}
                  </div>

                  {/* Clinical Notes Analyzer */}
                  <ClinicalNotesPanel patient={selected} />

                  {/* SOFA-like Breakdown */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: "monospace" }}>
                      Risk Factor Breakdown
                    </div>
                    {[
                      { label: "Cardiovascular", score: selected.hr > 120 ? 3 : selected.hr > 100 ? 2 : 0, max: 3 },
                      { label: "Respiratory", score: selected.rr > 28 ? 3 : selected.rr > 22 ? 2 : selected.spo2 < 94 ? 1 : 0, max: 3 },
                      { label: "Temperature", score: selected.temp > 39.5 ? 3 : selected.temp > 38.3 ? 2 : selected.temp > 38 ? 1 : 0, max: 3 },
                      { label: "Hemodynamics", score: selected.sys < 80 ? 3 : selected.sys < 90 ? 2 : selected.sys < 100 ? 1 : 0, max: 3 },
                      { label: "Inflammation", score: selected.wbc > 20000 ? 3 : selected.wbc > 12000 ? 2 : selected.wbc < 4000 ? 2 : 0, max: 3 },
                    ].map(({ label, score: s, max }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{label}</span>
                          <span style={{ color: s >= 2 ? "#ef4444" : s >= 1 ? "#f59e0b" : "#10b981", fontSize: 12, fontFamily: "monospace" }}>
                            {s}/{max}
                          </span>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(s/max)*100}%`,
                            background: s >= 2 ? "#ef4444" : s >= 1 ? "#f59e0b" : "#10b981",
                            borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
