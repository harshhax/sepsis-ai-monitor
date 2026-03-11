const express = require('express');
const router = express.Router();
const { patientStates, PATIENTS } = require('../simulator');
const { calculateRiskScore } = require('../ai/riskAnalyzer');

// GET all active alerts
router.get('/', (_req, res) => {
  const alerts = [];

  PATIENTS.forEach((p) => {
    const state = patientStates[p.patientId];
    if (!state) return;
    const { score, alertLevel, flags } = calculateRiskScore(state.vitals);

    if (alertLevel !== 'normal') {
      alerts.push({
        patientId: p.patientId,
        name: p.name,
        ward: p.ward,
        score,
        alertLevel,
        flags,
        timestamp: new Date(),
      });
    }
  });

  alerts.sort((a, b) => b.score - a.score);
  res.json({ success: true, data: alerts });
});

module.exports = router;
