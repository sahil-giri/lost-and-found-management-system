(function () {
  if (!PAGE_OK) return;
  const box = document.getElementById('detail');
  const id = new URLSearchParams(location.search).get('id');
  const me = Auth.user;
  let item;

  const contact = c => `<div class="contact-box"><strong>Contact details</strong><br>${esc(c.name)}<br>📧 ${esc(c.email)}${c.phone ? '<br>📞 ' + esc(c.phone) : ''}</div>`;

  async function load() {
    try { item = (await api('GET', '/items/' + id)).item; render(); }
    catch (e) { box.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }

  function ownerActions() {
    const a = [];
    if (['LOST', 'FOUND'].includes(item.status)) {
      a.push(`<a class="btn btn-outline btn-sm" href="report-${item.type.toLowerCase()}.html?edit=${item.id}">Edit</a>`);
      if (item.user_id === me.id) a.push(`<button class="btn btn-sm" data-act="status" data-status="CLOSED">Withdraw / close</button>`);
    }
    if (item.user_id === me.id) {
      if (item.status === 'CLAIMED') a.push(`<button class="btn btn-ok btn-sm" data-act="status" data-status="RETURNED">Mark returned</button>`,
        `<button class="btn btn-outline btn-sm" data-act="status" data-status="${item.type}">Handover failed - reopen</button>`);
      if (item.status === 'RETURNED') a.push(`<button class="btn btn-sm" data-act="status" data-status="CLOSED">Close case</button>`);
    }
    if (item.status !== 'CLAIMED' || me.role === 'ADMIN') a.push(`<button class="btn btn-danger btn-sm" data-act="delete">Delete</button>`);
    return a.join(' ');
  }

  function claimsSection() {
    if (item.canManage) {
      if (!item.claims.length) return '<div class="card"><h2>Claims</h2><div class="empty">No claims yet.</div></div>';
      return `<div class="card"><h2>Claims (${item.claims.length})</h2>${item.claims.map(c => `<div class="claim-box">
        <div class="page-head" style="margin:0 0 .3rem"><strong>${esc(c.claimant_name)}</strong>${badge(c.status)}</div>
        <p style="margin:.2rem 0">${esc(c.message)}</p><div class="small muted">${fmtDate(c.created_at)}</div>
        ${c.status === 'APPROVED' && c.contact ? contact(c.contact) : ''}
        ${c.status === 'PENDING' && ['LOST', 'FOUND'].includes(item.status) ? `<div class="actions" style="margin-top:.5rem">
          <button class="btn btn-ok btn-sm" data-act="decide" data-claim="${c.id}" data-status="APPROVED">Approve</button>
          <button class="btn btn-danger btn-sm" data-act="decide" data-claim="${c.id}" data-status="REJECTED">Reject</button></div>` : ''}</div>`).join('')}</div>`;
    }
    if (item.myClaim) {
      return `<div class="card"><h2>Your claim</h2><div class="page-head" style="margin:0">${badge(item.myClaim.status)}<span class="small muted">${fmtDate(item.myClaim.created_at)}</span></div>
        <p>${esc(item.myClaim.message)}</p>
        ${item.myClaim.status === 'APPROVED' ? contact(item.myClaim.contact) : item.myClaim.status === 'PENDING' ? '<p class="muted small">Waiting for the reporter to review your claim. Contact details are shared after approval.</p>' : ''}</div>`;
    }
    if (['LOST', 'FOUND'].includes(item.status)) {
      const lbl = item.type === 'FOUND' ? 'Is this yours? Explain how you know' : 'Did you find this? Explain how you know';
      return `<div class="card"><h2>${item.type === 'FOUND' ? 'Claim this item' : 'I found this item'}</h2><div id="cmsg" class="alert" hidden></div>
        <form id="claim-form"><div class="form-group"><label for="cmessage">${lbl}</label>
        <textarea id="cmessage" required placeholder="Describe identifying details only the real owner/finder would know."></textarea></div>
        <button class="btn" id="csubmit">Submit claim</button></form></div>`;
    }
    return '<div class="card"><p class="muted">This item is no longer open for claims.</p></div>';
  }

  function render() {
    document.title = item.title + ' | Lost & Found';
    box.innerHTML = `<div class="detail-grid"><div class="card">
      ${item.image_path ? `<img class="detail-img" src="${esc(imgUrl(item.image_path))}" alt="${esc(item.title)}">` : ''}
      <div class="badges" style="margin-bottom:.5rem">${badges(item)}</div><h1>${esc(item.title)}</h1>
      <p style="white-space:pre-wrap">${esc(item.description)}</p>
      <dl class="meta"><dt>Category</dt><dd>${esc(item.category)}</dd><dt>Location</dt><dd>${esc(item.location)}</dd>
      <dt>Date ${item.type === 'LOST' ? 'lost' : 'found'}</dt><dd>${fmtDate(item.item_date)}</dd><dt>Reported by</dt><dd>${esc(item.reporter_name)}</dd>
      <dt>Reported on</dt><dd>${fmtDate(item.created_at)}</dd></dl>
      ${item.canManage ? `<div class="actions" style="margin-top:1rem">${ownerActions()}</div>` : ''}</div>
      <div id="side">${claimsSection()}</div></div>`;
  }

  box.addEventListener('submit', async e => {
    if (e.target.id !== 'claim-form') return;
    e.preventDefault();
    const msg = document.getElementById('cmsg'); msg.hidden = true;
    const message = document.getElementById('cmessage').value.trim();
    if (message.length < 10) return showError(msg, 'Please explain your claim in at least 10 characters.');
    document.getElementById('csubmit').disabled = true;
    try { toast((await api('POST', `/items/${id}/claims`, { message })).message, 'ok'); load(); }
    catch (err) { showError(msg, err.message); document.getElementById('csubmit').disabled = false; }
  });

  box.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    try {
      if (b.dataset.act === 'decide') {
        toast((await api('PUT', '/claims/' + b.dataset.claim, { status: b.dataset.status })).message, 'ok');
      } else if (b.dataset.act === 'status') {
        const path = me.role === 'ADMIN' && item.user_id !== me.id ? `/admin/items/${id}/status` : `/items/${id}/status`;
        toast((await api(path.startsWith('/admin') ? 'PUT' : 'PATCH', path, { status: b.dataset.status })).message, 'ok');
      } else if (b.dataset.act === 'delete') {
        if (!confirm('Delete this report permanently?')) return;
        const path = me.role === 'ADMIN' && item.user_id !== me.id ? '/admin/items/' + id : '/items/' + id;
        toast((await api('DELETE', path)).message, 'ok');
        return setTimeout(() => window.location.href = 'items.html', 700);
      }
      load();
    } catch (err) { toast(err.message, 'err'); }
  });
  load();
})();
