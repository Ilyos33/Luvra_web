// routes/admin.js
// Все эндпоинты админ-панели. GET-эндпоинты для чтения списков + защищённые
// POST/PUT/DELETE для управления категориями и товарами.

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

// ---------- вспомогательные функции ----------

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

function uniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const row = excludeId
      ? db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, excludeId)
      : db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (!row) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

// Разрешаем только безопасный набор HTML-тегов в описании (WYSIWYG-редактор
// на фронтенде может добавить теги форматирования) — защита от XSS.
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

// ---------- загрузка изображений ----------

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
    const safeName = path.basename(name); // не даём выйти за пределы папки uploads
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.unlink(filePath, () => {}); // тихо игнорируем, если файла уже нет
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
  async (req, res) => {
    const { username, password } = req.body;

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
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

    res.json({ ok: true, username: admin.username });
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
  async (req, res) => {
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

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return res.status(404).json({ error: 'Администратор с таким логином не найден' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(passwordHash, admin.id);

    res.json({ ok: true });
  }
);

// =======================================================================
// КАТЕГОРИИ
// =======================================================================

router.get('/categories', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name_ru ASC').all();
  res.json(rows);
});

router.post(
  '/categories',
  requireAdmin,
  [body('name_ru').trim().notEmpty(), body('name_uz').trim().notEmpty()],
  handleValidation,
  (req, res) => {
    const { name_ru: nameRu, name_uz: nameUz } = req.body;
    const slug = uniqueSlug(slugify(nameRu));

    const info = db
      .prepare('INSERT INTO categories (slug, name_ru, name_uz) VALUES (?, ?, ?)')
      .run(slug, nameRu, nameUz);

    res.status(201).json({ id: info.lastInsertRowid, slug, name_ru: nameRu, name_uz: nameUz });
  }
);

router.put(
  '/categories/:id',
  requireAdmin,
  [param('id').isInt(), body('name_ru').trim().notEmpty(), body('name_uz').trim().notEmpty()],
  handleValidation,
  (req, res) => {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Категория не найдена' });

    const { name_ru: nameRu, name_uz: nameUz } = req.body;
    db.prepare('UPDATE categories SET name_ru = ?, name_uz = ? WHERE id = ?').run(
      nameRu,
      nameUz,
      req.params.id
    );

    res.json({ ok: true });
  }
);

router.delete('/categories/:id', requireAdmin, [param('id').isInt()], handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Категория не найдена' });

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  // товары этой категории остаются, но становятся "без категории" (ON DELETE SET NULL)
  res.json({ ok: true });
});

// =======================================================================
// ТОВАРЫ
// =======================================================================

router.get('/products', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, created_at DESC').all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      name: { ru: r.name_ru, uz: r.name_uz },
      description: { ru: r.description_ru, uz: r.description_uz },
      images: JSON.parse(r.images || '[]'),
      isActive: !!r.is_active,
    }))
  );
});

router.post(
  '/products',
  requireAdmin,
  upload.array('images', 6),
  (req, res) => {
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

    const info = db
      .prepare(
        `INSERT INTO products (category_id, name_ru, name_uz, description_ru, description_uz, images, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(categoryId || null, nameRu, nameUz, descriptionRu, descriptionUz, JSON.stringify(images), isActive);

    res.status(201).json({ id: info.lastInsertRowid });
  }
);

router.put(
  '/products/:id',
  requireAdmin,
  upload.array('images', 6),
  (req, res) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Товар не найден' });

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

    const oldImages = JSON.parse(existing.images || '[]');
    const removedImages = oldImages.filter((name) => !keptImages.includes(name));
    deleteImageFiles(removedImages);

    const newImages = (req.files || []).map((f) => f.filename);
    const finalImages = [...keptImages, ...newImages];

    db.prepare(
      `UPDATE products SET category_id = ?, name_ru = ?, name_uz = ?, description_ru = ?, description_uz = ?,
       images = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(categoryId || null, nameRu, nameUz, descriptionRu, descriptionUz, JSON.stringify(finalImages), isActive, req.params.id);

    res.json({ ok: true });
  }
);

router.delete('/products/:id', requireAdmin, [param('id').isInt()], handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Товар не найден' });

  deleteImageFiles(JSON.parse(existing.images || '[]'));
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

  res.json({ ok: true });
});

// Обработчик ошибок multer (например, файл слишком большой или неверный формат)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Разрешены только')) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

module.exports = router;
