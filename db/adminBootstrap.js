const bcrypt = require('bcryptjs');
const db = require('./database');

async function ensureDefaultAdmin(options = {}) {
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

  try {
    const existing = await targetDb.query(
      'SELECT id, username FROM admin_users WHERE username = $1',
      [username]
    );

    const passwordHash = await bcryptImpl.hash(password, 12);

    if (existing.rows.length > 0) {
      await targetDb.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE username = $2',
        [passwordHash, username]
      );
      console.log(`Администратор "${username}" обновлён из переменных окружения.`);
      return true;
    }

    await targetDb.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
      [username, passwordHash]
    );
    console.log(`Администратор "${username}" создан автоматически из переменных окружения.`);
    return true;
  } catch (err) {
    console.error('Ошибка инициализации администратора:', err);
    return false;
  }
}

module.exports = { ensureDefaultAdmin };