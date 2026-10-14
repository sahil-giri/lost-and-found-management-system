(function () {
  if (!PAGE_OK) return;
  const list = document.getElementById('list');
  async function load() {
    try {
      const d = await api('GET', '/notifications');
      list.innerHTML = d.notifications.length ? d.notifications.map(n => `<div class="notif ${n.is_read ? '' : 'unread'}">
        <div><div>${esc(n.message)}</div><div class="small muted">${fmtDate(n.created_at)}${n.related_item_id ? ` · <a href="item-details.html?id=${n.related_item_id}">View item</a>` : ''}</div></div>
        ${n.is_read ? '' : `<button class="btn btn-outline btn-sm" data-id="${n.id}">Mark read</button>`}</div>`).join('')
        : '<div class="empty">No notifications yet.</div>';
    } catch (e) { list.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }
  list.addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    try { await api('PUT', `/notifications/${b.dataset.id}/read`); load(); } catch (err) { toast(err.message, 'err'); }
  });
  document.getElementById('read-all').addEventListener('click', async () => {
    try { await api('PUT', '/notifications/read-all'); load(); } catch (err) { toast(err.message, 'err'); }
  });
  load();
})();
