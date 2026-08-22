/**
 * admin-dashboard.js — логика панели управления: товары и категории.
 */

let categories = [];
let products = [];
let editorRu, editorUz;
let existingImages = []; // имена файлов уже сохранённых изображений (при редактировании)
let simpleEditorFallback = true;
let newImageFiles = []; // новые File-объекты, выбранные в этой сессии редактирования
const MAX_IMAGES = 6;

// ---------- вспомогательное ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.href = '/admin';
    throw new Error('unauthorized');
  }
  return res;
}

function showProductFormError(msg) {
  const el = document.getElementById('productFormError');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideProductFormError() {
  document.getElementById('productFormError').classList.add('hidden');
}

// ---------- авторизация ----------

async function checkAuth() {
  try {
    const res = await apiFetch('/api/admin/me');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('adminUsername').textContent = data.username;
  } catch {
    /* redirect уже произошёл в apiFetch */
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await apiFetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin';
});

// ---------- вкладки ----------

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('border-[#C89B3C]', 'gold');
      b.classList.add('border-transparent', 'text-gray-500');
    });
    btn.classList.add('border-[#C89B3C]', 'gold');
    btn.classList.remove('border-transparent', 'text-gray-500');

    document.getElementById('tab-products').classList.toggle('hidden', btn.dataset.tab !== 'products');
    document.getElementById('tab-categories').classList.toggle('hidden', btn.dataset.tab !== 'categories');
  });
});

// ---------- Quill редакторы ----------

function initEditors() {
  const createSimpleEditor = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const textarea = document.createElement('textarea');
    textarea.className = 'w-full border-2 border-gray-200 rounded-lg px-3 py-2 min-h-[120px] focus:border-[#C89B3C] focus:outline-none';
    textarea.setAttribute('placeholder', 'Введите описание');
    container.innerHTML = '';
    container.appendChild(textarea);

    return {
      root: textarea,
      getHTML: () => textarea.value,
      setHTML: (html) => {
        textarea.value = html.replace(/<[^>]+>/g, ' ').trim();
      },
    };
  };

  try {
    if (typeof Quill !== 'undefined') {
      const toolbarOptions = [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']];
      editorRu = new Quill('#editor_ru', { theme: 'snow', modules: { toolbar: toolbarOptions } });
      editorUz = new Quill('#editor_uz', { theme: 'snow', modules: { toolbar: toolbarOptions } });
      simpleEditorFallback = false;
      return;
    }
  } catch {
    // ignore and fallback below
  }

  editorRu = createSimpleEditor('editor_ru');
  editorUz = createSimpleEditor('editor_uz');
}

// ---------- КАТЕГОРИИ ----------

async function loadCategories() {
  const res = await apiFetch('/api/admin/categories');
  categories = await res.json();
  renderCategoriesList();
  renderCategorySelect();
}

function renderCategorySelect() {
  const select = document.querySelector('select[name="category_id"]');
  const noneLabel = luvraT('admin.product.categoryNone');
  select.innerHTML =
    `<option value="">${escapeHtml(noneLabel)}</option>` +
    categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name_ru)} / ${escapeHtml(c.name_uz)}</option>`).join('');
}

function renderCategoriesList() {
  const list = document.getElementById('categoriesList');
  const empty = document.getElementById('noCategoriesMsg');

  if (!categories.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = categories
    .map(
      (c) => `
      <div class="flex items-center justify-between px-5 py-3">
        <div>
          <p class="font-semibold">${escapeHtml(c.name_ru)}</p>
          <p class="text-sm text-gray-500">${escapeHtml(c.name_uz)}</p>
        </div>
        <div class="flex gap-2">
          <button class="cat-edit-btn text-sm font-semibold gold" data-id="${c.id}" data-i18n="admin.category.edit">Редактировать</button>
          <button class="cat-delete-btn text-sm font-semibold text-red-500" data-id="${c.id}" data-i18n="admin.category.delete">Удалить</button>
        </div>
      </div>`
    )
    .join('');

  list.querySelectorAll('.cat-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openCategoryForm(Number(btn.dataset.id)))
  );
  list.querySelectorAll('.cat-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => deleteCategory(Number(btn.dataset.id)))
  );
}

function openCategoryForm(id) {
  const form = document.getElementById('categoryForm');
  const cat = categories.find((c) => c.id === id);
  form.id.value = cat ? cat.id : '';
  form.name_ru.value = cat ? cat.name_ru : '';
  form.name_uz.value = cat ? cat.name_uz : '';
  document.getElementById('categoryCancelBtn').classList.toggle('hidden', !cat);
}

document.getElementById('categoryCancelBtn').addEventListener('click', () => openCategoryForm(null));

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const payload = { name_ru: form.name_ru.value.trim(), name_uz: form.name_uz.value.trim() };

  const res = await apiFetch(id ? `/api/admin/categories/${id}` : '/api/admin/categories', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    openCategoryForm(null);
    await loadCategories();
  }
});

async function deleteCategory(id) {
  if (!confirm(luvraT('admin.category.confirmDelete'))) return;
  await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  await loadCategories();
  await loadProducts();
}

// ---------- ТОВАРЫ ----------

async function loadProducts() {
  const res = await apiFetch('/api/admin/products');
  products = await res.json();
  renderProductsList();
}

function categoryName(id) {
  const cat = categories.find((c) => c.id === id);
  return cat ? cat.name_ru : luvraT('admin.product.categoryNone');
}

function renderProductsList() {
  const list = document.getElementById('productsList');
  const empty = document.getElementById('noProductsMsg');

  if (!products.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = products
    .map((p) => {
      const img = p.images && p.images.length ? `/uploads/${p.images[0]}` : '';
      return `
      <div class="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
        <div class="aspect-square bg-[#F9F6F1] flex items-center justify-center">
          ${img ? `<img src="${img}" class="w-full h-full object-contain">` : '<span class="text-gray-300 text-sm">нет фото</span>'}
        </div>
        <div class="p-4 flex-1 flex flex-col">
          <p class="font-bold">${escapeHtml(p.name.ru)}</p>
          <p class="text-sm text-gray-500 mb-2">${escapeHtml(categoryName(p.categoryId))}</p>
          <p class="text-xs mb-3 inline-block px-2 py-1 rounded-full w-fit ${p.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}">
            ${p.isActive ? 'Показан' : 'Скрыт'}
          </p>
          <div class="flex gap-2 mt-auto pt-2">
            <button class="prod-edit-btn flex-1 text-sm font-semibold border-2 border-[#C89B3C] gold rounded-lg py-1.5" data-id="${p.id}" data-i18n="admin.product.edit">Редактировать</button>
            <button class="prod-delete-btn text-sm font-semibold text-red-500 border-2 border-red-200 rounded-lg px-3" data-id="${p.id}" data-i18n="admin.product.delete">Удалить</button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  list.querySelectorAll('.prod-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openProductModal(Number(btn.dataset.id)))
  );
  list.querySelectorAll('.prod-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.id)))
  );
}

