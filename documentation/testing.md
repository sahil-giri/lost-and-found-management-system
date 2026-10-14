# Testing

## 1. Automated API smoke test
File: `backend/tests/smoke.js`. Run with the server and seeded database up: `cd backend && npm run test:smoke`.
It creates two fresh users and walks the full workflow, plus admin checks using the seeded admin account.

It covers: registration, duplicate registration (409), invalid input (400), login, wrong password (401), missing/invalid token (401), reporting lost and found items, keyword search, combined filters, item view, invalid and missing IDs, claim rules (own item, short message, duplicate), contact hidden until approval, approval by non-owner (403), approve/reject rules, invalid status transitions, notifications and read-state isolation between users, dashboard stats, admin login, admin stats/lists, normal user hitting admin API (403), and admin override/delete.

**Result recorded while building this project:** 46 passed, 0 failed (run against MariaDB 10.x, a MySQL-compatible server, with Node 22). Please re-run it yourself on MySQL 8 and record your own result and date here:

| Date | Environment | Result |
|---|---|---|
| _fill in_ | _Node/MySQL versions_ | _x passed, y failed_ |

## 2. Browser walkthrough
A scripted Chromium run (Playwright) was also used to check: register → dashboard loads → report a found item → it appears in My Reports → search finds it → a second user (mobile viewport) submits a claim → owner approves → contact details appear for both → notifications page → admin login and Users tab → normal user visiting the admin page is redirected. No console errors were reported. That script is not part of the repository; repeat these steps manually.

## 3. Manual checklist (Postman / browser)
Tick these off yourself:
- [ ] 1 Register - 201 and token
- [ ] 2 Duplicate register - 409
- [ ] 3 Login - 200
- [ ] 4 Wrong password - 401
- [ ] 5 Call `GET /api/items` with a valid token - 200
- [ ] 6 Call it without a token - 401
- [ ] 7 Report lost item - 201, status LOST
- [ ] 8 Report found item - 201, status FOUND
- [ ] 9 Search `?q=wallet`
- [ ] 10 Filter `?type=LOST&category=Personal`
- [ ] 11 View item `/api/items/1`
- [ ] 12 Submit claim as another user - 201; again - 409
- [ ] 13 Approve (as reporter) and reject; try as another user - 403
- [ ] 14 Status: CLAIMED → RETURNED → CLOSED; try LOST → RETURNED - 400
- [ ] 15 Notifications appear and can be marked read
- [ ] 16 Admin login
- [ ] 17 Admin dashboard shows stats and tables
- [ ] 18 Normal user calling `/api/admin/users` - 403

## 4. Known gaps
No unit tests, no load testing, no automated browser tests in the repo, no penetration testing.
