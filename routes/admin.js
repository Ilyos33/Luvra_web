// routes/admin.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const { body, param, validationResult } = require('express-validator');

const db = require('../db/database');
const { requireAdmin, issueToken, COOKIE_NAME } = require('../middleware/auth');
const { loginLimiter, recoverLimiter } = require('../middleware/security');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// ---------- Вспомогательные функции ----------

const CYRILLIC_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text) {
  const transliterated = String(text)
    .toLowerCase()
    .split('')
    .map((ch) => (CYRILLIC_MAP[ch] !== undefined ? CYRILLIC_MAP[ch] : ch))
    .join('');

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || crypto.randomBytes(4).toString('hex');
}

async function uniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const res = excludeId
      ? await db.query('SELECT id FROM categories WHERE slug = $1 AND id != $2', [slug, excludeId])
      : await db.query('SELECT id FROM categories WHERE slug = $1', [slug]);

    if (res.rows.length === 0) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

function cleanDescription(html) {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'span', 'h3', 'h4', 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'], span: ['style'] },
    allowedStyles: { span: { color: [/^#[0-9a-f]{3,6}$/i] } },
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  });
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Проверь заполненные поля', details: errors.array() });
  }
  return next();
}

// ---------- Загрузка изображений ----------

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXT.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error('Разрешены только изображения: jpg, png, gif, webp'));
  },
});

function deleteImageFiles(filenames) {
  filenames.forEach((name) => {
    const safeName = path.basename(name);
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.unlink(filePath, () => {});
  });
}

// =======================================================================
// АВТОРИЗАЦИЯ
// =======================================================================

router.post(
  '/login',
  loginLimiter,
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  handleValidation,
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const result = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
      const admin = result.rows[0];

      if (!admin) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      const ok = await bcrypt.compare(password, admin.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      const token = issueToken(admin);
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000,
      });

      return res.json({ ok: true, username: admin.username });
    } catch (err) {
      return next(err);
    }
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.post(
  '/recover',
  recoverLimiter,
  [
    body('recoveryKey').notEmpty(),
    body('username').trim().notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Пароль должен быть не короче 8 символов'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { recoveryKey, username, newPassword } = req.body;

      const expected = process.env.ADMIN_RECOVERY_KEY || '';
      const providedBuf = Buffer.from(String(recoveryKey));
      const expectedBuf = Buffer.from(String(expected));

      const validKey =
        expected.length > 0 &&
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf);

      if (!validKey) {
        return res.status(401).json({ error: 'Неверный код восстановления' });
      }

      const result = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
      const admin = result.rows[0];

      if (!admin) {
        return res.status(404).json({ error: 'Администратор с таким логином не найден' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, admin.id]
      );

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

// =======================================================================
// КАТЕГОРИИ
// =======================================================================

router.get('/categories', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, name_ru ASC');
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/categories',
  requireAdmin,
  [body('name_ru').trim().notEmpty(), body('name_uz').trim().notEmpty()],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name_ru: nameRu, name_uz: nameUz } = req.body;
      const slug = await uniqueSlug(slugify(nameRu));

      const result = await db.query(
        'INSERT INTO categories (slug, name_ru, name_uz) VALUES ($1, $2, $3) RETURNING id',
        [slug, nameRu, nameUz]
      );

      return res.status(201).json({ id: result.rows[0].id, slug, name_ru: nameRu, name_uz: nameUz });
    } catch (err) {
      return next(err);
    }
  }
);

router.put(
  '/categories/:id',
  requireAdmin,
  [param('id').isInt(), body('name_ru').trim().notEmpty(), body('name_uz').trim().notEmpty()],
  handleValidation,
  async (req, res, next) => {
    try {
      const existing = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });

      const { name_ru: nameRu, name_uz: nameUz } = req.body;
      await db.query(
        'UPDATE categories SET name_ru = $1, name_uz = $2 WHERE id = $3',
        [nameRu, nameUz, req.params.id]
      );

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

router.delete('/categories/:id', requireAdmin, [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });

    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// =======================================================================
// ТОВАРЫ
// =======================================================================

router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY sort_order ASC, created_at DESC');
    return res.json(
      result.rows.map((r) => ({
        id: r.id,
        categoryId: r.category_id,
        name: { ru: r.name_ru, uz: r.name_uz },
        description: { ru: r.description_ru, uz: r.description_uz },
        images: JSON.parse(r.images || '[]'),
        isActive: !!r.is_active,
      }))
    );
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/products',
  requireAdmin,
  upload.array('images', 6),
  async (req, res, next) => {
    try {
      const nameRu = String(req.body?.name_ru || '').trim();
      const nameUz = String(req.body?.name_uz || '').trim();

      if (!nameRu || !nameUz) {
        return res.status(400).json({ error: 'Укажи название товара на русском и узбекском' });
      }

      const categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
      const isActive = req.body?.is_active === 'false' ? 0 : 1;

      const descriptionRu = cleanDescription(req.body?.description_ru || '');
      const descriptionUz = cleanDescription(req.body?.description_uz || '');
      const images = (req.files || []).map((f) => f.filename);

      const result = await db.query(
        `INSERT INTO products (category_id, name_ru, name_uz, description_ru, description_uz, images, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
        [categoryId || null, nameRu, nameUz, descriptionRu, descriptionUz, JSON.stringify(images), isActive]
      );

      return res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
      return next(err);
    }
  }
);

router.put(
  '/products/:id',
  requireAdmin,
  upload.array('images', 6),
  async (req, res, next) => {
    try {
      const existing = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });

      const nameRu = String(req.body?.name_ru || '').trim();
      const nameUz = String(req.body?.name_uz || '').trim();

      if (!nameRu || !nameUz) {
        return res.status(400).json({ error: 'Укажи название товара на русском и узбекском' });
      }

      const categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
      const isActive = req.body?.is_active === 'false' ? 0 : 1;
      const descriptionRu = cleanDescription(req.body?.description_ru || '');
      const descriptionUz = cleanDescription(req.body?.description_uz || '');

      let keptImages = [];
      try {
        keptImages = JSON.parse(req.body?.existing_images || '[]');
      } catch {
        keptImages = [];
      }

      const oldImages = JSON.parse(existing.rows[0].images || '[]');
      const removedImages = oldImages.filter((name) => !keptImages.includes(name));
      deleteImageFiles(removedImages);

      const newImages = (req.files || []).map((f) => f.filename);
      const finalImages = [...keptImages, ...newImages];

      await db.query(
        `UPDATE products SET category_id = $1, name_ru = $2, name_uz = $3, description_ru = $4, description_uz = $5,
         images = $6, is_active = $7, updated_at = NOW() WHERE id = $8`,
        [categoryId || null, nameRu, nameUz, descriptionRu, descriptionUz, JSON.stringify(finalImages), isActive, req.params.id]
      );

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

router.delete('/products/:id', requireAdmin, [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });

    deleteImageFiles(JSON.parse(existing.rows[0].images || '[]'));
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Разрешены только')) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

module.exports = router;