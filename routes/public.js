// routes/public.js
// Публичное API для витрины сайта. Только чтение, без авторизации.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

function parseProduct(row) {
  let images = [];
  try {
    images = typeof row.images === 'string' ? JSON.parse(row.images || '[]') : row.images || [];
  } catch {
    images = [];
  }

  return {
    id: row.id,
    categoryId: row.category_id,
    name: { ru: row.name_ru, uz: row.name_uz },
    description: { ru: row.description_ru, uz: row.description_uz },
    images,
  };
}

// GET /api/categories — список категорий для фильтра в каталоге
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, slug, name_ru, name_uz FROM categories ORDER BY sort_order ASC, name_ru ASC'
    );

    return res.json(
      result.rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: { ru: r.name_ru, uz: r.name_uz },
      }))
    );
  } catch (err) {
    return next(err);
  }
});

// GET /api/products?category=slug — список активных товаров, опционально по категории
router.get('/products', async (req, res, next) => {
  try {
    const { category } = req.query;

    let result;
    if (category) {
      result = await db.query(
        `SELECT p.* FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE (p.is_active = TRUE OR p.is_active = 1) AND c.slug = $1
         ORDER BY p.sort_order ASC, p.created_at DESC`,
        [category]
      );
    } else {
      result = await db.query(
        `SELECT * FROM products 
         WHERE is_active = TRUE OR is_active = 1 
         ORDER BY sort_order ASC, created_at DESC`
      );
    }

    return res.json(result.rows.map(parseProduct));
  } catch (err) {
    return next(err);
  }
});

// GET /api/products/:id — карточка одного товара
router.get('/products/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM products WHERE id = $1 AND (is_active = TRUE OR is_active = 1)',
      [req.params.id]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    return res.json(parseProduct(row));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;