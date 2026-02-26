const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const { generalLimiter } = require('./middleware/rateLimiter');
const { authLimiter, searchLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'https://nebaha7.github.io',          // GitHub Pages production
    'http://localhost:8000',              // local Python dev server
    'http://localhost:3001',              // local Express (self)
    'http://127.0.0.1:8000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // guard against large payloads
app.use(express.urlencoded({ extended: false }));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/flights', searchLimiter, flightRoutes);
app.use('/api/search', searchLimiter, searchRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Static Frontend ────────────────────────────────────────────────────
// In production the Express server serves the HTML/CSS/JS directly
const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));

// SPA fallback — any unmatched route returns index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

// ─── 404 & Error Handlers ────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
  ✈️  Trip4Students API
  ─────────────────────────────────
  🚀 Server running on   http://localhost:${PORT}
  🔍 Health check        http://localhost:${PORT}/api/health
  🔐 Auth endpoints      http://localhost:${PORT}/api/auth
  🛫 Search endpoint     http://localhost:${PORT}/api/flights/search
  ─────────────────────────────────
  ENV: ${process.env.NODE_ENV || 'development'}
    `);
});

module.exports = app;
