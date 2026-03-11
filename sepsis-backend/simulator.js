const { calculateRiskScore } = require('./ai/riskAnalyzer');

// Initial patient profiles
const PATIENTS = [
  {
    patientId: 'ICU-101',
    name: 'James Thornton',
    age: 67,
    ward: 'ICU-A',
    profile: 'deteriorating', // Will trend toward sepsis
  },
  {
    patientId: 'ICU-102',
    name: 'Maria Santos',
    age: 54,
    ward: 'ICU-A',
    profile: 'stable',
  },
  {
    patientId: 'ICU-103',
    name: 'Robert Chen',
    age: 72,
    ward: 'ICU-B',
    profile: 'critical',
  },
  {
    patientId: 'ICU-104',
    name: 'Sarah Williams',
    age: 45,
    ward: 'ICU-B',
    profile: 'recovering',
  },
  {
    patientId: 'ICU-105',
    name: 'Ahmed Al-Rashid',
    age: 61,
    ward: 'ICU-C',
    profile: 'watch',
  },
];

// Track state for each patient
const patientStates = {};

function initPatientState(patient) {
  const baseVitals = {
    deteriorating: {
      heartRate: 95, temperature: 37.8, spo2: 95, respiratoryRate: 20,
      bloodPressure: '105/70', wbc: 11000, lactate: 1.5, creatinine: 1.1,
    },
    stable: {
      heartRate: 75, temperature: 37.1, spo2: 98, respiratoryRate: 16,
      bloodPressure: '120/80', wbc: 8000, lactate: 1.0, creatinine: 0.9,
    },
    critical: {
      heartRate: 125, temperature: 39.2, spo2: 88, respiratoryRate: 30,
      bloodPressure: '85/55', wbc: 18000, lactate: 3.5, creatinine: 2.8,
    },
    recovering: {
      heartRate: 82, temperature: 37.4, spo2: 96, respiratoryRate: 18,
      bloodPressure: '115/75', wbc: 9500, lactate: 1.2, creatinine: 1.0,
    },
    watch: {
      heartRate: 102, temperature: 38.1, spo2: 93, respiratoryRate: 23,
      bloodPressure: '98/65', wbc: 13500, lactate: 2.1, creatinine: 1.4,
    },
  };

  patientStates[patient.patientId] = {
    ...patient,
    vitals: { ...baseVitals[patient.profile] },
    tick: 0,
    history: [],
  };
}

PATIENTS.forEach(initPatientState);

function jitter(val, range) {
  return +(val + (Math.random() - 0.5) * range).toFixed(1);
}

