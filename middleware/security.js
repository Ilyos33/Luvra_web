// middleware/security.js
// Доп. защита для админ-эндпоинтов:
// 1) проверка Origin/Referer на запросах, которые меняют данные (защита от CSRF) —
//    работает вместе с cookie SameSite=Strict как двойной барьер.
// 2) ограничение частоты запросов на вход и восстановление пароля (защита от подбора).

const rateLimit = require('express-rate-limit');

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    return Array.from(new Set([...configured, 'http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:3000']));
  }

  return configured;
}

// Для запросов, меняющих данные (POST/PUT/DELETE) проверяем, что они пришли
// с нашего же сайта, а не с постороннего домена (классическая защита от CSRF).
function checkOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const allowed = getAllowedOrigins();
  const origin = req.get('origin') || req.get('referer');

  // В разработке (localhost) origin может отсутствовать у некоторых клиентов — не блокируем.
  if (process.env.NODE_ENV !== 'production' && !origin) {
    return next();
  }

  if (!origin || !allowed.some((a) => origin.startsWith(a))) {
    return res.status(403).json({ error: 'Запрос отклонён (недопустимый источник)' });
  }

  return next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуй снова через 15 минут.' },
});

const recoverLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток восстановления. Попробуй снова через час.' },
});

module.exports = { checkOrigin, loginLimiter, recoverLimiter };
