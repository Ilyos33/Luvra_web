// server.js
// Точка входа приложения LUVRA.

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Диагностический лог: какой DB-модуль загружен в рантайме
try {
  const db = require('./db/database');
  console.log('RUNTIME DIAGNOSTIC: DATABASE_URL present=', !!process.env.DATABASE_URL);
  console.log('RUNTIME DIAGNOSTIC: db.connect=', typeof db.connect === 'function', 'db.query=', typeof db.query === 'function');
} catch (e) {
  console.error('RUNTIME DIAGNOSTIC: ошибка при require db/database:', e && e.message);
}

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { checkOrigin } = require('./middleware/security');
const { isAdminAuthenticated } = require('./middleware/auth');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_string') {
  console.warn('ВНИМАНИЕ: JWT_SECRET не задан или использует значение по умолчанию. Задай надёжный секрет в .env перед запуском в проде.');
}

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', 'https://cdn.quilljs.com', "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdn.quilljs.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://customer-assets.emergentagent.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function adminPageGuard(req, res, next) {
  const p = req.path || '/';
  const publicAdminPages = ['/', '/recover', '/recover.html', '/index.html'];

  if (publicAdminPages.includes(p)) {
    if (isAdminAuthenticated(req)) {
      return res.redirect('/admin/dashboard');
    }
    return next();
  }

  if (p === '/dashboard' || p === '/dashboard.html') {
    if (!isAdminAuthenticated(req)) {
      return res.redirect('/admin');
    }
    return next();
  }

  if (!isAdminAuthenticated(req)) {
    return res.redirect('/admin');
  }

  return next();
}

// Перенаправление роутов
app.use('/admin', adminPageGuard);
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/admin/recover', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/recover.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/dashboard.html')));
app.get('/catalog', (req, res) => res.sendFile(path.join(__dirname, 'public/catalog.html')));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Маршруты
app.use('/api/admin', checkOrigin, adminRoutes);
app.use('/api', publicRoutes);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск порта ТОЛЬКО для локальной разработки (npm start)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`LUVRA сервер запущен локально: http://localhost:${PORT}`);
  });
}

module.exports = app;