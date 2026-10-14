# Deployment Guide (not deployed yet)

This project has **not** been deployed. These are options and the changes each needs.

## Simplest option: one service
Express already serves `frontend/` and the API on one port, so you can deploy just the `backend` folder as a single Node web service (e.g. Render, Railway) plus a managed MySQL database (e.g. Railway MySQL, Aiven, PlanetScale-compatible MySQL). No CORS setup needed because frontend and API share an origin.

Steps (generic):
1. Push the repo to GitHub.
2. Create a MySQL database on your provider; run `database/schema.sql` and `database/seed.sql` (or `--no-seed`) against it.
3. Create a Web Service from the repo: root directory `backend`, build `npm install`, start `npm start`.
4. Set environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (new strong value), `JWT_EXPIRES_IN`, `PORT` if required.
5. Note that `schema.sql` creates and selects a database named `lost_and_found`; if your provider gives you a fixed database name, remove the `CREATE DATABASE`/`USE` lines and set `DB_NAME` accordingly.
6. Change the seeded admin password immediately (or create your own admin and remove the demo accounts).

## Split option: static frontend + separate API
- Host `frontend/` on static hosting (Netlify, Vercel static, GitHub Pages).
- In `frontend/js/api.js` set `API_BASE` to your backend URL, e.g. `https://your-api.example.com/api`.
- On the backend set `CORS_ORIGIN` to the frontend URL.
- Serve over HTTPS.

## Things to know
- **Uploaded images** are saved to `backend/uploads/` on local disk. Many free hosts wipe disk on redeploy; use a persistent disk or move to cloud object storage later.
- Use HTTPS in production; use a long random `JWT_SECRET`.
- Free tiers may sleep when idle, so the first request can be slow.
