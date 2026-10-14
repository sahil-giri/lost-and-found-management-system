(async function () {
  if (!PAGE_OK) return;
  const msg = document.getElementById('msg'), form = document.getElementById('profile-form'), f = n => document.getElementById(n);
  try {
    const { user } = await api('GET', '/users/me');
    f('name').value = user.name; f('email').value = user.email; f('phone').value = user.phone || '';
  } catch (e) { showError(msg, e.message); }

  form.addEventListener('submit', async e => {
    e.preventDefault(); msg.hidden = true;
    const payload = { name: f('name').value.trim(), phone: f('phone').value.trim() };
    if (f('newPassword').value) { payload.newPassword = f('newPassword').value; payload.currentPassword = f('currentPassword').value; }
    if (payload.name.length < 2) return showError(msg, 'Name must be at least 2 characters.');
    try {
      const d = await api('PUT', '/users/me', payload);
      Auth.save(Auth.token, d.user);
      f('currentPassword').value = ''; f('newPassword').value = '';
      msg.className = 'alert alert-ok'; msg.textContent = d.message; msg.hidden = false;
    } catch (err) { showError(msg, err.message); }
  });
})();
