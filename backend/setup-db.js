// Runs database/schema.sql and database/seed.sql using the credentials in .env
// Usage: npm run db:setup           (schema + seed)
//        npm run db:setup -- --no-seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });
  const dir = path.join(__dirname, '..', 'database');
  await conn.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
  console.log('Schema created.');
  if (!process.argv.includes('--no-seed')) {
    await conn.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    console.log('Seed data inserted. Admin login: admin@campus.edu / Password@123');
  }
  await conn.end();
})().catch(e => { console.error('Database setup failed:', e.message); process.exit(1); });
