(function () {
  if (Auth.token && Auth.user) { window.location.href = 'dashboard.html'; return; }
  const msg = document.getElementById('msg');
  const btn = document.getElementById('submit');

  async function submit(path, payload) {
    msg.hidden = true; btn.disabled = true;
    try {
      const data = await api('POST', path, payload);
      Auth.save(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (e) { showError(msg, e.message); btn.disabled = false; }
  }

  const login = document.getElementById('login-form');
  if (login) login.addEventListener('submit', e => {
    e.preventDefault();
    const email = login.email.value.trim(), password = login.password.value;
    if (!email || !password) return showError(msg, 'Email and password are required.');
    submit('/auth/login', { email, password });
  });

  const reg = document.getElementById('register-form');
  if (reg) reg.addEventListener('submit', e => {
    e.preventDefault();
    const payload = { name: document.getElementById('name').value.trim(), email: reg.email.value.trim(), phone: reg.phone.value.trim(), password: reg.password.value };
    if (!payload.name || !payload.email || !payload.password) return showError(msg, 'Name, email and password are required.');
    if (payload.password.length < 8 || !/[A-Za-z]/.test(payload.password) || !/\d/.test(payload.password))
      return showError(msg, 'Password must be at least 8 characters with a letter and a number.');
    submit('/auth/register', payload);
  });
})();
