var express = require('express');
var router = express.Router();
var db = require('../db');
// Show login screen first
router.get('/', (req, res) => {
  console.log('GET / - session:', req.session);
  if (req.session && req.session.user) {
    console.log('User session found, redirecting to /home for', req.session.user.email || req.session.user.name);
    return res.redirect('/home');
  }
  res.render('login');   // This is login page
});

// Show the main AirAware dashboard after login
router.get('/home', (req, res) => {
  res.render('index', { title: "AirAware" });
});

router.get('/search', (req, res) => {
  res.render('search', { title: "AirAware" });
});


/* GET profile page. */
router.get('/profile', async function (req, res, next) {
  try {
    // If a logged-in session exists, use it for profile data
    let user;
    if (req.session && req.session.user) {
      user = { ...req.session.user };
    } else {
      // fallback: grab first user from DB
      const [users] = await db.query('SELECT * FROM User LIMIT 1');
      user = users[0] || { name: 'Unknown User', user_id: 'N/A', email: 'N/A', state: 'N/A', county: 'N/A' };
    }

    // normalize DB `user_id` to `userId` for the view and remove sensitive fields
    user.userId = user.userId || user.user_id || user.userId;
    if (user.password) delete user.password;

    const observations = []; // TODO: load real observations for the user

    res.render('profile', { user, observations });
  } catch (err) {
    console.error('DB error:', err);
    next(err);
  }
});

router.get('/emissions_map', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Observation WHERE user_id = ? ORDER BY eis_sector, observation_category', [String(userId)]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching emissions for map:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* GET /test_emissions
 * Test endpoint: Executes the exact transaction for testing
 * Logs all results to console and returns JSON
 */
router.get('/test_emissions', async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log('\n=== START TRANSACTION TEST (3 pollutants) ===');

    // Start transaction with READ COMMITTED isolation level
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.query('START TRANSACTION');

    const pollutants = [
      { key: 'co2', like: 'Carbon Monoxide' },
      { key: 'so2', like: 'Sulfur Dioxide' },
      { key: 'no2', like: 'Nitrogen Oxides' }
    ];

    const result = {};
    let agiData = [];

    for (const p of pollutants) {
      console.log(`\n--- Processing pollutant: ${p.like} (key=${p.key}) ---`);
      // Run aggregation directly (avoid CREATE/DROP VIEW which causes implicit commits and races)
      const [emissionsData] = await connection.query(`
        SELECT se.state, AVG(se.emissions) AS avg_carbon_em
        FROM Sector_emissions se
        JOIN Measurements_per_year mp ON se.state = mp.state
        WHERE se.pollutant LIKE ? AND mp.year = 2020
        GROUP BY se.state
      `, [p.like]);

      // Compute min/max in JS from the result set to avoid extra DDL/queries
      let min_avg = Number.POSITIVE_INFINITY;
      let max_avg = Number.NEGATIVE_INFINITY;
      for (const row of emissionsData) {
        const v = Number(row.avg_carbon_em) || 0;
        if (v < min_avg) min_avg = v;
        if (v > max_avg) max_avg = v;
      }
      if (min_avg === Number.POSITIVE_INFINITY) min_avg = 0;
      if (max_avg === Number.NEGATIVE_INFINITY) max_avg = 0;

      // store per-pollutant results
      result[p.key] = {
        emissionsData,
        minMaxData: { min_avg, max_avg }
      };
    }

    // Query median AQI statistics (same for all pollutants)
    const [agiRows] = await connection.query(`
      SELECT m.state, MAX(m.median_aqi) AS max_median_aqi_2020, MIN(m.median_aqi) AS min_median_aqi_2020,
          (
              SELECT AVG(m2.median_aqi)
              FROM Measurements_per_year m2
              WHERE m2.state = m.state
          ) AS avg_aqi_all_years
      FROM Measurements_per_year m
      WHERE m.year = 2020
      GROUP BY m.state
      ORDER BY m.state
    `);
    agiData = agiRows;

    // No VIEWs created — nothing to drop

    // Commit transaction
    await connection.query('COMMIT');
    console.log('\n=== TRANSACTION COMMITTED (3 pollutants) ===\n');

    // Return results as JSON containing three pollutant datasets
    res.json({
      success: true,
      data: result,
      agiData,
      message: 'Transaction executed successfully for multiple pollutants.'
    });

  } catch (err) {
    // Rollback on error
    try {
      await connection.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    console.error('\n=== TRANSACTION ERROR ===');
    console.error('Error:', err.message);
    console.error('SQL State:', err.sqlState);
    console.error('Full error:', err);
    console.log('=== TRANSACTION ROLLED BACK ===\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Transaction failed', 
      error: err.message,
      sqlState: err.sqlState
    });
  } finally {
    connection.release();
  }
});

module.exports = router;

