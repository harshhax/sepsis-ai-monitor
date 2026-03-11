/**
 * Sepsis Risk Scoring Engine
 * Based on SOFA / qSOFA inspired scoring for prototype purposes.
 * Returns a score 0–100 and alert level.
 */

function calculateRiskScore(vitals) {
  const {
    heartRate,
    temperature,
    spo2,
    respiratoryRate,
    bloodPressure,
    wbc,
    lactate,
    creatinine,
  } = vitals;

  let score = 0;
  const flags = [];

  // Parse systolic BP
  let systolic = 120;
  if (bloodPressure && bloodPressure.includes('/')) {
    systolic = parseInt(bloodPressure.split('/')[0], 10);
  }

  // Heart Rate scoring
  if (heartRate > 130) { score += 20; flags.push('Severe tachycardia (HR>130)'); }
  else if (heartRate > 110) { score += 14; flags.push('Tachycardia (HR>110)'); }
  else if (heartRate > 100) { score += 8; flags.push('Mild tachycardia (HR>100)'); }

  // Temperature scoring
  if (temperature > 39.5) { score += 18; flags.push('High fever (>39.5°C)'); }
  else if (temperature > 38.3) { score += 12; flags.push('Fever (>38.3°C)'); }
  else if (temperature > 38) { score += 6; flags.push('Low-grade fever (>38°C)'); }
  else if (temperature < 36) { score += 15; flags.push('Hypothermia (<36°C)'); }

  // SpO2 scoring
  if (spo2 < 88) { score += 20; flags.push('Critical hypoxemia (SpO2<88%)'); }
  else if (spo2 < 92) { score += 14; flags.push('Hypoxemia (SpO2<92%)'); }
  else if (spo2 < 94) { score += 7; flags.push('Borderline SpO2 (<94%)'); }

  // Respiratory Rate scoring
  if (respiratoryRate > 30) { score += 18; flags.push('Severe tachypnea (RR>30)'); }
  else if (respiratoryRate > 25) { score += 12; flags.push('Tachypnea (RR>25)'); }
  else if (respiratoryRate > 22) { score += 6; flags.push('Mild tachypnea (RR>22)'); }

  // Blood Pressure scoring
  if (systolic < 80) { score += 20; flags.push('Severe hypotension (<80 systolic)'); }
  else if (systolic < 90) { score += 14; flags.push('Hypotension (<90 systolic)'); }
  else if (systolic < 100) { score += 7; flags.push('Borderline BP (<100 systolic)'); }

  // WBC scoring
  if (wbc > 20000) { score += 12; flags.push('Severe leukocytosis (WBC>20k)'); }
  else if (wbc > 12000) { score += 7; flags.push('Leukocytosis (WBC>12k)'); }
  else if (wbc < 4000) { score += 10; flags.push('Leukopenia (WBC<4k)'); }

  // Lactate scoring (if available)
  if (lactate !== undefined) {
    if (lactate > 4) { score += 15; flags.push('Severe lactic acidosis (>4 mmol/L)'); }
    else if (lactate > 2) { score += 9; flags.push('Elevated lactate (>2 mmol/L)'); }
  }

  // Creatinine scoring (if available)
  if (creatinine !== undefined) {
    if (creatinine > 3) { score += 8; flags.push('Acute kidney injury (Cr>3)'); }
    else if (creatinine > 1.5) { score += 4; flags.push('Elevated creatinine (Cr>1.5)'); }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine alert level
  let alertLevel = 'normal';
  if (score > 80) alertLevel = 'sepsis';
  else if (score > 60) alertLevel = 'concern';
  else if (score > 40) alertLevel = 'watch';

  return { score, alertLevel, flags };
}

module.exports = { calculateRiskScore };
