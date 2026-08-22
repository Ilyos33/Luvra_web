// db/seedAdmin.js
// Создаёт (или сбрасывает) единственного администратора платформы.
// Запуск: npm run seed
// Логин и пароль берутся из .env (ADMIN_USERNAME / ADMIN_PASSWORD).

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Ошибка: заполни ADMIN_USERNAME и ADMIN_PASSWORD в файле .env перед запуском.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Ошибка: ADMIN_PASSWORD должен быть не короче 8 символов.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);

  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE username = ?')
      .run(passwordHash, username);
    console.log(`Пароль администратора "${username}" обновлён.`);
  } else {
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
      .run(username, passwordHash);
    console.log(`Администратор "${username}" создан.`);
  }

  console.log('Теперь можно зайти в админ-панель по адресу /admin с этим логином и паролем.');
  console.log('ВАЖНО: после первого запуска убери ADMIN_PASSWORD из .env или замени его, чтобы пароль не хранился в открытом виде.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Не удалось создать администратора:', err);
  process.exit(1);
});
