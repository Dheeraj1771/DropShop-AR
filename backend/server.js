'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');

const { pool, initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  // Tighten this to your front-end origin in production,
  // e.g. 'https://your-github-pages-url'
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email: string, password: string }
 * Creates a new user with a bcrypt-hashed password.
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation — keep error messages generic to avoid
  // leaking information about existing accounts.
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // bcrypt work factor of 12 is a good balance between security and
    // latency on modern hardware (~300 ms per hash).
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), password_hash]
    );

    const user = result.rows[0];

    // Sign a JWT so the client can authenticate immediately after register.
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    // Postgres unique-violation code for duplicate email.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('[POST /api/auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns a signed JWT on success.
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, role FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Use a constant-time compare (bcrypt) even for the "user not found"
    // case to prevent timing attacks that reveal whether an email exists.
    const dummyHash = '$2b$12$invalidhashusedfortimingprotectiononly0000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Verifies the JWT from the Authorization: Bearer header.
 * Attaches the decoded payload to req.user on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ── Profile routes ────────────────────────────────────────────────────────────

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (no password hash).
 */
app.get('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, full_name, address, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/users/profile]', err.message);
    return res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

/**
 * PUT /api/users/profile
 * Body: { full_name?: string, address?: string }
 * Updates the authenticated user's profile and returns the updated object.
 */
app.put('/api/users/profile', requireAuth, async (req, res) => {
  const { full_name, address } = req.body;

  // Accept only the fields we know about — ignore anything else.
  const name = typeof full_name === 'string' ? full_name.trim() : null;
  const addr = typeof address === 'string' ? address.trim() : null;

  try {
    const result = await pool.query(
      `UPDATE users
       SET
         full_name  = COALESCE($1, full_name),
         address    = COALESCE($2, address)
       WHERE id = $3
       RETURNING id, email, role, full_name, address, created_at`,
      [name || null, addr || null, req.user.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ message: 'Profile updated.', user: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/users/profile]', err.message);
    return res.status(500).json({ error: 'Could not update profile.' });
  }
});

// ── Products ──────────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Returns all products ordered by id.
 */
app.get('/api/products', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, price, model_url, image_url, category, created_at
       FROM products ORDER BY id ASC`
    );
    return res.json({ products: result.rows });
  } catch (err) {
    console.error('[GET /api/products]', err.message);
    return res.status(500).json({ error: 'Could not fetch products.' });
  }
});

// ── AI Stylist ────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Body: { prompt: string, productId?: number }
 * Returns: { reply: string, command: { color?: string, scale?: number } | null }
 */
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, productId } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A prompt string is required.' });
  }

  // Run both DB queries in parallel: full catalog + optional active product
  let allProducts = { rows: [] };
  let productRow = null;

  try {
    const queries = [
      pool.query(`SELECT name, price FROM products ORDER BY name ASC`),
      productId
        ? pool.query(
          `SELECT name, description, price, category FROM products WHERE id = $1`,
          [Number(productId)]
        )
        : Promise.resolve({ rows: [] }),
    ];
    const [catalogResult, activeResult] = await Promise.all(queries);
    allProducts = catalogResult;
    productRow = activeResult.rows[0] || null;
  } catch (dbErr) {
    console.warn('[POST /api/ai/chat] DB lookup failed:', dbErr.message);
  }

  // Serialize catalog as a compact array: [{ name, price }]
  const catalogJSON = JSON.stringify(
    allProducts.rows.map(r => ({
      name: r.name,
      price: `₹${Number(r.price).toLocaleString('en-IN')}`,
    }))
  );

  // Build active-product block (or empty string when browsing without a selection)
  const activeBlock = productRow
    ? `Currently Viewing:\n` +
    `  Name: ${productRow.name}\n` +
    `  Category: ${productRow.category || 'Home Decor'}\n` +
    `  Description: ${productRow.description}\n` +
    `  Price: ₹${Number(productRow.price).toLocaleString('en-IN')}`
    : `Currently Viewing: (no specific product selected)`;

  const systemPrompt =
    `You are the DropShop-AR AI Stylist. You MUST extract the exact price from the ` +
    `'Store Inventory' array for any product mentioned. Never guess or hallucinate prices. ` +
    `All prices must be formatted in INR (₹). Never use USD.\n\n` +

    `Store Inventory:\n${catalogJSON}\n\n` +

    `${activeBlock}\n\n` +

    `Your ONLY output must be a valid JSON object with exactly two keys:\n` +
    `1. "reply"   — a short, friendly response (1–3 sentences max). ` +
    `Always use the exact name and ₹ price from Store Inventory. ` +
    `Keep it under 40 words.\n` +
    `2. "command" — null if no visual change is needed, OR an object with ONE of:\n` +
    `     • "color": a CSS hex string (e.g. "#8B4513") if the user asks to change the color.\n` +
    `     • "scale": a positive float multiplier (e.g. 1.5 = 50% larger, 0.75 = 25% smaller) ` +
    `if the user asks to resize.\n\n` +
    `Rules:\n` +
    `- Output ONLY the raw JSON object. No markdown fences, no text outside the JSON.\n` +
    `- If a product the user mentions is not in Store Inventory, say you don't carry it.\n` +
    `- Choose colors that reflect realistic furniture/decor finishes.\n` +
    `- Never mention USD or any currency other than INR (₹).`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      console.error('[POST /api/ai/chat] JSON parse failed on Groq output:', raw);
      return res.status(502).json({ error: 'AI returned malformed output. Please try again.' });
    }

    const reply = typeof parsed.reply === 'string' ? parsed.reply : 'Here is my suggestion!';
    const command = parsed.command && typeof parsed.command === 'object' ? parsed.command : null;

    return res.json({ reply, command });

  } catch (err) {
    console.error('[POST /api/ai/chat]', err.message);
    return res.status(500).json({ error: 'AI request failed. Please try again.' });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Startup ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    // Ensure all tables exist before the server begins accepting traffic.
    await initSchema();

    app.listen(PORT, () => {
      console.log(`[server] DropShop AR backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Startup failed:', err.message);
    process.exit(1);
  }
})();