// Return per-state metrics (total emissions and median/avg AQI) for a given year
router.get('/state_metrics', async (req, res) => {
  // Use stored procedure GetAvgEmissionsAndAvgAQI(pollutant, state)
  const pollutant = req.query.pollutant || 'Carbon Dioxide';
  try {
    // get list of states from Measurements_per_year (or Sector_emissions)
    const [statesRows] = await db.query(`SELECT DISTINCT state FROM Measurements_per_year ORDER BY state`);
    const metrics = {};

    for (const r of statesRows) {
      const state = r.state;
      try {
        // CALL the stored procedure for this pollutant/state
        const [procRes] = await db.query('CALL GetAvgEmissionsAndAvgAQI(?, ?)', [pollutant, state]);

        // mysql2 may return nested arrays for CALL. Normalize to an object row.
        let row = null;
        if (Array.isArray(procRes)) {
          // procRes[0] often contains the result rows
          if (procRes.length > 0 && Array.isArray(procRes[0]) && procRes[0].length > 0) {
            row = procRes[0][0];
          } else if (procRes.length > 0 && procRes[0]) {
            row = procRes[0];
          }
        } else if (procRes && typeof procRes === 'object') {
          row = procRes;
        }

        // Heuristically map returned field names to emissions and aqi, and use returned state if present
        let totalEmissions = null;
        let medianAqi = null;
        let returnedState = null;
        if (row) {
          for (const k of Object.keys(row)) {
            const lk = k.toLowerCase();
            const v = row[k];
            if (lk === 'state' || lk === 'st' || lk === 'region') {
              returnedState = v;
              continue;
            }
            if (lk.includes('emiss') || lk.includes('avg_em') || lk.includes('emission') || lk.includes('total')) {
              // prefer numeric
              const num = Number(v);
              if (!Number.isNaN(num)) totalEmissions = num;
            }
            if (lk.includes('aqi') || lk.includes('avg_aqi') || lk.includes('median')) {
              const num = Number(v);
              if (!Number.isNaN(num)) medianAqi = num;
            }
          }
        }

        const key = returnedState && String(returnedState).trim().length > 0 ? String(returnedState).trim() : state;

        // Fallback: if heuristics didn't find numeric columns, pick numeric values in order
        if ((totalEmissions == null || medianAqi == null) && row) {
          const numericValues = [];
          for (const v of Object.values(row)) {
            const num = Number(v);
            if (!Number.isNaN(num)) numericValues.push(num);
          }
          if (numericValues.length > 0 && totalEmissions == null) totalEmissions = numericValues[0];
          if (numericValues.length > 1 && medianAqi == null) medianAqi = numericValues[1];
        }

        metrics[key] = {
          totalEmissions: totalEmissions != null ? totalEmissions : 0,
          medianAqi: medianAqi != null ? medianAqi : null
        };

        if (process.env.DEBUG_PROC) {
          console.log('PROC_ROW_MAP', { state, returnedState: returnedState || null, key, row, mapped: metrics[key] });
        }
      } catch (procErr) {
        console.warn('proc error for', state, procErr && procErr.message ? procErr.message : procErr);
        metrics[state] = { totalEmissions: 0, medianAqi: null };
      }
    }

    res.json({ success: true, pollutant, metrics });
  } catch (err) {
    console.error('Error in /state_metrics (proc-based):', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Page showing per-state average Median_AQI (aggregated from Measurements_per_year)
router.get('/state_averages', async (req, res) => {
  try {
    const requestedYear = req.query.year ? String(req.query.year).trim() : null;
    const wantJson = req.query.format && req.query.format.toLowerCase() === 'json';

    // If client requested JSON for a single year, return a slim per-state map for that year only (faster)
    if (wantJson && requestedYear) {
      const [yrRows] = await db.query(`
        SELECT state, AVG(median_aqi) AS avg_median_aqi, COUNT(*) AS county_count
        FROM Measurements_per_year
        WHERE year = ?
        GROUP BY state
        ORDER BY state
      `, [requestedYear]);

      const data = {};
      const states = [];
      for (const r of yrRows) {
        const st = r.state;
        states.push(st);
        data[st] = {};
        data[st][requestedYear] = Number(r.avg_median_aqi);
      }

      // slim by default
      const includeCounts = req.query.include_counts === '1' || req.query.include_counts === 'true';
      if (includeCounts) {
        // include counts: return objects with avg and count
        const full = {};
        for (const r of yrRows) {
          full[r.state] = {};
          full[r.state][requestedYear] = { avg: Number(r.avg_median_aqi), count: Number(r.county_count) };
        }
        return res.json({ success: true, years: [requestedYear], states, data: full });
      }

      return res.json({ success: true, years: [requestedYear], states, data });
    }

    // get distinct years present (for HTML view or full JSON)
    const [yearRows] = await db.query(`SELECT DISTINCT year FROM Measurements_per_year ORDER BY year`);
    const years = yearRows.map(r => r.year);

    // get per-state per-year averages (all years)
    const [rows] = await db.query(`
      SELECT state, year, AVG(median_aqi) AS avg_median_aqi, COUNT(*) AS county_count
      FROM Measurements_per_year
      GROUP BY state, year
      ORDER BY state, year
    `);

    // organize rows into a map: state -> { year: { avg, count } }
    const data = {};
    for (const r of rows) {
      const st = r.state;
      if (!data[st]) data[st] = {};
      data[st][r.year] = { avg: Number(r.avg_median_aqi), count: Number(r.county_count) };
    }

    const states = Object.keys(data).sort();

    if (wantJson) {
      const includeCounts = req.query.include_counts === '1' || req.query.include_counts === 'true';
      if (includeCounts) {
        // return full objects
        return res.json({ success: true, years, states, data });
      }
      // slim: data[state][year] -> avg
      const slim = {};
      for (const st of states) {
        slim[st] = {};
        for (const y of years) {
          const cell = (data[st] && data[st][y]) ? data[st][y] : null;
          slim[st][y] = cell ? Number(cell.avg) : null;
        }
      }
      return res.json({ success: true, years, states, data: slim });
    }

    // render HTML view
    res.render('state_averages', { title: 'State Average Median AQI', years, states, data });
  } catch (err) {
    console.error('Error fetching state averages:', err);
    res.status(500).send('Internal server error');
  }
});
