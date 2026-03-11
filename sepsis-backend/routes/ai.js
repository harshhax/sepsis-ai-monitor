const express = require('express');
const router = express.Router();
const { getAIInterpretation } = require('../ai/aiInterpreter');
const { calculateRiskScore } = require('../ai/riskAnalyzer');
const { patientStates } = require('../simulator');

// POST analyze vitals + optional clinical note
router.post('/analyze', async (req, res) => {
  try {
    const { patientId, clinicalNote } = req.body;

    let vitals = req.body.vitals;

    // If patientId provided, use current state
    if (patientId && patientStates[patientId]) {
      const state = patientStates[patientId];
      const { score, alertLevel } = calculateRiskScore(state.vitals);
      vitals = { ...state.vitals, riskScore: score, alertLevel };
    }

    if (!vitals) {
      return res.status(400).json({ success: false, error: 'Provide vitals or patientId' });
    }

    const analysis = await getAIInterpretation(vitals, clinicalNote || '');

    res.json({
      success: true,
      data: {
        analysis,
        vitals,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST analyze clinical note only
router.post('/notes', async (req, res) => {
  try {
    const { note, patientId } = req.body;
    if (!note) return res.status(400).json({ success: false, error: 'Note is required' });

    let vitals = {};
    if (patientId && patientStates[patientId]) {
      vitals = patientStates[patientId].vitals;
      const { score } = calculateRiskScore(vitals);
      vitals.riskScore = score;
    }

    const analysis = await getAIInterpretation(vitals, note);

    res.json({
      success: true,
      data: { analysis, note, timestamp: new Date() },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
