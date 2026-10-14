# API Documentation

Base URL: `http://localhost:5000/api`. Bodies are JSON unless marked *multipart*. Protected routes need `Authorization: Bearer <token>`.
Errors always look like `{ "message": "..." }` (validation errors also include an `errors` array).

## Status codes used
| Code | When |
|---|---|
| 200 OK | Successful read/update/delete |
| 201 Created | New record created |
| 400 Bad Request | Validation failed, invalid ID, invalid status change, business-rule violation |
| 401 Unauthorized | Missing/invalid/expired token, wrong login |
| 403 Forbidden | Logged in but not allowed (not owner, not admin, deactivated) |
| 404 Not Found | Item/claim/notification/route does not exist |
| 409 Conflict | Duplicate email or duplicate claim |
| 500 Internal Server Error | Unexpected server/database error (details logged server-side only) |

## Auth
### POST /api/auth/register - public
Body: `{ "name", "email", "password", "phone?" }` (password ≥ 8 chars, with a letter and a number)
201: `{ message, token, user:{id,name,email,phone,role} }` · Errors: 400 validation, 409 email exists.

### POST /api/auth/login - public
Body: `{ "email", "password" }` → 200: `{ message, token, user }` · Errors: 400, 401 invalid credentials, 403 deactivated.

## Items (all require login)
### GET /api/items
Query: `q` (keyword in title/description/location), `type` (LOST|FOUND), `category`, `status`, `location`, `mine=true`, `page`, `limit` (max 50).
200: `{ items:[...], page, limit, total, totalPages }`. Without a `status` filter, CLOSED items are hidden (except with `mine=true`).

### GET /api/items/:id
200: `{ item }` including `myClaim` (viewer's own claim) and, for the reporter/admin, `claims` and `canManage`. Contact details appear only inside APPROVED claims. Errors: 400 invalid id, 404.

### POST /api/items - *multipart/form-data*
Fields: `type` (LOST|FOUND), `title` (3-150), `description` (≥10), `category`, `location`, `item_date` (YYYY-MM-DD, not future), `image?` (jpg/png/webp ≤ 2 MB).
201: `{ message, id }`. Initial status = type. Errors: 400.

### PUT /api/items/:id - *multipart*, reporter (while LOST/FOUND) or admin
Same fields except `type`. 200 / 400 / 403 / 404.

### DELETE /api/items/:id - reporter (not while CLAIMED) or admin
200 / 400 / 403 / 404.

### PATCH /api/items/:id/status - reporter only
Body: `{ "status": "RETURNED" }`. Allowed: see status workflow. 200: `{ message, status }`. Errors: 400 invalid transition, 403 not the reporter, 404.

### POST /api/items/:id/claims
Body: `{ "message" }` (≥ 10 chars). 201: `{ message, id }`. Errors: 400 (own item, item not open, short message), 404, 409 already claimed by you.

## Claims (require login)
### GET /api/claims
200: `{ made:[claims I submitted], received:[claims on my items] }`. `contact` is included only when the claim is APPROVED.

### PUT /api/claims/:id - item reporter or admin
Body: `{ "status": "APPROVED" | "REJECTED" }`. Approving sets the item to CLAIMED and rejects other pending claims. Errors: 400 (already decided, item not open, bad value), 403, 404.

## Notifications (require login)
- `GET /api/notifications` → `{ notifications:[{id,message,is_read,related_item_id,created_at}], unread }`
- `PUT /api/notifications/:id/read` → 200, or 404 if it is not yours
- `PUT /api/notifications/read-all` → 200

## Users (require login)
- `GET /api/users/me` → `{ user }`
- `PUT /api/users/me` - body `{ name, phone?, currentPassword?, newPassword? }`
- `GET /api/users/me/stats` → dashboard numbers and recent reports

## Admin (require login AND role ADMIN; otherwise 401/403)
- `GET /api/admin/stats` → `{ totalUsers, lostReports, foundReports, pendingClaims, returnedItems, recent }`
- `GET /api/admin/users`, `GET /api/admin/items`, `GET /api/admin/claims`
- `PUT /api/admin/users/:id` - body `{ role?, is_active? }` (cannot modify yourself)
- `PUT /api/admin/items/:id/status` - body `{ status }` (any valid status; owner is notified)
- `DELETE /api/admin/items/:id` - removes a report (owner is notified)
