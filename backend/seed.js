'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, initSchema } = require('./db');

/* ─── Image URL map ────────────────────────────────────────────
   Keyed by the camelToTitle product name so we can look up the
   right URL during the seed loop.
─────────────────────────────────────────────────────────────── */
const IMAGE_URLS = {
  'Antique Camera': 'https://images.unsplash.com/photo-1516961642265-531546e84af2?auto=format&fit=crop&w=600&q=80',
  'Capiz Chandelier': 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=600&q=80',
  'Chair Purple': 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=600&q=80',
  'Chronograph Watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80',
  'Commercial Refrigerator': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=600&q=80',
  'Copper Wall Sconce': 'https://images.unsplash.com/photo-1507149833265-60c372daea22?auto=format&fit=crop&w=600&q=80',
  'Diffuse Transmission Plant': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80',
  'Glam Velvet Sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
  'Glass Hurricane Candle Holder': 'https://images.unsplash.com/photo-1672518194432-4c23cbcec1c4?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Glass Vase Flowers': 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=600&q=80',
  'Iridescence Lamp': 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80',
  'Metallic Coffee Table': 'https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&w=600&q=80',
  'Plush Swivel Chair': 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80',
  'Round Wooden Table': 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=600&q=80',
  'Sculptural Wood Table': 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=600&q=80',
  'Sheen Chair': 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
  'Sheen Wood Leather Sofa': 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&q=80',
  'Specular Silk Pouf': 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=600&q=80',
  'U S D Shader Ball For Gltf': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  'Utility Storage Shelf': 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=600&q=80',
};

/* ─── Helpers ─────────────────────────────────────────────────── */

/** "GlamVelvetSofa" → "Glam Velvet Sofa" */
function camelToTitle(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim();
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/sofa|couch/.test(n)) return 'Sofas';
  if (/chair|pouf|stool|seat/.test(n)) return 'Seating';
  if (/lamp|sconce|light|chandelier/.test(n)) return 'Lighting';
  if (/table|shelf|storage|refrigerator/.test(n)) return 'Tables & Storage';
  return 'Decor';
}

/** Deterministic mid-band INR price so re-seeds stay stable */
function guessPrice(category) {
  const bands = {
    'Sofas': [49999, 149999],
    'Seating': [8999, 74999],
    'Lighting': [2999, 24999],
    'Tables & Storage': [7999, 64999],
    'Decor': [999, 12999],
  };
  const [lo, hi] = bands[category] ?? [1999, 29999];
  return lo + Math.floor((hi - lo) / 2);
}

function buildDesc(name, category) {
  const templates = {
    'Sofas': `A luxurious ${name} crafted for comfort and statement interiors.`,
    'Seating': `Ergonomic and stylish, the ${name} elevates any living space.`,
    'Lighting': `Ambient ${name} designed to set the perfect mood.`,
    'Tables & Storage': `Solid construction and clean lines define the ${name}.`,
    'Decor': `A curated ${name} accent to personalise your space.`,
  };
  return templates[category] ?? `Explore the ${name} in augmented reality before you buy.`;
}

/* ─── Main ────────────────────────────────────────────────────── */

async function seed() {
  await initSchema();   // ensures table + unique index exist

  const modelsDir = path.resolve(__dirname, '../frontend/models');
  const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

  if (!files.length) {
    console.log('[seed] No .glb files found in', modelsDir);
    process.exit(0);
  }

  const rows = files.map(file => {
    const stem = path.basename(file, '.glb');
    const name = camelToTitle(stem);
    const category = guessCategory(name);
    return {
      name,
      description: buildDesc(name, category),
      price: guessPrice(category),
      model_url: `/models/${file}`,
      image_url: IMAGE_URLS[name] || null,   // look up verified Unsplash URL
      category,
    };
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inserted = 0, updated = 0;
    for (const r of rows) {
      const res = await client.query(
        `INSERT INTO products (name, description, price, model_url, image_url, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (model_url) DO UPDATE
           SET name        = EXCLUDED.name,
               description = EXCLUDED.description,
               price       = EXCLUDED.price,
               category    = EXCLUDED.category,
               image_url   = EXCLUDED.image_url
         RETURNING (xmax = 0) AS was_inserted`,
        [r.name, r.description, r.price, r.model_url, r.image_url, r.category]
      );
      res.rows[0].was_inserted ? inserted++ : updated++;
    }

    await client.query('COMMIT');
    console.log(`[seed] ✓ ${inserted} inserted, ${updated} updated (${files.length} total GLBs)`);
    files.forEach(f => console.log('  ·', camelToTitle(path.basename(f, '.glb'))));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
