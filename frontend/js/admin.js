(function () {
  if (!PAGE_OK) return;
  const panel = document.getElementById('panel');
  const STATUSES = ['LOST', 'FOUND', 'CLAIMED', 'RETURNED', 'CLOSED'];
  let tab = 'recent', stats;

  async function loadStats() {
    try {
      stats = await api('GET', '/admin/stats');
      const c = (n, l) => `<div class="card stat"><span class="num">${n}</span><span class="lbl">${l}</span></div>`;
      document.getElementById('stats').innerHTML = c(stats.totalUsers, 'Total users') + c(stats.lostReports, 'Lost reports') +
        c(stats.foundReports, 'Found reports') + c(stats.pendingClaims, 'Pending claims') + c(stats.returnedItems, 'Returned items');
    } catch (e) { document.getElementById('stats').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }

  const table = (head, rows) => rows.length ? `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : '<div class="empty">Nothing to show.</div>';

  async function loadTab() {
    panel.innerHTML = '<div class="loading">Loading...</div>';
    try {
      if (tab === 'recent') {
        panel.innerHTML = table(['Item', 'Type', 'Status', 'Reporter', 'Reported'], stats.recent.map(i =>
          `<tr><td><a href="item-details.html?id=${i.id}">${esc(i.title)}</a></td><td>${badge(i.type)}</td><td>${badge(i.status)}</td><td>${esc(i.reporter_name)}</td><td>${fmtDate(i.created_at)}</td></tr>`));
      } else if (tab === 'users') {
        const d = await api('GET', '/admin/users');
        const me = Auth.user.id;
        panel.innerHTML = table(['Name', 'Email', 'Role', 'Reports', 'Joined', 'Active', 'Actions'], d.users.map(u => `<tr>
          <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${badge(u.role)}</td><td>${u.item_count}</td><td>${fmtDate(u.created_at)}</td>
          <td>${u.is_active ? 'Yes' : '<span class="badge b-REJECTED">Deactivated</span>'}</td>
          <td>${u.id === me ? '<span class="muted small">You</span>' : `<div class="actions">
            <button class="btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ok'}" data-act="active" data-id="${u.id}" data-val="${u.is_active ? 0 : 1}">${u.is_active ? 'Deactivate' : 'Reactivate'}</button>
            <button class="btn btn-outline btn-sm" data-act="role" data-id="${u.id}" data-val="${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}">Make ${u.role === 'ADMIN' ? 'user' : 'admin'}</button></div>`}</td></tr>`));
      } else if (tab === 'items') {
        const d = await api('GET', '/admin/items');
        panel.innerHTML = table(['Item', 'Type', 'Reporter', 'Claims', 'Status', 'Actions'], d.items.map(i => `<tr>
          <td><a href="item-details.html?id=${i.id}">${esc(i.title)}</a><div class="small muted">${esc(i.location)}</div></td><td>${badge(i.type)}</td><td>${esc(i.reporter_name)}</td><td>${i.claim_count}</td>
          <td><select class="admin-select" data-act="status" data-id="${i.id}">${STATUSES.map(s => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td><button class="btn btn-danger btn-sm" data-act="delete" data-id="${i.id}">Remove</button></td></tr>`));
      } else {
        const d = await api('GET', '/admin/claims');
        panel.innerHTML = table(['Item', 'Claimant', 'Reporter', 'Message', 'Status', 'Date'], d.claims.map(c => `<tr>
          <td><a href="item-details.html?id=${c.item_id}">${esc(c.title)}</a></td><td>${esc(c.claimant_name)}</td><td>${esc(c.reporter_name)}</td>
          <td style="max-width:260px">${esc(c.message)}</td><td>${badge(c.status)}</td><td>${fmtDate(c.created_at)}</td></tr>`));
      }
    } catch (e) { panel.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }

  async function act(fn) { try { toast((await fn()).message, 'ok'); await loadStats(); loadTab(); } catch (e) { toast(e.message, 'err'); loadTab(); } }

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
    tab = t.dataset.tab; loadTab();
  }));
  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    if (b.dataset.act === 'active') act(() => api('PUT', '/admin/users/' + b.dataset.id, { is_active: b.dataset.val === '1' }));
    if (b.dataset.act === 'role' && confirm('Change this user\'s role?')) act(() => api('PUT', '/admin/users/' + b.dataset.id, { role: b.dataset.val }));
    if (b.dataset.act === 'delete' && confirm('Remove this report permanently?')) act(() => api('DELETE', '/admin/items/' + b.dataset.id));
  });
  panel.addEventListener('change', e => {
    const s = e.target.closest('select[data-act="status"]'); if (!s) return;
    act(() => api('PUT', `/admin/items/${s.dataset.id}/status`, { status: s.value }));
  });
  loadStats().then(loadTab);
})();
