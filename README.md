# 🫀 SepsisGuard AI — Real-Time ICU Sepsis Detection System

> Hackathon prototype for AI-assisted early sepsis detection in ICU settings.

---

## 🚀 Quick Start

### Backend

```bash
cd sepsis-backend
cp .env.example .env
# Edit .env with your MongoDB URI and OpenAI API key
npm install
npm run dev
```

### Frontend (Vite + React)

```bash
cd sepsis-frontend
cp .env.example .env
# Set VITE_BACKEND_URL=http://localhost:4000 in .env
npm install
npm run dev
```

Open http://localhost:5173

---

## 🏗️ Architecture

```
Patient Simulator (backend) 
  → Socket.io (real-time)
    → React Dashboard
      → Recharts visualizations
      → AI Risk Interpretation (GPT-4o-mini)
      → Alert System

REST API (Express)
  → /api/patients     — Patient state
  → /api/alerts       — Active alerts
  → /api/ai/analyze   — AI vitals interpretation
  → /api/ai/notes     — Clinical notes analysis
```

---

## 📁 Folder Structure

```
sepsis-ai-monitor/
├── sepsis-backend/
│   ├── server.js               # Express + Socket.io entry point
│   ├── simulator.js            # Patient vitals simulator
│   ├── package.json
│   ├── .env.example
│   ├── routes/
│   │   ├── patients.js
│   │   ├── alerts.js
│   │   └── ai.js
│   ├── models/
│   │   └── Patient.js          # Mongoose schema
│   └── ai/
│       ├── riskAnalyzer.js     # Scoring algorithm (0-100)
│       └── aiInterpreter.js    # GPT-4o-mini integration
│
└── sepsis-frontend/
    ├── src/
    │   ├── main.jsx
    │   └── components/
    │       ├── Dashboard.jsx   # Main dashboard
    │       ├── PatientCard.jsx
    │       ├── AlertsPanel.jsx
    │       └── Charts.jsx
    ├── package.json
    └── .env.example
```

---

## 🧠 Risk Scoring Algorithm

Scoring is based on SOFA/qSOFA-inspired criteria:

| Vital Sign      | Threshold     | Points |
|-----------------|---------------|--------|
| Heart Rate      | > 100         | +8     |
| Heart Rate      | > 110         | +14    |
| Heart Rate      | > 130         | +20    |
| Temperature     | > 38°C        | +6     |
| Temperature     | > 38.3°C      | +12    |
| Temperature     | > 39.5°C      | +18    |
| SpO₂            | < 94%         | +7     |
| SpO₂            | < 92%         | +14    |
| SpO₂            | < 88%         | +20    |
| Resp. Rate      | > 22          | +6     |
| Resp. Rate      | > 25          | +12    |
| Resp. Rate      | > 30          | +18    |
| Systolic BP     | < 100         | +7     |
| Systolic BP     | < 90          | +14    |
| Systolic BP     | < 80          | +20    |
| WBC             | > 12,000      | +7     |
| WBC             | > 20,000      | +12    |
| Lactate         | > 2 mmol/L    | +9     |
| Lactate         | > 4 mmol/L    | +15    |

**Alert Levels:**
- ✅ Normal: score ≤ 40
- 🔶 Watch: score > 40
- ⚠️ Concern: score > 60
- 🚨 Sepsis Alert: score > 80

---

## 🤖 AI Layer

- **Vitals Analysis**: Sends patient vitals to GPT-4o-mini, returns clinical interpretation
- **Clinical Notes**: Doctor inputs free-text notes, AI returns risk assessment
- **Fallback**: Smart mock responses if no API key (demo-ready)

**Set your OpenAI key:**
```env
OPENAI_API_KEY=sk-...
```

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd sepsis-frontend
npm run build
# Deploy dist/ to Vercel
# Set env: VITE_BACKEND_URL=https://your-backend.render.com
```

### Backend → Render
- Build command: `npm install`
- Start command: `node server.js`
- Set env vars: `MONGODB_URI`, `OPENAI_API_KEY`, `FRONTEND_URL`

---

## 🏥 Simulated Patients

| ID      | Name           | Profile       | Description              |
|---------|----------------|---------------|--------------------------|
| ICU-101 | James Thornton | Deteriorating | Trending toward sepsis   |
| ICU-102 | Maria Santos   | Stable        | Normal vitals            |
| ICU-103 | Robert Chen    | Critical      | Active sepsis indicators |
| ICU-104 | Sarah Williams | Recovering    | Improving post-treatment |
| ICU-105 | Ahmed Al-Rashid| Watch         | Borderline monitoring    |

---

## ⚡ Features

- [x] Real-time vitals simulation via Socket.io (2.5s updates)
- [x] Risk scoring algorithm (0–100)
- [x] 4-tier alert system (Normal / Watch / Concern / Sepsis)
- [x] AI vitals interpretation (GPT-4o-mini)
- [x] Clinical notes analyzer
- [x] Live trend charts (Recharts)
- [x] Risk factor breakdown (SOFA-inspired)
- [x] Multi-patient ICU dashboard
- [x] MongoDB persistence
- [x] Demo mode (works without API key)

---

> ⚠️ **Disclaimer**: This is a hackathon prototype only. Not for clinical use.
