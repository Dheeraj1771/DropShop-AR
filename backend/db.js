'use strict';

require('dotenv').config();
const { Pool } = require('pg');

// Single connection pool shared across the whole application.
// pg reads DATABASE_URL from the environment and manages the pool size
// automatically — no manual connect/disconnect needed per request.
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } // Required for Supabase cloud connections
});

// Verify the connection is alive on startup so a bad DATABASE_URL fails
// loudly rather than silently at the first real request.
pool.query('SELECT 1').then(() => {
  console.log('[db] PostgreSQL connection pool ready');
}).catch(err => {
  console.error('[db] Could not connect to PostgreSQL:', err.message);
  process.exit(1);
});

/**
 * Creates all required tables if they do not already exist.
 * Call this once at server startup before accepting any requests.
 */
async function initSchema() {
  // Run all three CREATE TABLE statements in a single transaction so the
  // schema is either fully in place or fully absent — no partial states.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── users ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL      PRIMARY KEY,
        email        TEXT        NOT NULL UNIQUE,
        password_hash TEXT       NOT NULL,
        role         TEXT        NOT NULL DEFAULT 'customer',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── products ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL      PRIMARY KEY,
        name        TEXT        NOT NULL,
        description TEXT,
        price       NUMERIC(10, 2) NOT NULL,
        model_url   TEXT,
        image_url   TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── orders ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id           SERIAL      PRIMARY KEY,
        user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount NUMERIC(10, 2) NOT NULL,
        status       TEXT        NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Migrate: add profile columns to users if they don't exist ────────
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS full_name TEXT,
        ADD COLUMN IF NOT EXISTS address   TEXT;
    `);

    await client.query('COMMIT');
    console.log('[db] Schema initialised (tables: users, products, orders)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Schema initialisation failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initSchema };
