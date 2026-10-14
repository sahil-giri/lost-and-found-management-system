// Shared helpers used by every page: API calls, auth state, navbar, toasts, formatting.
// If the frontend is hosted on a different domain than the backend, set API_BASE to the full URL,
// e.g. 'https://your-backend.onrender.com/api'.
const API_BASE = '/api';
const FILE_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : '';

const Auth = {
  get token() { return localStorage.getItem('lf_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('lf_user')); } catch (e) { return null; } },
  save(token, user) { localStorage.setItem('lf_token', token); localStorage.setItem('lf_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('lf_token'); localStorage.removeItem('lf_user'); }
};

// Generic request wrapper: adds the JWT header, parses JSON, throws Error with the server's message.
async function api(method, path, body) {
  const headers = {};
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  let payload;
  if (body instanceof FormData) payload = body;           // multipart (image upload): browser sets the header
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API_BASE + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Cannot reach the server. Is the backend running?'); }
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (res.status === 401 && Auth.token) { // token expired / invalid
    Auth.clear();
    window.location.href = 'login.html';
    throw new Error(data.message || 'Session expired.');
  }
  if (!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

// Escape text before putting it into innerHTML (prevents XSS from user-entered data)
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Show the status badge only when it adds information (a LOST item with status LOST is redundant)
const badges = (i) => badge(i.type) + (i.status !== i.type ? badge(i.status) : '');
const badge = (s) => `<span class="badge b-${esc(s)}">${esc(s)}</span>`;
const fmtDate = (d) => d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const imgUrl = (p) => p ? FILE_BASE + p : '';

function toast(message, kind = '') {
  let box = document.getElementById('toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
const showError = (el, msg) => { el.className = 'alert alert-error'; el.textContent = msg; el.hidden = false; };

// Call at the top of protected pages. Redirects to login if no token (or to dashboard if admin-only).
// NOTE: this is user-experience only. The real protection is on the server.
function requireAuth(adminOnly = false) {
  if (!Auth.token || !Auth.user) { window.location.href = 'login.html'; return false; }
  if (adminOnly && Auth.user.role !== 'ADMIN') { window.location.href = 'dashboard.html'; return false; }
  return true;
}

function renderNav(active) {
  const user = Auth.user;
  const link = (href, label, key) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  let links = '', right = '';
  if (user) {
    links = link('dashboard.html', 'Dashboard', 'dashboard') + link('items.html', 'Browse', 'items') +
      link('report-lost.html', 'Report Lost', 'lost') + link('report-found.html', 'Report Found', 'found') +
      link('my-reports.html', 'My Reports', 'reports') + link('my-claims.html', 'Claims', 'claims') +
      link('notifications.html', 'Notifications <span class="dot" id="nav-dot" hidden></span>', 'notifications') +
      (user.role === 'ADMIN' ? link('admin-dashboard.html', 'Admin', 'admin') : '');
    right = `<a href="profile.html">${esc(user.name)}</a><button class="btn btn-outline btn-sm" id="logout-btn">Logout</button>`;
  } else {
    links = link('index.html', 'Home', 'home');
    right = `<a href="login.html" class="btn btn-outline btn-sm">Login</a><a href="register.html" class="btn btn-sm">Register</a>`;
  }
  const nav = document.createElement('header');
  nav.className = 'navbar nav';
  nav.innerHTML = `<div class="nav-inner"><a class="brand" href="${user ? 'dashboard.html' : 'index.html'}">Lost<span>&amp;</span>Found</a>
    <button class="nav-toggle" aria-label="Menu">☰</button><nav class="nav-links">${links}</nav><div class="nav-right">${right}</div></div>`;
  document.body.prepend(nav);
  nav.querySelector('.nav-toggle').addEventListener('click', () => nav.classList.toggle('open'));
  const out = document.getElementById('logout-btn');
  if (out) out.addEventListener('click', () => { Auth.clear(); window.location.href = 'login.html'; });
  if (user) api('GET', '/notifications').then(d => {
    const dot = document.getElementById('nav-dot');
    if (dot && d.unread) { dot.textContent = d.unread; dot.hidden = false; }
  }).catch(() => {});
}

const CATEGORIES = ['Electronics', 'Personal', 'Accessories', 'Documents', 'Books & Stationery', 'Clothing', 'Keys', 'Bags', 'Other'];
const catOptions = (selected = '') => CATEGORIES.map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');

function itemCard(i) {
  return `<article class="card item-card"><div class="item-img">${i.image_path ? `<img src="${esc(imgUrl(i.image_path))}" alt="${esc(i.title)}" loading="lazy">` : '📦'}</div>
    <div class="item-body"><div class="badges">${badges(i)}</div><h3>${esc(i.title)}</h3>
    <div class="small muted">📍 ${esc(i.location)} · ${fmtDate(i.item_date)}</div>
    <div class="small muted">${esc(i.category)} · by ${esc(i.reporter_name || 'you')}</div>
    <a class="btn btn-outline btn-sm" style="margin-top:auto;text-align:center" href="item-details.html?id=${i.id}">View details</a></div></article>`;
}

// Runs on every page: enforces login (UX only), renders the navbar. Page scripts run only if PAGE_OK.
const PAGE_OK = (() => {
  const d = document.body.dataset;
  if (d.auth === 'required' || d.auth === 'admin') { if (!requireAuth(d.auth === 'admin')) return false; }
  if (d.nav) renderNav(d.nav);
  return true;
})();
