(function () {
  if (!PAGE_OK) return;
  const recv = document.getElementById('received'), made = document.getElementById('made');
  const contact = c => `<div class="contact-box"><strong>Contact</strong><br>${esc(c.name)} · ${esc(c.email)}${c.phone ? ' · ' + esc(c.phone) : ''}</div>`;

  async function load() {
    try {
      const d = await api('GET', '/claims');
      recv.innerHTML = d.received.length ? d.received.map(c => `<div class="card"><div class="page-head" style="margin:0 0 .3rem">
        <div><a href="item-details.html?id=${c.item_id}"><strong>${esc(c.title)}</strong></a> ${badge(c.item_status)}</div>${badge(c.status)}</div>
        <div class="small muted">From ${esc(c.claimant_name)} · ${fmtDate(c.created_at)}</div><p>${esc(c.message)}</p>
        ${c.contact ? contact(c.contact) : ''}
        ${c.status === 'PENDING' && ['LOST', 'FOUND'].includes(c.item_status) ? `<div class="actions">
          <button class="btn btn-ok btn-sm" data-claim="${c.id}" data-status="APPROVED">Approve</button>
          <button class="btn btn-danger btn-sm" data-claim="${c.id}" data-status="REJECTED">Reject</button></div>` : ''}</div>`).join('')
        : '<div class="empty card">No one has claimed your reports yet.</div>';
      made.innerHTML = d.made.length ? d.made.map(c => `<div class="card"><div class="page-head" style="margin:0 0 .3rem">
        <div><a href="item-details.html?id=${c.item_id}"><strong>${esc(c.title)}</strong></a> ${badge(c.item_status)}</div>${badge(c.status)}</div>
        <div class="small muted">Reported by ${esc(c.reporter_name)} · ${fmtDate(c.created_at)}</div><p>${esc(c.message)}</p>
        ${c.contact ? contact(c.contact) : ''}</div>`).join('')
        : '<div class="empty card">You have not submitted any claims.</div>';
    } catch (e) { recv.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }
  recv.addEventListener('click', async e => {
    const b = e.target.closest('button[data-claim]'); if (!b) return;
    try { toast((await api('PUT', '/claims/' + b.dataset.claim, { status: b.dataset.status })).message, 'ok'); load(); }
    catch (err) { toast(err.message, 'err'); }
  });
  load();
})();
