require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { notFound, errorHandler } = require('./middleware/errorHandler');

for (const key of ['JWT_SECRET', 'DB_USER', 'DB_NAME']) {
  if (!process.env[key]) { console.error(`Missing ${key} in .env - copy .env.example to .env and fill it in.`); process.exit(1); }
}

const app = express();

// Helmet sets safe default security headers (CSP, X-Content-Type-Options, etc.).
// upgrade-insecure-requests is disabled so the app also works over plain http://localhost in Safari.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true })); // which sites may call the API
app.use(express.json({ limit: '100kb' }));

// API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/claims', require('./routes/claimRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api', notFound);

// Static files: uploaded images and the frontend (so one server serves everything on one port)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Lost & Found running at http://localhost:${PORT}`));
}
module.exports = app;
