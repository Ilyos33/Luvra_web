// middleware/auth.js
// Проверка JWT-токена администратора, который лежит в httpOnly-куке.
// httpOnly кука выбрана вместо хранения токена в localStorage,
// чтобы токен не мог быть украден через XSS-скрипт на странице.

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'luvra_admin_token';
const JWT_SECRET = process.env.JWT_SECRET || 'luvra-dev-secret-key';

function getToken(req) {
  return req && req.cookies ? req.cookies[COOKIE_NAME] : null;
}

function isAdminAuthenticated(req) {
  const token = getToken(req);
  if (!token) return false;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return Boolean(payload && payload.id && payload.username);
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = { id: payload.id, username: payload.username };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Сессия недействительна или истекла, войдите снова' });
  }
}

function issueToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { requireAdmin, isAdminAuthenticated, issueToken, COOKIE_NAME };
