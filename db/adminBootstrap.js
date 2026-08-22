const bcrypt = require('bcryptjs');
const db = require('./database');

function ensureDefaultAdmin(options = {}) {
  const targetDb = options.db || db;
  const env = options.env || process.env;
  const bcryptImpl = options.bcrypt || bcrypt;

  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn('Администратор не инициализирован: заполни ADMIN_USERNAME и ADMIN_PASSWORD в .env.');
    return false;
  }

  if (password.length < 8) {
    console.warn('Администратор не инициализирован: ADMIN_PASSWORD должен быть не короче 8 символов.');
    return false;
  }

  const existing = targetDb.prepare('SELECT id, username FROM admin_users WHERE username = ?').get(username);

  if (existing) {
    const passwordHash = bcryptImpl.hashSync(password, 12);
    targetDb.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE username = ?').run(passwordHash, username);
    console.log(`Администратор "${username}" обновлён из переменных окружения.`);
    return true;
  }

  const passwordHash = bcryptImpl.hashSync(password, 12);
  targetDb.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log(`Администратор "${username}" создан автоматически из переменных окружения.`);
  return true;
}

module.exports = { ensureDefaultAdmin };
