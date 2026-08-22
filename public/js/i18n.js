/**
 * i18n.js — общий движок многоязычности сайта.
 * Тексты интерфейса берутся из /locales/ru.json и /locales/uz.json.
 * Язык сохраняется в localStorage и применяется на всех страницах.
 *
 * Разметка: <span data-i18n="hero.title">запасной текст</span>
 * Для атрибутов: <input data-i18n-placeholder="admin.login.username">
 */

const LUVRA_LANG_KEY = 'luvra_lang';
let luvraLocales = { ru: {}, uz: {} };

function luvraGetLang() {
  return localStorage.getItem(LUVRA_LANG_KEY) || 'uz';
}

function luvraSetLang(lang) {
  localStorage.setItem(LUVRA_LANG_KEY, lang);
}

function luvraT(key) {
  const lang = luvraGetLang();
  return (luvraLocales[lang] && luvraLocales[lang][key]) || key;
}

function luvraApplyTranslations() {
  const lang = luvraGetLang();
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = luvraT(key);
    if (text) el.textContent = text;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', luvraT(key));
  });

  document.querySelectorAll('.lang-toggle [data-i18n]').forEach((el) => {
    // кнопка переключения языка всегда показывает НАЗВАНИЕ другого языка
    el.textContent = lang === 'uz' ? 'Русский' : "O'zbek";
  });

  document.dispatchEvent(new CustomEvent('luvra:lang-changed', { detail: { lang } }));
}

async function luvraLoadLocales() {
  const [ru, uz] = await Promise.all([
    fetch('/locales/ru.json').then((r) => r.json()),
    fetch('/locales/uz.json').then((r) => r.json()),
  ]);
  luvraLocales = { ru, uz };
}

function luvraToggleLang() {
  const next = luvraGetLang() === 'uz' ? 'ru' : 'uz';
  luvraSetLang(next);
  luvraApplyTranslations();
}

function luvraInitNav() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggleBtn && nav) {
    toggleBtn.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  const langBtn = document.querySelector('.lang-toggle');
  if (langBtn) langBtn.addEventListener('click', luvraToggleLang);

  // подсветка активного пункта меню
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    const isHome = (path === '/' || path === '/index.html') && href === '/';
    const isCatalog = path.startsWith('/catalog') && href.startsWith('/catalog');
    if (isHome || isCatalog) link.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await luvraLoadLocales();
  luvraApplyTranslations();
  luvraInitNav();
});
