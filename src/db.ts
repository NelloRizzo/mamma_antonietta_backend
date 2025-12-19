import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test immediato della connessione al riavvio
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('ERRORE CONNESSIONE DB:', err.stack);
  } else {
    console.log('DB CONNESSO CON SUCCESSO:', res.rows[0].now);
  }
});

export default pool;