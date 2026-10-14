(async function () {
  if (!PAGE_OK) return;
  try {
    const [s, n] = await Promise.all([api('GET', '/users/me/stats'), api('GET', '/notifications')]);
    const card = (num, lbl) => `<div class="card stat"><span class="num">${num}</span><span class="lbl">${lbl}</span></div>`;
    document.getElementById('stats').innerHTML =
      card(s.totalItems, 'Total reports') + card(s.lostItems, 'Lost reports') + card(s.foundItems, 'Found reports') +
      card(s.returnedItems, 'Returned items') + card(s.pendingClaimsReceived, 'Claims awaiting my decision') +
      card(s.pendingClaimsMade, 'My pending claims') + card(s.unreadNotifications, 'Unread notifications') +
      `<div class="card stat"><span class="lbl">Quick links</span><a href="my-reports.html">My reports</a><a href="my-claims.html">Claims</a></div>`;
    document.getElementById('recent').innerHTML = s.recent.length
      ? s.recent.map(i => `<div class="list-row"><div><a href="item-details.html?id=${i.id}"><strong>${esc(i.title)}</strong></a><div class="small muted">${esc(i.location)} · ${fmtDate(i.item_date)}</div></div><div>${badge(i.status)}</div></div>`).join('')
      : '<div class="empty">You have not reported anything yet.</div>';
    const top = n.notifications.slice(0, 5);
    document.getElementById('notifs').innerHTML = top.length
      ? top.map(x => `<div class="list-row"><span class="${x.is_read ? 'muted' : ''} small">${x.is_read ? '' : '● '}${esc(x.message)}</span></div>`).join('')
      : '<div class="empty">No notifications yet.</div>';
  } catch (e) {
    document.getElementById('stats').innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
})();
