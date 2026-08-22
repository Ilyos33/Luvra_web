// db/database.js
// Подключение к SQLite и создание схемы БД.
// SQLite выбран как БД по умолчанию: не требует отдельного сервера,
// вся база — один файл (db/luvra.db), который легко бэкапить копированием.

require('dotenv').config();

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'luvra.db');
const db = new Database(DB_PATH);

function initAdminBootstrap() {
  const { ensureDefaultAdmin } = require('./adminBootstrap');
  ensureDefaultAdmin({ db, env: process.env });
}

// Разумные настройки по умолчанию для небольшого сайта
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name_ru TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name_ru TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    description_ru TEXT NOT NULL DEFAULT '',
    description_uz TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
`);

initAdminBootstrap();

module.exports = db;
