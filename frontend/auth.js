'use strict';

const API_BASE = 'http://localhost:5001/api';

/* ─── Shared helpers ─────────────────────────────────────────── */

/**
 * Store token and user, then send the user to the landing page.
 * Used only by the LOGIN flow.
 */
function handleLoginSuccess(token, user) {
  localStorage.setItem('dropshop_token', token);
  localStorage.setItem('dropshop_user', JSON.stringify(user));
  window.location.href = 'index.html';
}

/**
 * Show a message box inside the form.
 * Pass type = 'error' (default) or 'success' to control colour.
 * Creates the element once; subsequent calls just update text + class.
 */
function showMessage(formEl, message, type = 'error') {
  let box = formEl.querySelector('.auth-message');
  if (!box) {
    box = document.createElement('p');
    box.setAttribute('role', 'alert');
    box.setAttribute('aria-live', 'assertive');
    const submitBtn = formEl.querySelector('button[type="submit"]');
    formEl.insertBefore(box, submitBtn);
  }
  box.className = type === 'success' ? 'auth-message auth-success' : 'auth-message auth-error';
  box.textContent = message;
  box.hidden = false;
}

function clearMessage(formEl) {
  const box = formEl.querySelector('.auth-message');
  if (box) box.hidden = true;
}

function setLoading(formEl, isLoading) {
  const btn = formEl.querySelector('button[type="submit"]');
  btn.disabled = isLoading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = isLoading ? 'Please wait…' : btn.dataset.originalText;
}

/* ─── Register ───────────────────────────────────────────────── */

function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();        // always prevent default first
    clearMessage(form);

    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirmPassword.value;

    if (password !== confirm) {
      showMessage(form, 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      showMessage(form, 'Password must be at least 8 characters.');
      return;
    }

    setLoading(form, true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        // body was empty or non-JSON — not fatal for a 201 response
      }

      if (!res.ok) {
        if (res.status === 409) {
          showMessage(form, 'An account with that email already exists. Try logging in.');
        } else {
          showMessage(form, data.error || 'Registration failed. Please try again.');
        }
        return;
      }

      // Success: show message, do NOT store token, redirect to login after 2 s
      showMessage(form, 'Account created successfully. Redirecting to sign in…', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (err) {
      showMessage(form, 'Could not reach the server. Make sure the backend is running.');
      console.error('[register]', err);
    } finally {
      setLoading(form, false);
    }
  });
}

/* ─── Login ──────────────────────────────────────────────────── */

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(form);

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showMessage(form, 'Email and password are required.');
      return;
    }

    setLoading(form, true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) { }

      if (!res.ok) {
        if (res.status === 401) {
          showMessage(form, 'Invalid email or password.');
        } else {
          showMessage(form, data.error || 'Login failed. Please try again.');
        }
        return;
      }

      handleLoginSuccess(data.token, data.user);

    } catch (err) {
      showMessage(form, 'Could not reach the server. Make sure the backend is running.');
      console.error('[login]', err);
    } finally {
      setLoading(form, false);
    }
  });
}

/* ─── Init ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  try {
    const t = localStorage.getItem('dropshop_theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (_) { }

  // Already logged in — skip the auth page entirely
  try {
    if (localStorage.getItem('dropshop_token')) {
      window.location.href = 'index.html';
      return;
    }
  } catch (_) { }

  initRegister();
  initLogin();
});
