// Handles two pages: report-lost/report-found (create + edit) and my-reports (table).
(function () {
  if (!PAGE_OK) return;
  const form = document.getElementById('report-form');
  if (form) setupForm(form); else setupMyReports();

  async function setupForm(form) {
    const msg = document.getElementById('msg');
    const btn = document.getElementById('submit');
    const editId = new URLSearchParams(location.search).get('edit');
    const f = (n) => document.getElementById(n);
    f('category').innerHTML = catOptions();
    f('item_date').max = new Date().toISOString().split('T')[0];
    f('item_date').value = f('item_date').max;

    if (editId) { // edit mode: load the existing report
      document.getElementById('form-title').textContent = 'Edit report';
      btn.textContent = 'Save changes';
      try {
        const { item } = (await api('GET', '/items/' + editId));
        if (!item.canManage) throw new Error('You cannot edit this report.');
        ['title', 'location', 'description'].forEach(k => f(k).value = item[k]);
        f('category').innerHTML = catOptions(item.category);
        f('item_date').value = String(item.item_date).slice(0, 10);
      } catch (e) { showError(msg, e.message); btn.disabled = true; }
    }

    form.addEventListener('submit', async e => {
      e.preventDefault(); msg.hidden = true;
      const fd = new FormData();
      ['title', 'category', 'item_date', 'location', 'description'].forEach(k => fd.append(k, f(k).value.trim()));
      if (!editId) fd.append('type', form.dataset.type);
      if (f('image').files[0]) {
        if (f('image').files[0].size > 2 * 1024 * 1024) return showError(msg, 'Image must be 2 MB or smaller.');
        fd.append('image', f('image').files[0]);
      }
      btn.disabled = true;
      try {
        const d = editId ? await api('PUT', '/items/' + editId, fd) : await api('POST', '/items', fd);
        toast(d.message, 'ok');
        setTimeout(() => window.location.href = editId ? 'item-details.html?id=' + editId : 'my-reports.html', 600);
      } catch (err) { showError(msg, err.message); btn.disabled = false; }
    });
  }

  async function setupMyReports() {
    const rows = document.getElementById('rows');
    async function load() {
      try {
        const d = await api('GET', '/items?mine=true&limit=50');
        rows.innerHTML = d.items.length ? d.items.map(i => {
          const acts = [`<a class="btn btn-outline btn-sm" href="item-details.html?id=${i.id}">View</a>`];
          if (['LOST', 'FOUND'].includes(i.status)) acts.push(`<a class="btn btn-outline btn-sm" href="report-${i.type.toLowerCase()}.html?edit=${i.id}">Edit</a>`, `<button class="btn btn-sm" data-act="status" data-status="CLOSED" data-id="${i.id}">Close</button>`);
          if (i.status === 'CLAIMED') acts.push(`<button class="btn btn-ok btn-sm" data-act="status" data-status="RETURNED" data-id="${i.id}">Mark returned</button>`);
          if (i.status === 'RETURNED') acts.push(`<button class="btn btn-sm" data-act="status" data-status="CLOSED" data-id="${i.id}">Close</button>`);
          if (i.status !== 'CLAIMED') acts.push(`<button class="btn btn-danger btn-sm" data-act="delete" data-id="${i.id}">Delete</button>`);
          return `<tr><td><strong>${esc(i.title)}</strong><div class="small muted">${esc(i.location)}</div></td><td>${badge(i.type)}</td><td>${badge(i.status)}</td><td>${fmtDate(i.item_date)}</td><td><div class="actions">${acts.join('')}</div></td></tr>`;
        }).join('') : '<tr><td colspan="5"><div class="empty">You have no reports yet.</div></td></tr>';
      } catch (e) { rows.innerHTML = `<tr><td colspan="5"><div class="alert alert-error">${esc(e.message)}</div></td></tr>`; }
    }
    rows.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      try {
        if (b.dataset.act === 'delete') {
          if (!confirm('Delete this report permanently?')) return;
          toast((await api('DELETE', '/items/' + b.dataset.id)).message, 'ok');
        } else toast((await api('PATCH', `/items/${b.dataset.id}/status`, { status: b.dataset.status })).message, 'ok');
        load();
      } catch (err) { toast(err.message, 'err'); }
    });
    load();
  }
})();
