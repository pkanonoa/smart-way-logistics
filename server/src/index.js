const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');

dotenv.config();

const authRoutes       = require('./routes/auth');
const staffRoutes      = require('./routes/staff');
const vehiclesRoutes   = require('./routes/vehicles');
const attendanceRoutes = require('./routes/attendance');
const waybillsRoutes   = require('./routes/waybills');
const salariesRoutes   = require('./routes/salaries');
const dailyLogsRoutes  = require('./routes/dailyLogs');
const publicRoutes     = require('./routes/public');
const dailyCollectionsRoutes = require('./routes/dailyCollections');
const paymentsRoutes   = require('./routes/payments');
const dashboardRoutes  = require('./routes/dashboard');
const reportsRoutes    = require('./routes/reports');
const usersRoutes      = require('./routes/users');

const { authenticateToken, requireRole } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// Global write block middleware for viewer role
const requireWriteAccess = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.user && req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied. View-only access allowed for viewers.' });
    }
  }
  next();
};

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', service: 'Smart Way Logistics API', timestamp: new Date().toISOString() })
);

app.use('/api/auth',       authRoutes);
app.use('/api/public',    publicRoutes); // No auth

// Authenticate all remaining /api routes and enforce write blocks
app.use('/api', authenticateToken);
app.use('/api', requireWriteAccess);

app.use('/api/staff',      staffRoutes);
app.use('/api/vehicles',   vehiclesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/waybills',   waybillsRoutes);
app.use('/api/salaries',   salariesRoutes);
app.use('/api/daily-logs', dailyLogsRoutes);
app.use('/api/daily-collections', dailyCollectionsRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/payments',   paymentsRoutes);
app.use('/api',            paymentsRoutes);
app.use('/api/users',      requireRole('admin'), usersRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Smart Way Logistics API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
