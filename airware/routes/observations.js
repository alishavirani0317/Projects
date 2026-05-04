var express = require('express');
var router = express.Router();
const db = require('../db');

// require authenticated session
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Authentication required' });
}

// POST /observations - save an observation
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.userId || user.user_id || user.id;
    const countyFromSession = user.county || null;

    const { state, eis_sector, observation_category } = req.body;

    if (!state || !observation_category) {
      return res.status(400).json({ message: 'state and observation_category are required' });
    }

    // Use county from session if frontend doesn't provide it
    const county = req.body.county || countyFromSession || '';

    // Insert into Observation table. Columns must match your schema.
    const sql = 'INSERT INTO Observation (user_id, state, county, eis_sector, observation_category) VALUES (?, ?, ?, ?, ?)';
    const params = [String(userId), state, county, eis_sector || '', observation_category];

    await db.query(sql, params);
    res.status(201).json({ message: 'Observation saved' });
  } catch (err) {
    console.error('Error saving observation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /observations - list observations for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.userId || user.user_id || user.id;
    const [rows] = await db.query('SELECT * FROM Observation WHERE user_id = ? ORDER BY eis_sector, observation_category', [String(userId)]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching observations:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /observations - delete a single observation (requires JSON body)
router.delete('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.userId || user.user_id || user.id;
    const { eis_sector, observation_category } = req.body;
    if (!eis_sector || !observation_category) return res.status(400).json({ message: 'eis_sector and observation_category required' });

    const sql = 'DELETE FROM Observation WHERE user_id = ? AND eis_sector = ? AND observation_category = ?';
    const [result] = await db.query(sql, [String(userId), eis_sector, observation_category]);
    // result.affectedRows indicates deletion
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Observation not found' });
    res.json({ message: 'Observation deleted' });
  } catch (err) {
    console.error('Error deleting observation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /observations - update a single observation
router.put('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.userId || user.user_id || user.id;
    const { old_eis_sector, old_observation_category, state, county, eis_sector, observation_category } = req.body;
    if (!old_eis_sector || !old_observation_category) return res.status(400).json({ message: 'old_eis_sector and old_observation_category required' });

    // Use provided new values or fall back to old ones
    const newEis = eis_sector || old_eis_sector;
    const newCat = observation_category || old_observation_category;
    const newState = state || null;
    const newCounty = county || null;

    const sql = 'UPDATE Observation SET state = ?, county = ?, eis_sector = ?, observation_category = ? WHERE user_id = ? AND eis_sector = ? AND observation_category = ?';
    try {
      const [result] = await db.query(sql, [newState, newCounty, newEis, newCat, String(userId), old_eis_sector, old_observation_category]);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Observation not found' });
      res.json({ message: 'Observation updated' });
    } catch (err) {
      // handle duplicate key when changing composite PK
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'An observation with the new EIS sector and category already exists' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Error updating observation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
