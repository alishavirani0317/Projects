const mysql = require('mysql2/promise');

/*
const pool = mysql.createPool({
  host: '34.29.250.33',  
  user: 'airaware_app',    
  password: 'Bazinga123!',
  database: 'aqi_by_year', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
*/
const pool = mysql.createPool({
  host: '34.29.250.33',
  user: 'airaware_app',
  password: 'Bazinga123!',
  database: 'aqi_by_year',
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;