function evolveVitals(state) {
  const { profile, vitals, tick } = state;
  const v = { ...vitals };

  // Profile-specific evolution
  if (profile === 'deteriorating') {
    // Slowly deteriorate over time with some randomness
    const progress = Math.min(tick / 60, 1); // 0 to 1 over ~5 minutes
    v.heartRate = jitter(95 + progress * 25, 5);
    v.temperature = jitter(37.8 + progress * 1.2, 0.2);
    v.spo2 = jitter(95 - progress * 7, 1);
    v.respiratoryRate = jitter(20 + progress * 10, 2);
    const sys = Math.round(105 - progress * 20);
    const dia = Math.round(70 - progress * 12);
    v.bloodPressure = `${sys}/${dia}`;
    v.wbc = Math.round(11000 + progress * 8000);
    v.lactate = jitter(1.5 + progress * 2.5, 0.2);
    v.creatinine = jitter(1.1 + progress * 1.5, 0.1);
  } else if (profile === 'stable') {
    v.heartRate = jitter(75, 4);
    v.temperature = jitter(37.1, 0.15);
    v.spo2 = jitter(98, 0.5);
    v.respiratoryRate = jitter(16, 1);
    v.bloodPressure = `${Math.round(jitter(120, 5))}/${Math.round(jitter(80, 3))}`;
    v.wbc = Math.round(jitter(8000, 300));
    v.lactate = jitter(1.0, 0.1);
    v.creatinine = jitter(0.9, 0.05);
  } else if (profile === 'critical') {
    // Fluctuating critically
    const wave = Math.sin(tick / 8) * 0.5;
    v.heartRate = jitter(125 + wave * 10, 6);
    v.temperature = jitter(39.2 + wave * 0.4, 0.3);
    v.spo2 = jitter(88 + wave * 3, 1.5);
    v.respiratoryRate = jitter(30 + wave * 4, 2);
    const sys = Math.round(85 + wave * 8);
    const dia = Math.round(55 + wave * 5);
    v.bloodPressure = `${sys}/${dia}`;
    v.wbc = Math.round(jitter(18000, 800));
    v.lactate = jitter(3.5 + wave * 0.5, 0.2);
    v.creatinine = jitter(2.8, 0.1);
  } else if (profile === 'recovering') {
    // Gradually improving
    const progress = Math.min(tick / 60, 1);
    v.heartRate = jitter(82 - progress * 8, 3);
    v.temperature = jitter(37.4 - progress * 0.5, 0.15);
    v.spo2 = jitter(96 + progress * 2, 0.5);
    v.respiratoryRate = jitter(18 - progress * 2, 1);
    v.bloodPressure = `${Math.round(115 + progress * 5)}/${Math.round(75 + progress * 3)}`;
    v.wbc = Math.round(9500 - progress * 1500);
    v.lactate = jitter(1.2 - progress * 0.3, 0.1);
    v.creatinine = jitter(1.0 - progress * 0.1, 0.05);
  } else if (profile === 'watch') {
    // Fluctuating borderline
    const wave = Math.sin(tick / 12);
    v.heartRate = jitter(102 + wave * 8, 4);
    v.temperature = jitter(38.1 + wave * 0.3, 0.2);
    v.spo2 = jitter(93 + wave * 2, 1);
    v.respiratoryRate = jitter(23 + wave * 3, 1.5);
    const sys = Math.round(98 + wave * 6);
    const dia = Math.round(65 + wave * 4);
    v.bloodPressure = `${sys}/${dia}`;
    v.wbc = Math.round(jitter(13500, 600));
    v.lactate = jitter(2.1 + wave * 0.3, 0.15);
    v.creatinine = jitter(1.4, 0.08);
  }

  // Clamp values to realistic ranges
  v.heartRate = Math.max(40, Math.min(200, v.heartRate));
  v.temperature = Math.max(34, Math.min(42, v.temperature));
  v.spo2 = Math.max(70, Math.min(100, v.spo2));
  v.respiratoryRate = Math.max(8, Math.min(45, v.respiratoryRate));
  v.wbc = Math.max(1000, Math.min(50000, v.wbc));
  v.lactate = Math.max(0.5, Math.min(15, v.lactate));
  v.creatinine = Math.max(0.4, Math.min(10, v.creatinine));

  return v;
}

function startSimulator(io) {
  console.log('🔄 Starting patient vitals simulator...');

  setInterval(() => {
    PATIENTS.forEach((patient) => {
      const state = patientStates[patient.patientId];
      state.tick += 1;

      const newVitals = evolveVitals(state);
      state.vitals = newVitals;

      const { score, alertLevel, flags } = calculateRiskScore(newVitals);

      const snapshot = {
        ...newVitals,
        riskScore: score,
        alertLevel,
        flags,
        timestamp: new Date(),
      };

      // Keep last 30 data points in memory
      state.history.push(snapshot);
      if (state.history.length > 30) state.history.shift();

      const payload = {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        ward: patient.ward,
        profile: patient.profile,
        vitals: snapshot,
        history: state.history,
      };

      io.emit('vitals_update', payload);
    });
  }, 2500); // Update every 2.5 seconds

  // Also send initial state immediately
  setTimeout(() => {
    PATIENTS.forEach((patient) => {
      const state = patientStates[patient.patientId];
      const { score, alertLevel, flags } = calculateRiskScore(state.vitals);
      const snapshot = { ...state.vitals, riskScore: score, alertLevel, flags, timestamp: new Date() };
      state.history.push(snapshot);

      io.emit('vitals_update', {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        ward: patient.ward,
        profile: patient.profile,
        vitals: snapshot,
        history: state.history,
      });
    });
  }, 500);
}

module.exports = { startSimulator, PATIENTS, patientStates };
