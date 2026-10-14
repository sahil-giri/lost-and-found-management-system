# Interview Preparation Guide

Read the code for each answer once. Everything below is true of this codebase; do not claim anything beyond it (no deployment, no real-time features, no automated unit tests).

## 1-minute explanation
"I built a Lost and Found Management System for a college campus. Students register, report lost or found items with details and an optional photo, and search through everything using filters. If someone thinks an item is theirs, they submit a claim; the person who reported it approves or rejects it, and only after approval are contact details shared. Each item moves through a defined status flow - Lost or Found, then Claimed, Returned and Closed - and users get in-app notifications at each step. There's also an admin dashboard for moderating reports and users. It's built with HTML, CSS and vanilla JavaScript on the front end, Node.js and Express for a REST API, and MySQL for storage, with JWT authentication and bcrypt-hashed passwords."

## 2-minute explanation
Add: "The backend is layered: routes map URLs to controllers, middleware handles JWT verification, admin checks and validation, and controllers hold the logic with parameterized SQL queries. The claim approval runs in a database transaction so the claim, the item status and the rejection of competing claims all succeed or fail together. The status rules are in one file so a user can't jump from Lost to Returned. Role-based access is enforced on the server - the admin routes check the role from the database on every request, so hiding buttons in the UI is only cosmetic. I wrote an automated API test that runs the full workflow, and I documented the architecture, database design and API. A challenge was deciding what a 'claim' means for lost versus found items, and making sure contact details only leak after approval."

## Question bank
**What problem does it solve?** Campus lost-item posts get lost in chat groups. This gives one searchable record, a verification step before sharing contact details, and status tracking.

**Why this project?** It is a realistic CRUD + workflow problem that needs authentication, relational data, authorization and state management.

**Architecture?** Three tiers: browser (HTML/CSS/JS) ↔ Express REST API ↔ MySQL. Express also serves the static frontend. Inside the API: routes → middleware → controllers → database.

**Why MySQL?** The data is relational (users, items, claims, notifications with foreign keys), needs constraints (unique claim per user per item), joins, and transactions.

**Why Node.js and Express?** One language across front and back end, minimal framework with a huge ecosystem, easy to structure into routes/middleware/controllers, good for I/O-heavy API work.

**How does authentication work?** Login checks the email, compares the password with `bcrypt.compare`, then signs a JWT containing id and role with a secret from `.env`. The browser sends it as `Authorization: Bearer`. `authMiddleware` verifies it and loads the user from the DB.

**What is JWT?** A signed token with header, payload and signature. The server can verify it wasn't tampered with without keeping session state. Payload is encoded, not encrypted, so no secrets go inside.

**How are passwords stored?** Only as bcrypt hashes (salted, 10 rounds) in `users.password`. Plain passwords are never stored or logged.

**Role-based authorization?** `users.role` is USER or ADMIN. `adminMiddleware` checks `req.user.role === 'ADMIN'` on all `/api/admin` routes and returns 403 otherwise. Ownership checks (only the reporter can decide a claim) are in the controllers.

**Tables?** users, items, claims, notifications (see database-design.md).

**Relationships?** One user → many items, claims, notifications. One item → many claims. Foreign keys with cascade deletes; unique (item_id, claimant_id) on claims.

**How does a user report a lost item?** The form posts multipart data to `POST /api/items`; multer handles the image; express-validator validates; the controller inserts a row with status = LOST using a prepared statement.

**How does the claim system work?** Claimant posts a message; reporter is notified. Reporter approves/rejects. Approval (in a transaction) sets item CLAIMED, rejects other pending claims, notifies everyone affected, and unlocks contact details for the two parties.

**Status workflow?** LOST/FOUND → CLAIMED (only via approval) → RETURNED → CLOSED, plus withdrawal (→ CLOSED) and a revert from CLAIMED to the original type if handover fails. Enforced by `statusRules.js`; admins can override.

**How does the frontend talk to the backend?** `fetch()` calls wrapped in `api()` in `api.js`, which adds the JWT header, sends JSON (or FormData for images) and converts errors into messages shown to the user.

**REST APIs?** Auth, items (CRUD + status + nested claims), claims, notifications, users/me, admin. See api-documentation.md.

**Error handling?** Validation errors → 400 with messages; auth → 401/403; missing → 404; duplicates → 409; everything unexpected goes to a central error handler that logs details and returns a generic 500.

**Security measures?** bcrypt, JWT, protected routes, server-side role checks, express-validator, parameterized queries, helmet headers, restricted CORS option, file type/size limits with random filenames, output escaping in the frontend, secrets in `.env` (git-ignored), same error message for wrong email or password. Not "fully secure": no rate limiting, and the JWT is in localStorage.

**Challenges?** Designing claim semantics for both item types; keeping approval consistent (solved with a transaction); controlling who sees contact details; keeping frontend and backend validation aligned.

**Improvements?** Rate limiting, httpOnly cookies/refresh tokens, email notifications, FULLTEXT search, Jest tests and CI, cloud image storage, similarity matching, audit log.

**What happens when a user calls an admin API?** The request passes `authMiddleware` (valid token), then `adminMiddleware` sees role USER and returns 403 "Access denied". Without a token it stops earlier with 401.

## Be ready to demo / explain in code
`backend/server.js`, `middleware/authMiddleware.js`, `controllers/claimController.js` (the transaction), `utils/statusRules.js`, `frontend/js/api.js`.
