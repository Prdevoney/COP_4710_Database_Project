const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: "localhost",
  user: "prdevoney",
  port: 5432,
  database: "college_event_website",
  password: "password"
});


module.exports = {
  query: (text, params) => pool.query(text, params),
};