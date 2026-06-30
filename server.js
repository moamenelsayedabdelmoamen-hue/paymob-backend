Require('dotenv').config();

console.log("🔥🔥🔥 THIS IS MY SERVER.JS 🔥🔥🔥");

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('✅ server.js is the active entrypoint for this app');
console.log('📍 Registered routes: GET /, POST /subscribe, GET /health');

// Middleware: logging
app.use((req, res, next) => {
  console.log(`REQUEST ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Root route
app.get('/', (req, res) => {
  res.send(`Moamen Server 123 🔥 - live on port ${PORT}`);
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ✅ Subscribe endpoint
app.post('/subscribe', (req, res) => {
  const { name, email } = req.body || {};

  console.log('New subscription:', { name, email });

  res.status(200).json({
    success: true,
    message: 'تم الاشتراك بنجاح'
  });
});

// ❗ لازم يكون آخر حاجة
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ✅ شغل السيرفر مباشرة (مهم جدًا لـ Render)
app.listen(PORT, () => {
  console.log(`🚀 Paymob Backend Server running on port ${PORT}`);
});