(function () {
  if (!PAGE_OK) return;
  const form = document.getElementById('filters');
  const list = document.getElementById('list');
  const pager = document.getElementById('pager');
  const count = document.getElementById('count');
  let page = 1;

  document.getElementById('category').insertAdjacentHTML('beforeend', catOptions());
  // Pre-fill filters from the URL (?type=LOST&q=wallet)
  const params = new URLSearchParams(location.search);
  ['q', 'type', 'category', 'status', 'location'].forEach(k => { if (params.get(k)) form[k].value = params.get(k); });

  async function load() {
    list.innerHTML = '<div class="loading" style="grid-column:1/-1">Loading...</div>';
    const qs = new URLSearchParams({ page, limit: 9 });
    ['q', 'type', 'category', 'status', 'location'].forEach(k => { if (form[k].value.trim()) qs.set(k, form[k].value.trim()); });
    try {
      const d = await api('GET', '/items?' + qs.toString());
      count.textContent = `${d.total} item${d.total === 1 ? '' : 's'} found`;
      list.innerHTML = d.items.length ? d.items.map(itemCard).join('')
        : '<div class="empty card" style="grid-column:1/-1">No items match your search. Try different filters.</div>';
      pager.innerHTML = d.totalPages > 1
        ? `<button class="btn btn-outline btn-sm" id="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button><span class="small">Page ${d.page} of ${d.totalPages}</span><button class="btn btn-outline btn-sm" id="next" ${page >= d.totalPages ? 'disabled' : ''}>Next</button>` : '';
      const p = document.getElementById('prev'), n = document.getElementById('next');
      if (p) p.onclick = () => { page--; load(); window.scrollTo(0, 0); };
      if (n) n.onclick = () => { page++; load(); window.scrollTo(0, 0); };
    } catch (e) { list.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${esc(e.message)}</div>`; }
  }

  form.addEventListener('submit', e => { e.preventDefault(); page = 1; load(); });
  document.getElementById('reset').addEventListener('click', () => { form.reset(); page = 1; load(); });
  load();
})();
