/**
 * admin-auth.js — обработка форм входа и восстановления пароля.
 */

function showFormError(msg) {
  const el = document.getElementById('formError');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function hideFormError() {
  const el = document.getElementById('formError');
  if (el) el.classList.remove('visible');
}

function showFormSuccess(msg) {
  const el = document.getElementById('formSuccess');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const formData = new FormData(loginForm);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showFormError(data.error || luvraT('admin.login.error'));
        submitBtn.disabled = false;
        return;
      }

      window.location.href = '/admin/dashboard';
    } catch {
      showFormError('Ошибка сети. Попробуйте ещё раз.');
      submitBtn.disabled = false;
    }
  });
}

const recoverForm = document.getElementById('recoverForm');
if (recoverForm) {
  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError();

    const submitBtn = recoverForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const formData = new FormData(recoverForm);
    try {
      const res = await fetch('/api/admin/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryKey: formData.get('recoveryKey'),
          username: formData.get('username'),
          newPassword: formData.get('newPassword'),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showFormError(data.error || 'Не удалось восстановить пароль');
        submitBtn.disabled = false;
        return;
      }

      showFormSuccess(luvraT('admin.recover.success'));
      recoverForm.reset();
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
    } catch {
      showFormError('Ошибка сети. Попробуйте ещё раз.');
      submitBtn.disabled = false;
    }
  });
}
