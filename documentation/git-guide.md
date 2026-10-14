# Git and GitHub Guide

Create an empty GitHub repo named `lost-and-found-management-system` (no README/.gitignore), then from the project root:

```bash
git init
git branch -M main
git add .gitignore README.md documentation screenshots
git commit -m "Initial project structure and documentation"
git add database
git commit -m "Add MySQL database schema and seed data"
git add backend/package.json backend/package-lock.json backend/.env.example backend/server.js backend/config backend/middleware backend/utils backend/setup-db.js
git commit -m "Set up Express backend, middleware and utilities"
git add backend/routes backend/controllers
git commit -m "Add auth, item, claim, notification and admin APIs"
git add backend/tests
git commit -m "Add API smoke tests"
git add frontend
git commit -m "Build frontend: auth, dashboard, items, claims, notifications, admin"
git remote add origin https://github.com/<your-username>/lost-and-found-management-system.git
git push -u origin main
```

Before pushing, check that secrets are not staged:
```bash
git status
git ls-files | grep -E "\.env$|node_modules"   # must print nothing
```
You may split or reorder these commits as you like; the point is a few meaningful commits instead of one huge one. If you want a history that shows the build over time, make your own commits as you read and understand each part.
