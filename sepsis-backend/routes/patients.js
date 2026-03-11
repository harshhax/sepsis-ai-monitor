const express = require('express');
const router = express.Router();
const { patientStates, PATIENTS } = require('../simulator');
const { calculateRiskScore } = require('../ai/riskAnalyzer');

// GET all patients (current state from memory)
router.get('/', (_req, res) => {
  try {
    const patients = PATIENTS.map((p) => {
      const state = patientStates[p.patientId];
      const { score, alertLevel, flags } = calculateRiskScore(state.vitals);
      return {
        patientId: p.patientId,
        name: p.name,
        age: p.age,
        ward: p.ward,
        profile: p.profile,
        vitals: { ...state.vitals, riskScore: score, alertLevel, flags },
        history: state.history.slice(-20),
      };
    });
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single patient
router.get('/:patientId', (req, res) => {
  const state = patientStates[req.params.patientId];
  if (!state) return res.status(404).json({ success: false, error: 'Patient not found' });

  const { score, alertLevel, flags } = calculateRiskScore(state.vitals);
  res.json({
    success: true,
    data: {
      ...state,
      vitals: { ...state.vitals, riskScore: score, alertLevel, flags },
    },
  });
});

module.exports = router;
