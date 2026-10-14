const pool = require('../config/db');

// Insert an in-app notification. Pass a transaction connection as `db` to include it in a transaction.
async function notify(userId, message, itemId = null, db = pool) {
  await db.execute(
    'INSERT INTO notifications (user_id, message, related_item_id) VALUES (?, ?, ?)',
    [userId, message, itemId]
  );
}

module.exports = notify;
