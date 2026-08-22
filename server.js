// server.js
// Точка входа приложения LUVRA.

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { checkOrigin } = require('./middleware/security');
const { isAdminAuthenticated } = require('./middleware/auth');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_string') {
  console.warn('ВНИМАНИЕ: JWT_SECRET не задан или использует значение по умолчанию. Задай надёжный секрет в .env перед запуском в проде.');
}

const app = express();

// Если сайт стоит за реверс-прокси (Nginx/Caddy/Cloudflare), который терминирует HTTPS —
// это нужно, чтобы Express правильно определял, что соединение защищено.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-eval' нужен только для Tailwind Play CDN (JIT-компиляция стилей в браузере
        // на странице /admin/dashboard). Если позже подключишь Tailwind как обычный собранный
        // CSS-файл вместо CDN — 'unsafe-eval' можно будет убрать.
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', 'https://cdn.quilljs.com', "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdn.quilljs.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // customer-assets.emergentagent.com — временный хостинг логотипа, унаследованный от
        // исходного сайта. Рекомендуется заменить на public/images/logo.png (см. README).
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

// Красивые URL без .html — регистрируются до статики, чтобы Express не пытался
// сначала искать одноимённую папку и делать редирект.
app.use('/admin', adminPageGuard);
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/admin/recover', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/recover.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/dashboard.html')));
app.get('/catalog', (req, res) => res.sendFile(path.join(__dirname, 'public/catalog.html')));

// Статика: сам сайт и загруженные изображения товаров
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.use('/api/admin', checkOrigin, adminRoutes);
app.use('/api', publicRoutes);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
});

// Единая обработка ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LUVRA сервер запущен: http://localhost:${PORT}`);
});
