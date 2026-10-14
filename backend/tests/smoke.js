// End-to-end API smoke test. Run the server first (npm start), then: npm run test:smoke
// Uses a fresh random email each run. Admin tests use the seeded admin (admin@campus.edu / Password@123).
const BASE = process.env.BASE_URL || 'http://localhost:5000';
let passed = 0, failed = 0;

async function call(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { status: res.status, data };
}
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}
function itemForm(type, title) {
  const f = new FormData();
  f.append('type', type); f.append('title', title); f.append('description', 'Black leather wallet with a college ID inside.');
  f.append('category', 'Personal'); f.append('location', 'Library'); f.append('item_date', '2026-10-02');
  return f;
}

(async () => {
  const stamp = Date.now();
  const A = { name: 'Test Owner', email: `owner${stamp}@test.edu`, password: 'Password1' };
  const B = { name: 'Test Claimant', email: `claimant${stamp}@test.edu`, password: 'Password1' };
  let r;

  console.log('Authentication');
  r = await call('POST', '/api/auth/register', { body: A }); check('1. register user A (201)', r.status === 201 && r.data.token); A.token = r.data.token;
  r = await call('POST', '/api/auth/register', { body: B }); B.token = r.data.token; check('1b. register user B', r.status === 201);
  r = await call('POST', '/api/auth/register', { body: A }); check('2. duplicate email -> 409', r.status === 409);
  r = await call('POST', '/api/auth/register', { body: { name: 'X', email: 'bad', password: '1' } }); check('2b. invalid input -> 400', r.status === 400);
  r = await call('POST', '/api/auth/login', { body: { email: A.email, password: A.password } }); check('3. login (200 + token)', r.status === 200 && !!r.data.token);
  r = await call('POST', '/api/auth/login', { body: { email: A.email, password: 'WrongPass1' } }); check('4. wrong password -> 401', r.status === 401);
  r = await call('GET', '/api/items'); check('5/6. no token -> 401', r.status === 401);
  r = await call('GET', '/api/items', { token: 'garbage' }); check('5b. bad token -> 401', r.status === 401);

  console.log('Items');
  r = await call('POST', '/api/items', { token: A.token, form: itemForm('LOST', 'Black Leather Wallet') });
  check('7. report LOST item (201)', r.status === 201); const lostId = r.data.id;
  r = await call('POST', '/api/items', { token: A.token, form: itemForm('FOUND', 'Blue Umbrella') });
  check('8. report FOUND item (201)', r.status === 201); const foundId = r.data.id;
  r = await call('POST', '/api/items', { token: A.token, form: (() => { const f = itemForm('LOST', 'ab'); return f; })() }); check('8b. short title -> 400', r.status === 400);
  r = await call('GET', '/api/items?q=Umbrella', { token: B.token }); check('9. keyword search finds item', r.data.items && r.data.items.some(i => i.id === foundId));
  r = await call('GET', '/api/items?type=LOST&category=Personal&status=LOST&location=Lib', { token: B.token });
  check('10. combined filters', r.status === 200 && r.data.items.every(i => i.type === 'LOST' && i.category === 'Personal') && r.data.items.some(i => i.id === lostId));
  r = await call('GET', `/api/items/${foundId}`, { token: B.token }); check('11. view item', r.status === 200 && r.data.item.title === 'Blue Umbrella');
  r = await call('GET', '/api/items/999999', { token: B.token }); check('11b. missing item -> 404', r.status === 404);
  r = await call('GET', '/api/items/abc', { token: B.token }); check('11c. invalid id -> 400', r.status === 400);

  console.log('Claims');
  r = await call('POST', `/api/items/${foundId}/claims`, { token: A.token, body: { message: 'This is mine really' } }); check('12a. cannot claim own item -> 400', r.status === 400);
  r = await call('POST', `/api/items/${foundId}/claims`, { token: B.token, body: { message: 'short' } }); check('12b. short claim -> 400', r.status === 400);
  r = await call('POST', `/api/items/${foundId}/claims`, { token: B.token, body: { message: 'It is my umbrella, it has a red handle.' } }); check('12. submit claim (201)', r.status === 201);
  r = await call('POST', `/api/items/${foundId}/claims`, { token: B.token, body: { message: 'It is my umbrella, it has a red handle.' } }); check('12c. duplicate claim -> 409', r.status === 409);
  r = await call('GET', '/api/notifications', { token: A.token }); check('15a. reporter notified of claim', r.data.unread >= 1 && /claim/i.test(r.data.notifications[0].message));
  const notifId = r.data.notifications[0].id;
  r = await call('GET', `/api/items/${foundId}`, { token: B.token }); check('12d. contact hidden while PENDING', r.data.item.myClaim && !r.data.item.myClaim.contact);
  r = await call('GET', '/api/claims', { token: A.token }); const claimId = r.data.received[0].id; check('12e. reporter sees received claim', !!claimId);
  r = await call('PUT', `/api/claims/${claimId}`, { token: B.token, body: { status: 'APPROVED' } }); check('13a. non-owner cannot approve -> 403', r.status === 403);
  r = await call('PUT', `/api/claims/${claimId}`, { token: A.token, body: { status: 'MAYBE' } }); check('13b. invalid decision -> 400', r.status === 400);
  r = await call('PUT', `/api/claims/${claimId}`, { token: A.token, body: { status: 'APPROVED' } }); check('13. approve claim', r.status === 200);
  r = await call('GET', `/api/items/${foundId}`, { token: B.token }); check('13c. item CLAIMED + contact revealed to claimant', r.data.item.status === 'CLAIMED' && r.data.item.myClaim.contact && r.data.item.myClaim.contact.email === A.email);
  r = await call('PUT', `/api/claims/${claimId}`, { token: A.token, body: { status: 'REJECTED' } }); check('13d. decided claim cannot be re-decided -> 400', r.status === 400);

  console.log('Status workflow');
  r = await call('PATCH', `/api/items/${foundId}/status`, { token: A.token, body: { status: 'CLOSED' } }); check('14a. CLAIMED -> CLOSED rejected -> 400', r.status === 400);
  r = await call('PATCH', `/api/items/${lostId}/status`, { token: A.token, body: { status: 'RETURNED' } }); check('14b. LOST -> RETURNED rejected -> 400', r.status === 400);
  r = await call('PATCH', `/api/items/${foundId}/status`, { token: B.token, body: { status: 'RETURNED' } }); check('14c. non-reporter cannot change status -> 403', r.status === 403);
  r = await call('PATCH', `/api/items/${foundId}/status`, { token: A.token, body: { status: 'RETURNED' } }); check('14. CLAIMED -> RETURNED', r.status === 200);
  r = await call('PATCH', `/api/items/${foundId}/status`, { token: A.token, body: { status: 'CLOSED' } }); check('14d. RETURNED -> CLOSED', r.status === 200);
  r = await call('GET', '/api/notifications', { token: B.token }); check('15b. claimant notified (approved + returned)', r.data.notifications.some(n => /approved/i.test(n.message)) && r.data.notifications.some(n => /returned/i.test(n.message)));
  r = await call('PUT', `/api/notifications/${notifId}/read`, { token: A.token }); check('15c. mark notification read', r.status === 200);
  r = await call('PUT', `/api/notifications/${notifId}/read`, { token: B.token }); check('15d. cannot read-mark others\' notification -> 404', r.status === 404);
  r = await call('GET', '/api/users/me/stats', { token: A.token }); check('dashboard stats', r.status === 200 && r.data.totalItems === 2 && r.data.returnedItems === 1);

  console.log('Admin');
  r = await call('GET', '/api/admin/users', { token: A.token }); check('18. normal user on admin API -> 403', r.status === 403);
  r = await call('GET', '/api/admin/users'); check('18b. no token on admin API -> 401', r.status === 401);
  r = await call('POST', '/api/auth/login', { body: { email: 'admin@campus.edu', password: 'Password@123' } }); check('16. admin login', r.status === 200 && r.data.user.role === 'ADMIN'); const adm = r.data.token;
  r = await call('GET', '/api/admin/stats', { token: adm }); check('17. admin stats', r.status === 200 && r.data.totalUsers >= 3);
  r = await call('GET', '/api/admin/items', { token: adm }); check('17b. admin items', r.status === 200 && r.data.items.length > 0);
  r = await call('GET', '/api/admin/claims', { token: adm }); check('17c. admin claims', r.status === 200);
  r = await call('PUT', `/api/admin/items/${lostId}/status`, { token: adm, body: { status: 'CLOSED' } }); check('admin can override status', r.status === 200);
  r = await call('DELETE', `/api/admin/items/${lostId}`, { token: adm }); check('admin can delete report', r.status === 200);
  r = await call('GET', `/api/items/${lostId}`, { token: adm }); check('deleted item is 404', r.status === 404);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Test run crashed:', e.message); process.exit(1); });
