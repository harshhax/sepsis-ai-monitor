const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const patientRoutes = require('./routes/patients');
const alertRoutes = require('./routes/alerts');
const aiRoutes = require('./routes/ai');
const { startSimulator } = require('./simulator');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Attach io to req
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.use('/api/patients', patientRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sepsis_monitor')
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      startSimulator(io);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    // Start server anyway for demo without DB
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (no DB)`);
      startSimulator(io);
    });
  });

module.exports = { app, io };