function renderImagePreviews() {
  const wrap = document.getElementById('imagePreviews');
  const existingHtml = existingImages.map(
    (name, i) => `
      <div class="relative w-20 h-20">
        <img src="/uploads/${name}" class="w-full h-full object-cover rounded-lg border">
        <button type="button" class="remove-existing-img absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5" data-index="${i}">×</button>
      </div>`
  );
  const newHtml = newImageFiles.map(
    (file, i) => `
      <div class="relative w-20 h-20">
        <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-lg border border-[#C89B3C]">
        <button type="button" class="remove-new-img absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5" data-index="${i}">×</button>
      </div>`
  );
  wrap.innerHTML = existingHtml.join('') + newHtml.join('');

  wrap.querySelectorAll('.remove-existing-img').forEach((btn) =>
    btn.addEventListener('click', () => {
      existingImages.splice(Number(btn.dataset.index), 1);
      renderImagePreviews();
    })
  );
  wrap.querySelectorAll('.remove-new-img').forEach((btn) =>
    btn.addEventListener('click', () => {
      newImageFiles.splice(Number(btn.dataset.index), 1);
      renderImagePreviews();
    })
  );
}

document.getElementById('imagesInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  const totalCount = existingImages.length + newImageFiles.length + files.length;
  if (totalCount > MAX_IMAGES) {
    showProductFormError(`Максимум ${MAX_IMAGES} изображений на товар`);
  } else {
    hideProductFormError();
  }
  newImageFiles = newImageFiles.concat(files).slice(0, MAX_IMAGES - existingImages.length);
  e.target.value = '';
  renderImagePreviews();
});

function openProductModal(id) {
  const form = document.getElementById('productForm');
  form.reset();
  hideProductFormError();
  existingImages = [];
  newImageFiles = [];

  const product = id ? products.find((p) => p.id === id) : null;

  document.getElementById('productModalTitle').textContent = product
    ? luvraT('admin.product.edit')
    : luvraT('admin.dashboard.addProduct');

  form.id.value = product ? product.id : '';
  form.name_ru.value = product ? product.name.ru : '';
  form.name_uz.value = product ? product.name.uz : '';
  form.category_id.value = product && product.categoryId ? product.categoryId : '';
  form.is_active.checked = product ? product.isActive : true;

  if (editorRu && editorRu.root) {
    if (simpleEditorFallback) {
      editorRu.setHTML(product ? product.description.ru : '');
    } else {
      editorRu.root.innerHTML = product ? product.description.ru : '';
    }
  }

  if (editorUz && editorUz.root) {
    if (simpleEditorFallback) {
      editorUz.setHTML(product ? product.description.uz : '');
    } else {
      editorUz.root.innerHTML = product ? product.description.uz : '';
    }
  }

  existingImages = product ? [...product.images] : [];
  renderImagePreviews();

  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

document.getElementById('openProductFormBtn').addEventListener('click', () => openProductModal(null));
document.getElementById('productCancelBtn').addEventListener('click', closeProductModal);

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideProductFormError();

  const form = e.target;
  const id = form.id.value;

  const fd = new FormData();
  fd.append('name_ru', form.name_ru.value.trim());
  fd.append('name_uz', form.name_uz.value.trim());
  fd.append('description_ru', simpleEditorFallback ? (editorRu?.getHTML ? editorRu.getHTML() : '') : (editorRu?.root?.innerHTML || ''));
  fd.append('description_uz', simpleEditorFallback ? (editorUz?.getHTML ? editorUz.getHTML() : '') : (editorUz?.root?.innerHTML || ''));
  fd.append('category_id', form.category_id.value);
  fd.append('is_active', form.is_active.checked ? 'true' : 'false');
  fd.append('existing_images', JSON.stringify(existingImages));
  newImageFiles.forEach((file) => fd.append('images', file));

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await apiFetch(id ? `/api/admin/products/${id}` : '/api/admin/products', {
      method: id ? 'PUT' : 'POST',
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      showProductFormError(data.error || 'Не удалось сохранить товар');
      submitBtn.disabled = false;
      return;
    }

    closeProductModal();
    await loadProducts();
  } catch {
    showProductFormError('Ошибка сети. Попробуйте ещё раз.');
  }
  submitBtn.disabled = false;
});

async function deleteProduct(id) {
  if (!confirm(luvraT('admin.product.confirmDelete'))) return;
  await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  await loadProducts();
}

// ---------- инициализация ----------

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  initEditors();
  await loadCategories();
  await loadProducts();
});
