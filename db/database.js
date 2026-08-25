const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: Переменная DATABASE_URL не найдена!');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

let isDbInitialized = false;

async function initDb() {
  if (isDbInitialized) return;
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name_ru TEXT NOT NULL,
        name_uz TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name_ru TEXT NOT NULL,
        name_uz TEXT NOT NULL,
        description_ru TEXT NOT NULL DEFAULT '',
        description_uz TEXT NOT NULL DEFAULT '',
        images TEXT NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

      -- Если таблица уже существовала и колонка is_active была целочисленной
      -- (например, при миграции со SQLite), попытаться безопасно привести её к boolean.
      DO $$
      BEGIN
        IF EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'is_active' AND data_type <> 'boolean'
        ) THEN
          ALTER TABLE products ALTER COLUMN is_active TYPE boolean USING (is_active = 1);
        END IF;
      END$$;
    `);

    const { ensureDefaultAdmin } = require('./adminBootstrap');
    if (typeof ensureDefaultAdmin === 'function') {
      await ensureDefaultAdmin({ db: pool, env: process.env });
    }

    isDbInitialized = true;
    console.log('Таблицы PostgreSQL в Supabase успешно проверены/созданы.');
  } catch (err) {
    console.error('Ошибка инициализации PostgreSQL:', err);
  }
}

initDb();

module.exports = pool;