// Item status workflow (see documentation/system-design.md for the diagram).
//   LOST/FOUND -> CLAIMED  (only through claim approval, never by a manual status change)
//   CLAIMED    -> RETURNED | back to original type (LOST/FOUND) if the handover fails
//   RETURNED   -> CLOSED
//   LOST/FOUND -> CLOSED   (reporter withdraws the report)
const STATUSES = ['LOST', 'FOUND', 'CLAIMED', 'RETURNED', 'CLOSED'];

const TRANSITIONS = {
  LOST: ['CLAIMED', 'CLOSED'],
  FOUND: ['CLAIMED', 'CLOSED'],
  CLAIMED: ['LOST', 'FOUND', 'RETURNED'],
  RETURNED: ['CLOSED'],
  CLOSED: []
};

// Can a normal user manually move an item from `from` to `to`? `type` is the item's original type.
function canUserTransition(from, to, type) {
  if (to === 'CLAIMED') return false; // must go through claim approval
  if (!TRANSITIONS[from] || !TRANSITIONS[from].includes(to)) return false;
  if (from === 'CLAIMED' && (to === 'LOST' || to === 'FOUND')) return to === type; // revert only to original type
  return true;
}

module.exports = { STATUSES, TRANSITIONS, canUserTransition };
