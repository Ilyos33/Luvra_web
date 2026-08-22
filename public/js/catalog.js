/**
 * catalog.js — логика страницы каталога: категории-фильтры + список товаров.
 */

let luvraCategories = [];
let luvraActiveCategory = null; // slug категории или null = "все"

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderCategoryFilters() {
  const wrap = document.getElementById('categoryFilters');
  if (!wrap) return;

  const lang = luvraGetLang();
  const allLabel = luvraT('catalog.filter.all');

  const pills = [
    `<button class="category-pill ${luvraActiveCategory === null ? 'active' : ''}" data-slug="">${escapeHtml(allLabel)}</button>`,
    ...luvraCategories.map(
      (c) =>
        `<button class="category-pill ${luvraActiveCategory === c.slug ? 'active' : ''}" data-slug="${c.slug}">${escapeHtml(c.name[lang])}</button>`
    ),
  ];

  wrap.innerHTML = pills.join('');

  wrap.querySelectorAll('.category-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      luvraActiveCategory = btn.dataset.slug || null;
      renderCategoryFilters();
      loadProducts();
    });
  });
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('catalogEmpty');
  const loading = document.getElementById('catalogLoading');
  if (loading) loading.classList.add('hidden');

  if (!products.length) {
    grid.innerHTML = '';
    grid.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  const lang = luvraGetLang();

  grid.innerHTML = products
    .map((p) => {
      const img = p.images && p.images.length ? `/uploads/${p.images[0]}` : '';
      const name = escapeHtml(p.name[lang]);
      const description = p.description[lang] || ''; // уже санитизировано на сервере при сохранении
      return `
        <div class="product-card">
          <div class="product-image">
            ${img ? `<img src="${img}" alt="${name}" loading="lazy">` : ''}
          </div>
          <div class="product-info">
            <h3>${name}</h3>
            <div class="product-desc">${description}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('catalogEmpty');
  const loading = document.getElementById('catalogLoading');
  const errorEl = document.getElementById('catalogError');

  if (errorEl) errorEl.classList.add('hidden');
  if (empty) empty.classList.add('hidden');
  if (grid) grid.classList.add('hidden');
  if (loading) loading.classList.remove('hidden');

  try {
    const url = luvraActiveCategory ? `/api/products?category=${encodeURIComponent(luvraActiveCategory)}` : '/api/products';
    const res = await fetch(url);
    if (!res.ok) throw new Error('bad response');
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    if (loading) loading.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    luvraCategories = await res.json();
  } catch {
    luvraCategories = [];
  }
  renderCategoryFilters();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadProducts();
});

// перерисовать тексты (в т.ч. карточки товаров) при смене языка без перезагрузки
document.addEventListener('luvra:lang-changed', () => {
  renderCategoryFilters();
  loadProducts();
});
