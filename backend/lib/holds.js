// lib/holds.js - Financial Holds placed by the Collections Officer.
const { db } = require('../db');

function activeHold(studentId) {
  return db.prepare('SELECT * FROM financial_holds WHERE student_id = ? AND released_at IS NULL ORDER BY id DESC LIMIT 1').get(studentId) || null;
}

module.exports = { activeHold };
