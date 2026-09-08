/* ═══════════════════════════════════════════════════════════════
   DropShop AR — script.js
   Product catalogue + dynamic AR src-swap logic
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Product Catalogue ─────────────────────────────────────────
   All 6 products map to locally hosted GLB files in ./models/.
   When a "View in AR" button is clicked, openAR() swaps the
   single <model-viewer> src to that product's local path —
   no remote GLB requests, no multiple viewer instances.
─────────────────────────────────────────────────────────────── */
const PRODUCTS = [
  {
    id: 'glam-velvet-sofa',
    category: 'Sofas',
    title: 'Glam Velvet Sofa',
    desc: 'Deep-seat velvet cushions on a polished gold frame — bold and luxe.',
    price: '$2,199',
    oldPrice: '$2,750',
    pill: 'Sale',
    pillType: 'sale',
    img: 'https://m.media-amazon.com/images/I/71-ny3AfH2L._AC_UF894,1000_QL80_.jpg',
    glb: './models/GlamVelvetSofa.glb',
    iosSrc: null,
  },
  {
    id: 'glass-hurricane-candle',
    category: 'Decor',
    title: 'Glass Hurricane Candle Holder',
    desc: 'Hand-blown borosilicate glass with a brushed-brass base.',
    price: '$129',
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    img: 'https://m.media-amazon.com/images/I/81cfIOjQVyL._SL1500_.jpg',
    glb: './models/GlassHurricaneCandleHolder.glb',
    iosSrc: null,
  },
  {
    id: 'glass-vase-flowers',
    category: 'Decor',
    title: 'Glass Vase Flowers',
    desc: 'Sculptural clear glass vase with a dried pampas arrangement.',
    price: '$89',
    oldPrice: '$110',
    pill: 'Sale',
    pillType: 'sale',
    img: 'https://www.homesake.in/cdn/shop/files/IH0F231-SMK-TEAR_Theme2_a214b76c-dd7d-4b00-8993-f14c23f990ab.jpg?v=1765962191',
    glb: './models/GlassVaseFlowers.glb',
    iosSrc: null,
  },
  {
    id: 'iridescence-lamp',
    category: 'Lighting',
    title: 'Iridescence Lamp',
    desc: 'Colour-shifting iridescent shade on a matte-white ceramic base.',
    price: '$349',
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    img: 'https://i.pinimg.com/736x/2a/2f/3b/2a2f3b6c856efe23d75107d6dc887b88.jpg',
    glb: './models/IridescenceLamp.glb',
    iosSrc: null,
  },
  {
    id: 'sheen-chair',
    category: 'Seating',
    title: 'Sheen Accent Chair',
    desc: 'Performance fabric shell with a satin-nickel swivel base.',
    price: '$749',
    oldPrice: '$920',
    pill: 'Bestseller',
    pillType: '',
    img: 'https://bigbossfurniture.ca/storage/app/public/uploads/SZgs93BHvITs6HUYdnV8pLliUzCU26HrnqPMBBYD.jpg',
    glb: './models/SheenChair.glb',
    iosSrc: null,
  },
  {
    id: 'silk-pouf',
    category: 'Seating',
    title: 'Specular Silk Pouf',
    desc: 'Hand-embroidered silk pouf with a lustrous high-sheen finish.',
    price: '$329',
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    img: 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T1/images/I/41ZUn14gyzL._SY300_SX300_QL70_FMwebp_.jpg',
    glb: './models/SpecularSilkPouf.glb',
    iosSrc: null,
  },
];

/* ─── DOM References ─────────────────────────────────────────── */
const productGrid = document.getElementById('productGrid');
const arOverlay = document.getElementById('arOverlay');
const arViewer = document.getElementById('ar-viewer');
const arProductName = document.getElementById('arProductName');
const arClose = document.getElementById('arClose');
const arSpinner = document.getElementById('arSpinner');
const launchARBtn = document.getElementById('launchARBtn');
const wishlistBtn = document.getElementById('wishlistBtn');

