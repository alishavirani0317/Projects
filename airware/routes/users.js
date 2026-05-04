var express = require('express');
var router = express.Router();
const db = require('../db');

// Helper function to generate a unique user_id
async function generateUniqueUserId() {
  let userId;
  let exists = true;
  while (exists) {
    userId = Math.floor(Math.random() * 1000000); // Generate random 6-digit number
    const [rows] = await db.query('SELECT user_id FROM User WHERE user_id = ?', [userId]);
    exists = rows.length > 0;
  }
  return userId;
}

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  console.log('isAuthenticated middleware - session:', req.session);
  if (req.session && req.session.user) {
    console.log('isAuthenticated: user present:', req.session.user.email || req.session.user.name);
    return next(); // User is authenticated, proceed to the next middleware/route
  }
  console.log('isAuthenticated: no user, redirecting to /');
  res.redirect('/'); // Redirect to login page if not authenticated
}

// GET /users
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const table = req.query.table || "User";

    // User search
    const search = req.query.search || "";

    // Measurement filters
    const state = req.query.state || "";
    const county = req.query.county || "";
    const year = req.query.year ?? ""; // Safe nullish coalescing

    const allowedTables = [
      "User",
      "Measurements_by_year"
    ];

    if (!allowedTables.includes(table)) {
      return res.status(400).send("Invalid table name");
    }

    // Start query
    let query = `SELECT * FROM ${table} WHERE 1=1`;
    let params = [];

    // USER SEARCH FILTER
    if (table === "User") {
      if (search.trim() !== "") {
        query += " AND (name LIKE ? OR email LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
    }

    // MEASUREMENT FILTERS
    if (state.trim() !== "") {
      query += " AND state = ?";
      params.push(state);
    }
    if (county.trim() !== "") {
      query += " AND county = ?";
      params.push(county);
    }
    if (year.trim() !== "") {
      query += " AND year = ?";
      params.push(year);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST /users/signup
router.post('/signup', async (req, res) => {
  try {
    console.log('POST /users/signup body:', req.body);
    const { name, email, password, state, county } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [existing] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered' });

    // Generate unique user_id
    const userId = await generateUniqueUserId();

    const [result] = await db.query('INSERT INTO User (user_id, name, email, password, state, county) VALUES (?, ?, ?, ?, ?, ?)', [userId, name, email, password, state, county]);

    const [rows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    // normalize session user to include `userId` and remove sensitive fields
    const sessUser = { ...rows[0] };
    sessUser.userId = sessUser.user_id || sessUser.userId || sessUser.user_id;
    if (sessUser.password) delete sessUser.password;
    req.session.user = sessUser;
    console.log('User signed up, session set:', req.session.user);
    res.json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /users/login
router.post('/login', async (req, res) => {
  try {
    console.log('POST /users/login body:', req.body);
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    // Plaintext compare for now
    if (user.password !== password) return res.status(401).json({ message: 'Invalid email or password' });

    // set session and include userId (matches DB `user_id` column)
    req.session.user = {
      userId: user.user_id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      state: user.state,
      county: user.county
    };
    console.log('Login successful, session set:', req.session.user);
    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /users/logout
router.get('/logout', (req, res) => {
  console.log('GET /users/logout - destroying session');
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/');
  });
});

// Export the router
module.exports = router;