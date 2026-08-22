// routes/public.js
// Публичное API для витрины сайта. Только чтение, без авторизации.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

function parseProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: { ru: row.name_ru, uz: row.name_uz },
    description: { ru: row.description_ru, uz: row.description_uz },
    images: JSON.parse(row.images || '[]'),
  };
}

// GET /api/categories — список категорий для фильтра в каталоге
router.get('/categories', (req, res) => {
  const rows = db
    .prepare('SELECT id, slug, name_ru, name_uz FROM categories ORDER BY sort_order ASC, name_ru ASC')
    .all();

  res.json(
    rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: { ru: r.name_ru, uz: r.name_uz },
    }))
  );
});

// GET /api/products?category=slug — список активных товаров, опционально по категории
router.get('/products', (req, res) => {
  const { category } = req.query;

  let rows;
  if (category) {
    rows = db
      .prepare(
        `SELECT p.* FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND c.slug = ?
         ORDER BY p.sort_order ASC, p.created_at DESC`
      )
      .all(category);
  } else {
    rows = db
      .prepare(
        `SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
      )
      .all();
  }

  res.json(rows.map(parseProduct));
});

// GET /api/products/:id — карточка одного товара
router.get('/products/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.json(parseProduct(row));
});

module.exports = router;
