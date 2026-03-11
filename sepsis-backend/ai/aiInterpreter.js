async function getAIInterpretation(vitals, clinicalNote = '') {
  // If no API key, return a mock response for demo
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return getMockInterpretation(vitals);
  }

  const prompt = buildPrompt(vitals, clinicalNote);

  try {
    // Using OpenAI GPT-4o-mini as specified
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical AI assistant helping ICU physicians assess sepsis risk. Respond concisely in 3–4 sentences with: (1) risk level assessment, (2) most concerning vital signs, (3) recommended immediate actions. Use clinical language but be direct.',
        },
        { role: 'user', content: prompt },
      ],
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error('AI API error:', err.message);
    return getMockInterpretation(vitals);
  }
}

function buildPrompt(vitals, clinicalNote) {
  const { heartRate, temperature, spo2, respiratoryRate, bloodPressure, wbc, lactate, creatinine, riskScore } = vitals;

  return `Analyze the following ICU patient data and assess sepsis risk:

VITALS:
- Heart Rate: ${heartRate} bpm
- Temperature: ${temperature}°C
- SpO₂: ${spo2}%
- Respiratory Rate: ${respiratoryRate} breaths/min
- Blood Pressure: ${bloodPressure} mmHg
- WBC: ${wbc?.toLocaleString() || 'N/A'} cells/μL
- Lactate: ${lactate || 'N/A'} mmol/L
- Creatinine: ${creatinine || 'N/A'} mg/dL
- Calculated Risk Score: ${riskScore}/100

${clinicalNote ? `CLINICAL NOTES: ${clinicalNote}` : ''}

Provide: risk level, most alarming findings, and recommended immediate actions.`;
}

function getMockInterpretation(vitals) {
  const { heartRate, temperature, spo2, respiratoryRate, riskScore } = vitals;

  if (riskScore > 80) {
    return `⚠️ HIGH SEPSIS RISK: This patient presents with multiple SIRS criteria including tachycardia (HR ${heartRate}), fever (${temperature}°C), and hypoxemia (SpO₂ ${spo2}%). Tachypnea at ${respiratoryRate} breaths/min further supports systemic inflammatory response. IMMEDIATE ACTION: Initiate sepsis bundle — blood cultures × 2, broad-spectrum antibiotics within 1 hour, IV fluid resuscitation 30mL/kg crystalloid, and vasopressors if MAP <65 mmHg. Alert attending physician STAT.`;
  } else if (riskScore > 60) {
    return `⚠️ ELEVATED CONCERN: Patient demonstrates concerning vital trends with HR ${heartRate} bpm and RR ${respiratoryRate}. Temperature of ${temperature}°C and SpO₂ of ${spo2}% warrant close monitoring. RECOMMENDATION: Obtain blood cultures, consider early antibiotic therapy, increase monitoring frequency to every 15 minutes, and prepare for potential rapid deterioration.`;
  } else if (riskScore > 40) {
    return `🔶 WATCH STATUS: Mild derangements noted — HR ${heartRate}, Temp ${temperature}°C. SpO₂ at ${spo2}% is borderline acceptable. Patient does not yet meet full SIRS criteria but trends are concerning. RECOMMENDATION: Monitor closely every 30 minutes, ensure IV access, and review medication list for potential contributors.`;
  } else {
    return `✅ LOW RISK: Current vitals are within acceptable ranges. HR ${heartRate}, Temp ${temperature}°C, SpO₂ ${spo2}%, RR ${respiratoryRate}. No immediate sepsis indicators. Continue routine monitoring per ICU protocol and reassess if clinical condition changes.`;
  }
}

module.exports = { getAIInterpretation };
