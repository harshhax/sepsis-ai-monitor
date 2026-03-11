const mongoose = require('mongoose');

const VitalsSnapshotSchema = new mongoose.Schema({
  heartRate: Number,
  temperature: Number,
  spo2: Number,
  respiratoryRate: Number,
  bloodPressure: String,
  wbc: Number,
  lactate: Number,
  creatinine: Number,
  riskScore: Number,
  alertLevel: { type: String, enum: ['normal', 'watch', 'concern', 'sepsis'], default: 'normal' },
  timestamp: { type: Date, default: Date.now },
});

const PatientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true },
    name: String,
    age: Number,
    ward: String,
    admissionDate: { type: Date, default: Date.now },
    currentVitals: VitalsSnapshotSchema,
    vitalsHistory: [VitalsSnapshotSchema],
    clinicalNotes: [
      {
        note: String,
        aiAnalysis: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', PatientSchema);