/* ─── Build product cards ────────────────────────────────────── */
function renderGrid() {
  PRODUCTS.forEach(p => {
    const article = document.createElement('article');
    article.className = 'card';

    const pillHTML = p.pill
      ? `<span class="card-pill${p.pillType ? ' ' + p.pillType : ''}">${p.pill}</span>`
      : '';

    const oldPriceHTML = p.oldPrice
      ? `<span class="card-price-old">${p.oldPrice}</span>`
      : '';

    article.innerHTML = `
      <div class="card-img-wrap">
        <img
          src="${p.img}"
          alt="${p.title}"
          loading="lazy"
          decoding="async"
          width="600"
          height="600"
        />
        ${pillHTML}
      </div>
      <div class="card-body">
        <p class="card-category">${p.category}</p>
        <h3 class="card-title">${p.title}</h3>
        <p class="card-desc">${p.desc}</p>
        <div class="card-footer">
          <div class="price-wrap">
            <span class="card-price">${p.price}</span>
            ${oldPriceHTML}
          </div>
          <button
            class="btn-view-ar"
            data-product-id="${p.id}"
            aria-label="View ${p.title} in augmented reality"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            View in AR
          </button>
        </div>
      </div>
    `;

    productGrid.appendChild(article);
  });
}

/* ─── AR Modal — open ────────────────────────────────────────── *
   Core fix: the <model-viewer> src is ONLY set here, on demand,
   by reading the product's .glb URL from the catalogue array.
   At page load the viewer has no src, so zero models are fetched.
─────────────────────────────────────────────────────────────── */
function openAR(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  // Update modal label
  arProductName.textContent = product.title;

  // Show spinner before the new model loads
  arSpinner.classList.remove('hidden');

  // ── THE KEY FIX ──────────────────────────────────────────────
  // Dynamically swap the single model-viewer's src attribute.
  // This is the only place a GLB is ever fetched.
  arViewer.setAttribute('src', product.glb);

  if (product.iosSrc) {
    arViewer.setAttribute('ios-src', product.iosSrc);
  } else {
    arViewer.removeAttribute('ios-src');
  }
  // ─────────────────────────────────────────────────────────────

  // Reveal overlay
  arOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Move focus to close button for keyboard/screen-reader users
  arClose.focus();
}

/* ─── AR Modal — close ───────────────────────────────────────── */
function closeAR() {
  arOverlay.classList.remove('open');
  document.body.style.overflow = '';

  // Clear the src so the previous model is released from memory
  // and won't be visible if the modal is reopened before a new
  // model finishes loading.
  arViewer.removeAttribute('src');
  arViewer.removeAttribute('ios-src');

  wishlistBtn.classList.remove('liked');
}

/* ─── model-viewer event hooks ───────────────────────────────── */

// Hide spinner once the new model finishes loading
arViewer.addEventListener('load', () => {
  arSpinner.classList.add('hidden');
});

// Also hide spinner on error so the UI doesn't stay in a loading state
arViewer.addEventListener('error', () => {
  arSpinner.classList.add('hidden');
  console.warn('DropShop AR: model-viewer failed to load the requested GLB.');
});

/* ─── Launch native AR ───────────────────────────────────────── */
launchARBtn.addEventListener('click', () => {
  if (arViewer.canActivateAR) {
    arViewer.activateAR();
  } else {
    alert(
      'AR is supported on iOS Safari and Android Chrome.\n' +
      'Open this page on your mobile device to place the item in your space!'
    );
  }
});

/* ─── Wishlist toggle (UI only) ──────────────────────────────── */
wishlistBtn.addEventListener('click', () => {
  wishlistBtn.classList.toggle('liked');
});

/* ─── Close handlers ─────────────────────────────────────────── */
arClose.addEventListener('click', closeAR);

// Escape key closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && arOverlay.classList.contains('open')) {
    closeAR();
  }
});

/* ─── Delegated click on product grid ────────────────────────── */
// One listener on the grid handles all 10 "View in AR" buttons,
// avoiding 10 individual event listeners.
productGrid.addEventListener('click', e => {
  const btn = e.target.closest('[data-product-id]');
  if (!btn) return;
  openAR(btn.dataset.productId);
});

/* ─── Init ───────────────────────────────────────────────────── */
renderGrid();
