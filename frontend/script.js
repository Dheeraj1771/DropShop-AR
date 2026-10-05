/* ═══════════════════════════════════════════════════════════════
   DropShop AR — script.js
   Product catalogue, AR viewer, discovery, cart/wishlist/compare,
   fit checker (real model dimensions), theme, toasts.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Currency ───────────────────────────────────────────────── */
const CURRENCY = 'INR';
const LOCALE = 'en-IN';

function formatPrice(amount) {
  if (amount == null) return '';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

const METERS_TO_FEET = 3.28084;
const METERS_TO_CM = 100;
function metersToFeet(m) {
  return Math.round(m * METERS_TO_FEET * 10) / 10;
}
function metersToCm(m) {
  return Math.round(m * METERS_TO_CM);
}
function feetToCm(ft) {
  return Math.round((ft / METERS_TO_FEET) * METERS_TO_CM);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Product Catalogue ─────────────────────────────────────────
   Category-independent schema — no furniture-specific logic
   anywhere in the app. `model.src` maps to local GLB files.
   `specs` holds descriptive catalog data (material/color/etc).
   Real dimensions are NEVER hand-typed here — they're measured
   at runtime from model-viewer.getDimensions() and cached
   (see getProductDimensions()). `fallbackDimsFt` is only used
   if that live measurement fails, and is always labeled as an
   estimate in the UI, never presented as measured.
─────────────────────────────────────────────────────────────── */
const PRODUCTS = [
  {
    id: 'glam-velvet-sofa',
    category: 'Sofas',
    title: 'Glam Velvet Sofa',
    desc: 'Deep-seat velvet cushions on a polished gold frame — bold and luxe.',
    price: 89999,
    oldPrice: 109999,
    pill: 'Sale',
    pillType: 'sale',
    rating: 4.7,
    reviewCount: 214,
    availability: 'in-stock',
    images: ['https://m.media-amazon.com/images/I/71-ny3AfH2L._AC_UF894,1000_QL80_.jpg'],
    model: { src: '/models/GlamVelvetSofa.glb', iosSrc: null },
    specs: { material: 'Velvet upholstery, gold-finished steel frame', color: 'Emerald / Gold', assembly: 'Legs attach on arrival' },
    fallbackDimsFt: { width: 6.6, depth: 3.0, height: 2.8 },
  },
  {
    id: 'glass-hurricane-candle',
    category: 'Decor',
    title: 'Glass Hurricane Candle Holder',
    desc: 'Hand-blown borosilicate glass with a brushed-brass base.',
    price: 1499,
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    rating: 4.5,
    reviewCount: 58,
    availability: 'in-stock',
    images: ['https://m.media-amazon.com/images/I/81cfIOjQVyL._SL1500_.jpg'],
    model: { src: '/models/GlassHurricaneCandleHolder.glb', iosSrc: null },
    specs: { material: 'Borosilicate glass, brushed brass', color: 'Clear / Brass', assembly: 'None required' },
    fallbackDimsFt: { width: 0.5, depth: 0.5, height: 0.8 },
  },
  {
    id: 'glass-vase-flowers',
    category: 'Decor',
    title: 'Glass Vase Flowers',
    desc: 'Sculptural clear glass vase with a dried pampas arrangement.',
    price: 1199,
    oldPrice: 1499,
    pill: 'Sale',
    pillType: 'sale',
    rating: 4.3,
    reviewCount: 41,
    availability: 'in-stock',
    images: ['https://www.homesake.in/cdn/shop/files/IH0F231-SMK-TEAR_Theme2_a214b76c-dd7d-4b00-8993-f14c23f990ab.jpg?v=1765962191'],
    model: { src: '/models/GlassVaseFlowers.glb', iosSrc: null },
    specs: { material: 'Clear glass, dried pampas grass', color: 'Clear / Natural', assembly: 'None required' },
    fallbackDimsFt: { width: 0.7, depth: 0.7, height: 1.2 },
  },
  {
    id: 'iridescence-lamp',
    category: 'Lighting',
    title: 'Iridescence Lamp',
    desc: 'Colour-shifting iridescent shade on a matte-white ceramic base.',
    price: 4999,
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    rating: 4.8,
    reviewCount: 96,
    availability: 'in-stock',
    images: ['https://i.pinimg.com/736x/2a/2f/3b/2a2f3b6c856efe23d75107d6dc887b88.jpg'],
    model: { src: '/models/IridescenceLamp.glb', iosSrc: null },
    specs: { material: 'Iridescent glass shade, ceramic base', color: 'Iridescent / Matte White', assembly: 'None required' },
    fallbackDimsFt: { width: 1.0, depth: 1.0, height: 1.5 },
  },
  {
    id: 'sheen-chair',
    category: 'Seating',
    title: 'Sheen Accent Chair',
    desc: 'Performance fabric shell with a satin-nickel swivel base.',
    price: 62499,
    oldPrice: 74999,
    pill: 'Bestseller',
    pillType: '',
    rating: 4.9,
    reviewCount: 312,
    availability: 'low-stock',
    images: ['https://bigbossfurniture.ca/storage/app/public/uploads/SZgs93BHvITs6HUYdnV8pLliUzCU26HrnqPMBBYD.jpg'],
    model: { src: '/models/SheenChair.glb', iosSrc: null },
    specs: { material: 'Performance fabric, satin-nickel base', color: 'Charcoal / Nickel', assembly: 'Swivel base clicks into place' },
    fallbackDimsFt: { width: 2.3, depth: 2.3, height: 3.0 },
  },
  {
    id: 'silk-pouf',
    category: 'Seating',
    title: 'Specular Silk Pouf',
    desc: 'Hand-embroidered silk pouf with a lustrous high-sheen finish.',
    price: 8999,
    oldPrice: null,
    pill: 'New',
    pillType: 'new',
    rating: 4.4,
    reviewCount: 27,
    availability: 'in-stock',
    images: ['https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T1/images/I/41ZUn14gyzL._SY300_SX300_QL70_FMwebp_.jpg'],
    model: { src: '/models/SpecularSilkPouf.glb', iosSrc: null },
    specs: { material: 'Hand-embroidered silk, foam fill', color: 'Ivory / Gold thread', assembly: 'None required' },
    fallbackDimsFt: { width: 1.6, depth: 1.6, height: 1.3 },
  },
];

const productById = id => PRODUCTS.find(p => p.id === id);

/* ─── localStorage-backed state ──────────────────────────────────
   Every read/write is wrapped in try/catch — private browsing,
   storage quota, or disabled storage should degrade gracefully
   rather than break the app.
─────────────────────────────────────────────────────────────── */
const STORAGE_KEYS = {
  cart: 'dropshop_cart',
  wishlist: 'dropshop_wishlist',
  recentlyViewed: 'dropshop_recently_viewed',
  theme: 'dropshop_theme',
  dimensions: 'dropshop_dimensions',
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable — state stays in memory for this session */
  }
}

let cart = loadJSON(STORAGE_KEYS.cart, []); // [{ productId, qty }]
let wishlist = loadJSON(STORAGE_KEYS.wishlist, []); // [productId]
let recentlyViewed = loadJSON(STORAGE_KEYS.recentlyViewed, []); // [productId], newest first
let compareList = []; // [productId] — session only, max 3
let dimensionCache = loadJSON(STORAGE_KEYS.dimensions, {}); // { productId: {widthFt, depthFt, heightFt, source} }

let activeCategory = 'All';
let searchQuery = '';
let sortMode = 'featured';
let currentDetailProductId = null;

/* ─── DOM References ─────────────────────────────────────────── */
const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const arOverlay = document.getElementById('arOverlay');
const arViewer = document.getElementById('ar-viewer');
const arProductName = document.getElementById('arProductName');
const arClose = document.getElementById('arClose');
const arSpinner = document.getElementById('arSpinner');
const launchARBtn = document.getElementById('launchARBtn');
const wishlistBtn = document.getElementById('wishlistBtn');
const heroModelViewer = document.getElementById('heroModelViewer');
const heroProductName = document.getElementById('heroProductName');
const heroProductPrice = document.getElementById('heroProductPrice');
const dimensionProbe = document.getElementById('dimensionProbe');
const arDimsChip = document.getElementById('arDimsChip');
const arDimW = document.getElementById('arDimW');
const arDimD = document.getElementById('arDimD');
const arDimH = document.getElementById('arDimH');
const arDimNote = document.getElementById('arDimNote');

let currentARProductId = null;
let arActiveModelSrc = '';

/* ═══════════════════════════════════════════════════════════════
   TOASTS
═══════════════════════════════════════════════════════════════ */
const toastContainer = document.getElementById('toastContainer');
function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
const themeToggle = document.getElementById('themeToggle');
const themeIconSun = document.getElementById('themeIconSun');
const themeIconMoon = document.getElementById('themeIconMoon');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIconSun.style.display = 'none';
    themeIconMoon.style.display = 'block';
    themeToggle.setAttribute('aria-pressed', 'true');
    themeToggle.setAttribute('aria-label', 'Switch to light theme');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeIconSun.style.display = 'block';
    themeIconMoon.style.display = 'none';
    themeToggle.setAttribute('aria-pressed', 'false');
    themeToggle.setAttribute('aria-label', 'Switch to dark theme');
  }
}

const savedTheme = loadJSON(STORAGE_KEYS.theme, 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  saveJSON(STORAGE_KEYS.theme, next);
});

/* ═══════════════════════════════════════════════════════════════
   HERO — real interactive 3D preview
   Rotation is handled entirely by model-viewer's own built-in
   camera-controls (drag to orbit), not a CSS trick on a flat
   photo — that's what lets a visitor actually see every side of
   the object. `poster` shows the flat product photo the instant
   the section renders, then swaps to the live model once the GLB
   is loaded, so there's never a blank box while it streams in.
═══════════════════════════════════════════════════════════════ */
const HERO_FEATURED_ID = 'sheen-chair';

function renderHeroProduct() {
  const product = productById(HERO_FEATURED_ID);
  if (!product || !heroModelViewer) return;
  heroModelViewer.setAttribute('poster', product.images[0]);
  heroModelViewer.setAttribute('alt', product.title);
  heroModelViewer.setAttribute('src', product.model.src);
  if (product.model.iosSrc) {
    heroModelViewer.setAttribute('ios-src', product.model.iosSrc);
  }
  heroProductName.textContent = product.title;
  heroProductPrice.textContent = formatPrice(product.price);
}

/* ═══════════════════════════════════════════════════════════════
   DISCOVERY — search, category filters, sort
═══════════════════════════════════════════════════════════════ */
const searchInput = document.getElementById('searchInput');
const categoryPillsEl = document.getElementById('categoryPills');
const sortSelect = document.getElementById('sortSelect');
const searchNavBtn = document.getElementById('searchNavBtn');

function renderCategoryPills() {
  const categories = ['All', ...new Set(PRODUCTS.map(p => p.category))];
  categoryPillsEl.innerHTML = categories
    .map(cat => `<button class="pill-filter${cat === activeCategory ? ' active' : ''}" data-category="${cat}">${cat}</button>`)
    .join('');
}

categoryPillsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  activeCategory = btn.dataset.category;
  renderCategoryPills();
  renderGrid();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderGrid();
});

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  renderGrid();
});

searchNavBtn.addEventListener('click', () => {
  document.getElementById('shop').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  searchInput.focus();
});

document.getElementById('accountBtn').addEventListener('click', () => {
  window.location.href = 'account.html';
});

function getFilteredSortedProducts() {
  let list = PRODUCTS.slice();

  if (activeCategory !== 'All') {
    list = list.filter(p => p.category === activeCategory);
  }
  if (searchQuery) {
    list = list.filter(p =>
      p.title.toLowerCase().includes(searchQuery) ||
      p.desc.toLowerCase().includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery)
    );
  }

  switch (sortMode) {
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      list.sort((a, b) => (b.pill === 'New' ? 1 : 0) - (a.pill === 'New' ? 1 : 0));
      break;
    default:
      break; // featured = catalogue order
  }
  return list;
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON LOADING
   The catalogue itself is local and instant, but the grid renders
   through this same skeleton-then-swap path a real network fetch
   will use once the backend lands — so the loading state is real
   UI, exercised on every load, not a one-off decoration.
═══════════════════════════════════════════════════════════════ */
function renderSkeleton(count = 6) {
  productGrid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT GRID
═══════════════════════════════════════════════════════════════ */
function cardTemplate(p) {
  const pillHTML = p.pill
    ? `<span class="card-pill${p.pillType ? ' ' + p.pillType : ''}">${p.pill}</span>`
    : '';
  const oldPriceHTML = p.oldPrice
    ? `<span class="card-price-old">${formatPrice(p.oldPrice)}</span>`
    : '';
  const stockHTML = p.availability === 'low-stock'
    ? `<span class="card-stock">Only a few left</span>`
    : '';
  const liked = wishlist.includes(p.id);
  const compared = compareList.includes(p.id);

  return `
    <article class="card" data-product-id="${p.id}">
      <div class="card-img-wrap" data-open-detail="${p.id}">
        <img
          src="${p.images[0]}"
          alt="${p.title}"
          loading="lazy"
          decoding="async"
          width="600"
          height="600"
        />
        ${pillHTML}
        <button class="card-wishlist-btn${liked ? ' liked' : ''}" data-wishlist-toggle="${p.id}" aria-label="${liked ? 'Remove from' : 'Add to'} wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <label class="card-compare-check">
          <input type="checkbox" data-compare-toggle="${p.id}" ${compared ? 'checked' : ''} />
          Compare
        </label>
      </div>
      <div class="card-body">
        <p class="card-category">${p.category}</p>
        <h3 class="card-title" data-open-detail="${p.id}">${p.title}</h3>
        <div class="card-rating">
          <span class="card-rating-star" aria-hidden="true">★</span>
          <span>${p.rating}</span>
          <span class="card-rating-count">(${p.reviewCount})</span>
        </div>
        <p class="card-desc">${p.desc}</p>
        ${stockHTML}
        <div class="card-footer">
          <div class="price-wrap">
            <span class="card-price">${formatPrice(p.price)}</span>
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
    </article>
  `;
}

function renderGrid() {
  const list = getFilteredSortedProducts();
  if (list.length === 0) {
    productGrid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  productGrid.innerHTML = list.map(cardTemplate).join('');
}

function initialGridLoad() {
  renderSkeleton();
  const delay = prefersReducedMotion ? 0 : 300;
  setTimeout(renderGrid, delay);
}

/* Delegated clicks on the grid */
productGrid.addEventListener('click', e => {
  const arBtn = e.target.closest('[data-product-id]:not([data-wishlist-toggle]):not([data-compare-toggle])');
  const wishlistToggleBtn = e.target.closest('[data-wishlist-toggle]');
  const detailTarget = e.target.closest('[data-open-detail]');

  if (wishlistToggleBtn) {
    toggleWishlist(wishlistToggleBtn.dataset.wishlistToggle);
    return;
  }
  if (arBtn && arBtn.classList.contains('btn-view-ar')) {
    openAR(arBtn.dataset.productId);
    return;
  }
  if (detailTarget) {
    openDetail(detailTarget.dataset.openDetail);
  }
});

productGrid.addEventListener('change', e => {
  const checkbox = e.target.closest('[data-compare-toggle]');
  if (!checkbox) return;
  toggleCompare(checkbox.dataset.compareToggle, checkbox.checked);
});

/* ═══════════════════════════════════════════════════════════════
   WISHLIST
═══════════════════════════════════════════════════════════════ */
const wishlistNavBtn = document.getElementById('wishlistNavBtn');
const wishlistBadge = document.getElementById('wishlistBadge');
const wishlistDrawer = document.getElementById('wishlistDrawer');
const wishlistDrawerOverlay = document.getElementById('wishlistDrawerOverlay');
const wishlistClose = document.getElementById('wishlistClose');
const wishlistItemsList = document.getElementById('wishlistItemsList');
const wishlistEmptyState = document.getElementById('wishlistEmptyState');

function toggleWishlist(productId) {
  const idx = wishlist.indexOf(productId);
  const product = productById(productId);
  if (idx === -1) {
    wishlist.push(productId);
    showToast(`${product ? product.title : 'Item'} added to wishlist`);
  } else {
    wishlist.splice(idx, 1);
    showToast(`${product ? product.title : 'Item'} removed from wishlist`);
  }
  saveJSON(STORAGE_KEYS.wishlist, wishlist);
  syncWishlistUI();
}

function syncWishlistUI() {
  wishlistBadge.textContent = String(wishlist.length);
  wishlistBadge.hidden = wishlist.length === 0;
  wishlistNavBtn.setAttribute('aria-label', `Wishlist, ${wishlist.length} items`);

  // Reflect state on any rendered cards without a full re-render
  document.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
    const liked = wishlist.includes(btn.dataset.wishlistToggle);
    btn.classList.toggle('liked', liked);
  });

  // Reflect on AR modal heart if it's currently open for this product
  if (currentARProductId) {
    wishlistBtn.classList.toggle('liked', wishlist.includes(currentARProductId));
  }
  // Reflect on detail modal heart if open
  if (currentDetailProductId) {
    const btn = document.getElementById('detailWishlistBtn');
    btn.classList.toggle('liked', wishlist.includes(currentDetailProductId));
  }

  renderWishlistDrawer();
}

function renderWishlistDrawer() {
  if (wishlist.length === 0) {
    wishlistItemsList.innerHTML = '';
    wishlistEmptyState.hidden = false;
    return;
  }
  wishlistEmptyState.hidden = true;
  wishlistItemsList.innerHTML = wishlist.map(id => {
    const p = productById(id);
    if (!p) return '';
    return `
      <div class="drawer-item">
        <img src="${p.images[0]}" alt="${p.title}" />
        <div class="drawer-item-info">
          <p class="name">${p.title}</p>
          <p class="price">${formatPrice(p.price)}</p>
        </div>
        <button class="drawer-item-remove" data-wishlist-remove="${p.id}">Remove</button>
      </div>
    `;
  }).join('');
}

wishlistItemsList.addEventListener('click', e => {
  const btn = e.target.closest('[data-wishlist-remove]');
  if (!btn) return;
  toggleWishlist(btn.dataset.wishlistRemove);
});

function openDrawer(drawerEl, overlayEl) {
  drawerEl.classList.add('open');
  overlayEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer(drawerEl, overlayEl) {
  drawerEl.classList.remove('open');
  overlayEl.classList.remove('open');
  document.body.style.overflow = '';
}

wishlistNavBtn.addEventListener('click', () => openDrawer(wishlistDrawer, wishlistDrawerOverlay));
wishlistClose.addEventListener('click', () => closeDrawer(wishlistDrawer, wishlistDrawerOverlay));
wishlistDrawerOverlay.addEventListener('click', () => closeDrawer(wishlistDrawer, wishlistDrawerOverlay));

/* ═══════════════════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════════════════════ */
const cartBtn = document.getElementById('cartBtn');
const cartBadge = document.getElementById('cartBadge');
const cartDrawer = document.getElementById('cartDrawer');
const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
const cartClose = document.getElementById('cartClose');
const cartItemsList = document.getElementById('cartItemsList');
const cartEmptyState = document.getElementById('cartEmptyState');
const cartSubtotalValue = document.getElementById('cartSubtotalValue');
const checkoutBtn = document.getElementById('checkoutBtn');

function addToCart(productId, qty = 1) {
  const line = cart.find(c => c.productId === productId);
  if (line) {
    line.qty += qty;
  } else {
    cart.push({ productId, qty });
  }
  saveJSON(STORAGE_KEYS.cart, cart);
  const product = productById(productId);
  showToast(`${product ? product.title : 'Item'} added to cart`);
  syncCartUI();
}

function updateCartQty(productId, qty) {
  const line = cart.find(c => c.productId === productId);
  if (!line) return;
  if (qty <= 0) {
    cart = cart.filter(c => c.productId !== productId);
  } else {
    line.qty = qty;
  }
  saveJSON(STORAGE_KEYS.cart, cart);
  syncCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.productId !== productId);
  saveJSON(STORAGE_KEYS.cart, cart);
  syncCartUI();
}

function cartTotalCount() {
  return cart.reduce((sum, c) => sum + c.qty, 0);
}
function cartSubtotal() {
  return cart.reduce((sum, c) => {
    const p = productById(c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}

function syncCartUI() {
  const count = cartTotalCount();
  cartBadge.textContent = String(count);
  cartBadge.hidden = count === 0;
  cartBtn.setAttribute('aria-label', `Shopping cart, ${count} items`);
  renderCartDrawer();
}

function renderCartDrawer() {
  if (cart.length === 0) {
    cartItemsList.innerHTML = '';
    cartEmptyState.hidden = false;
    cartSubtotalValue.textContent = formatPrice(0);
    return;
  }
  cartEmptyState.hidden = true;
  cartItemsList.innerHTML = cart.map(line => {
    const p = productById(line.productId);
    if (!p) return '';
    return `
      <div class="drawer-item">
        <img src="${p.images[0]}" alt="${p.title}" />
        <div class="drawer-item-info">
          <p class="name">${p.title}</p>
          <p class="price">${formatPrice(p.price)}</p>
          <div class="qty-control">
            <button data-qty-dec="${p.id}" aria-label="Decrease quantity">−</button>
            <span>${line.qty}</span>
            <button data-qty-inc="${p.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="drawer-item-remove" data-cart-remove="${p.id}">Remove</button>
      </div>
    `;
  }).join('');
  cartSubtotalValue.textContent = formatPrice(cartSubtotal());
}

cartItemsList.addEventListener('click', e => {
  const inc = e.target.closest('[data-qty-inc]');
  const dec = e.target.closest('[data-qty-dec]');
  const remove = e.target.closest('[data-cart-remove]');
  if (inc) {
    const line = cart.find(c => c.productId === inc.dataset.qtyInc);
    updateCartQty(inc.dataset.qtyInc, (line ? line.qty : 0) + 1);
  } else if (dec) {
    const line = cart.find(c => c.productId === dec.dataset.qtyDec);
    updateCartQty(dec.dataset.qtyDec, (line ? line.qty : 0) - 1);
  } else if (remove) {
    removeFromCart(remove.dataset.cartRemove);
  }
});

cartBtn.addEventListener('click', () => openDrawer(cartDrawer, cartDrawerOverlay));
cartClose.addEventListener('click', () => closeDrawer(cartDrawer, cartDrawerOverlay));
cartDrawerOverlay.addEventListener('click', () => closeDrawer(cartDrawer, cartDrawerOverlay));
checkoutBtn.addEventListener('click', () => {
  showToast('Checkout arrives in the next review — this is a demo cart for now');
});

/* ═══════════════════════════════════════════════════════════════
   RECENTLY VIEWED
═══════════════════════════════════════════════════════════════ */
const recentlyViewedSection = document.getElementById('recentlyViewedSection');
const recentlyViewedRow = document.getElementById('recentlyViewedRow');
const recentlyViewedClearBtn = document.getElementById('recentlyViewedClearBtn');
const MAX_RECENTLY_VIEWED = 6;

function recordRecentlyViewed(productId) {
  recentlyViewed = recentlyViewed.filter(id => id !== productId);
  recentlyViewed.unshift(productId);
  recentlyViewed = recentlyViewed.slice(0, MAX_RECENTLY_VIEWED);
  saveJSON(STORAGE_KEYS.recentlyViewed, recentlyViewed);
  renderRecentlyViewed();
}

function removeRecentlyViewed(productId) {
  recentlyViewed = recentlyViewed.filter(id => id !== productId);
  saveJSON(STORAGE_KEYS.recentlyViewed, recentlyViewed);
  renderRecentlyViewed();
}

function clearRecentlyViewed() {
  recentlyViewed = [];
  saveJSON(STORAGE_KEYS.recentlyViewed, recentlyViewed);
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  if (recentlyViewed.length === 0) {
    recentlyViewedSection.hidden = true;
    return;
  }
  recentlyViewedSection.hidden = false;
  recentlyViewedRow.innerHTML = recentlyViewed.map(id => {
    const p = productById(id);
    if (!p) return '';
    return `
      <div class="mini-card" data-open-detail="${p.id}">
        <button class="mini-card-remove" data-recent-remove="${p.id}" aria-label="Remove ${p.title} from recently viewed">&times;</button>
        <img src="${p.images[0]}" alt="${p.title}" loading="lazy" />
        <p>${p.title}</p>
      </div>
    `;
  }).join('');
}

recentlyViewedRow.addEventListener('click', e => {
  const removeBtn = e.target.closest('[data-recent-remove]');
  if (removeBtn) {
    e.stopPropagation();
    removeRecentlyViewed(removeBtn.dataset.recentRemove);
    return;
  }
  const target = e.target.closest('[data-open-detail]');
  if (target) openDetail(target.dataset.openDetail);
});

if (recentlyViewedClearBtn) {
  recentlyViewedClearBtn.addEventListener('click', clearRecentlyViewed);
}

/* ═══════════════════════════════════════════════════════════════
   COMPARE (max 3)
   The old fixed bottom bar is gone — this lives as a single inline
   pill in the shop toolbar instead, so nothing floats over the page.
═══════════════════════════════════════════════════════════════ */
const MAX_COMPARE = 3;
const compareInlineBtn = document.getElementById('compareInlineBtn');
const compareInlineCount = document.getElementById('compareInlineCount');
const compareModal = document.getElementById('compareModal');
const compareModalClose = document.getElementById('compareModalClose');
const compareTable = document.getElementById('compareTable');

function toggleCompare(productId, shouldAdd) {
  const idx = compareList.indexOf(productId);
  if (shouldAdd && idx === -1) {
    if (compareList.length >= MAX_COMPARE) {
      showToast(`You can compare up to ${MAX_COMPARE} products at a time`);
      // revert the checkbox that triggered this
      document.querySelectorAll(`[data-compare-toggle="${productId}"]`).forEach(cb => (cb.checked = false));
      return;
    }
    compareList.push(productId);
  } else if (!shouldAdd && idx !== -1) {
    compareList.splice(idx, 1);
  }
  syncCompareUI();
}

function syncCompareUI() {
  document.querySelectorAll('[data-compare-toggle]').forEach(cb => {
    cb.checked = compareList.includes(cb.dataset.compareToggle);
  });
  const detailCompareBtn = document.getElementById('detailCompareBtn');
  if (currentDetailProductId) {
    detailCompareBtn.classList.toggle('active-compare', compareList.includes(currentDetailProductId));
  }

  compareInlineBtn.hidden = compareList.length === 0;
  compareInlineCount.textContent = String(compareList.length);
}

compareInlineBtn.addEventListener('click', () => {
  if (compareList.length < 2) {
    showToast('Select at least 2 products to compare');
    return;
  }
  renderCompareTable();
  openModal(compareModal);
});

function renderCompareTable() {
  const products = compareList.map(productById).filter(Boolean);
  const rows = [
    { label: '', render: p => `<img src="${p.images[0]}" alt="${p.title}" />` },
    { label: 'Product', render: p => `<strong>${p.title}</strong>` },
    { label: 'Category', render: p => p.category },
    { label: 'Price', render: p => formatPrice(p.price) },
    { label: 'Rating', render: p => `★ ${p.rating} (${p.reviewCount})` },
    { label: 'Material', render: p => p.specs.material || '—' },
    { label: 'Color', render: p => p.specs.color || '—' },
    { label: 'Availability', render: p => p.availability === 'low-stock' ? 'Low stock' : 'In stock' },
  ];

  compareTable.innerHTML = rows.map(row => `
    <tr>
      <th>${row.label}</th>
      ${products.map(p => `<td>${row.render(p)}</td>`).join('')}
    </tr>
  `).join('');
}

compareModalClose.addEventListener('click', () => closeModal(compareModal));

/* ═══════════════════════════════════════════════════════════════
   GENERIC MODAL HELPERS
═══════════════════════════════════════════════════════════════ */
function openModal(modalEl) {
  modalEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(modalEl) {
  modalEl.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay);
  });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (arOverlay.classList.contains('open')) closeAR();
  document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m));
  if (cartDrawer.classList.contains('open')) closeDrawer(cartDrawer, cartDrawerOverlay);
  if (wishlistDrawer.classList.contains('open')) closeDrawer(wishlistDrawer, wishlistDrawerOverlay);
});

/* ═══════════════════════════════════════════════════════════════
   REAL DIMENSIONS — model-viewer.getDimensions()
   One hidden, offscreen model-viewer is reused as a probe so we
   never spin up more than one extra GLB load at a time. Results
   are cached per product id (in memory + localStorage) since a
   model's authored size never changes. The Fit Checker and the
   AR dimensions chip both read from this same cache/measurement,
   so the numbers shown in both places always agree.
═══════════════════════════════════════════════════════════════ */
const DIMENSION_TIMEOUT_MS = 6000;

function getProductDimensions(product) {
  return new Promise(resolve => {
    const cached = dimensionCache[product.id];
    if (cached) {
      resolve(cached);
      return;
    }

    let settled = false;
    const cleanup = () => {
      dimensionProbe.removeEventListener('load', onLoad);
      dimensionProbe.removeEventListener('error', onError);
      clearTimeout(timeoutId);
    };
    // Safety net: if the GLB is slow, missing, or model-viewer never
    // fires load/error for some reason, fall back rather than leaving
    // the Fit Checker stuck on "Measuring…" indefinitely.
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(fallbackDimensions(product));
    }, DIMENSION_TIMEOUT_MS);
    const onLoad = () => {
      if (settled) return;
      settled = true;
      let dims;
      try {
        dims = dimensionProbe.getDimensions();
      } catch (e) {
        dims = null;
      }
      cleanup();
      if (dims) {
        const result = {
          widthFt: metersToFeet(dims.x),
          heightFt: metersToFeet(dims.y),
          depthFt: metersToFeet(dims.z),
          widthCm: metersToCm(dims.x),
          heightCm: metersToCm(dims.y),
          depthCm: metersToCm(dims.z),
          source: 'measured',
        };
        dimensionCache[product.id] = result;
        saveJSON(STORAGE_KEYS.dimensions, dimensionCache);
        resolve(result);
      } else {
        resolve(fallbackDimensions(product));
      }
    };
    // Don't treat every 'error' event as fatal — model-viewer can fire
    // a secondary error for something unrelated to the model itself
    // while the real 'load' still arrives a moment later. Only bail
    // out here if the model genuinely never loads within the timeout
    // above; otherwise let 'onLoad' win and produce a real, measured
    // result instead of an unnecessary "(estimated)" fallback.
    const onError = (event) => {
      console.warn('DropShop AR: dimension probe error event (may be non-fatal):', product.id, event.detail);
    };

    dimensionProbe.addEventListener('load', onLoad);
    dimensionProbe.addEventListener('error', onError);
    dimensionProbe.setAttribute('src', product.model.src);
  });
}

function fallbackDimensions(product) {
  const f = product.fallbackDimsFt || { width: 1, depth: 1, height: 1 };
  return {
    widthFt: f.width,
    heightFt: f.height,
    depthFt: f.depth,
    widthCm: feetToCm(f.width),
    heightCm: feetToCm(f.height),
    depthCm: feetToCm(f.depth),
    source: 'estimated',
  };
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT DETAIL MODAL + FIT CHECKER
═══════════════════════════════════════════════════════════════ */
const detailModal = document.getElementById('detailModal');
const detailClose = document.getElementById('detailClose');
const detailImg = document.getElementById('detailImg');
const detailCategory = document.getElementById('detailCategory');
const detailAvailabilityBadge = document.getElementById('detailAvailabilityBadge');
const detailTitle = document.getElementById('detailTitle');
const detailRating = document.getElementById('detailRating');
const detailPrice = document.getElementById('detailPrice');
const detailDesc = document.getElementById('detailDesc');
const detailSpecs = document.getElementById('detailSpecs');
const detailDimensionsValue = document.getElementById('detailDimensionsValue');
const detailAddCartBtn = document.getElementById('detailAddCartBtn');
const detailWishlistBtn = document.getElementById('detailWishlistBtn');
const detailCompareBtn = document.getElementById('detailCompareBtn');
const detailViewARBtn = document.getElementById('detailViewARBtn');
const fitWidth = document.getElementById('fitWidth');
const fitLength = document.getElementById('fitLength');
const fitHeight = document.getElementById('fitHeight');
const fitCheckBtn = document.getElementById('fitCheckBtn');
const fitResult = document.getElementById('fitResult');

let currentDetailDimensions = null;

function openDetail(productId) {
  const product = productById(productId);
  if (!product) return;

  currentDetailProductId = productId;
  recordRecentlyViewed(productId);

  detailImg.src = product.images[0];
  detailImg.alt = product.title;
  detailCategory.textContent = product.category;

  const lowStock = product.availability === 'low-stock';
  detailAvailabilityBadge.textContent = lowStock ? 'Low stock' : 'In stock';
  detailAvailabilityBadge.className = `detail-availability-badge ${lowStock ? 'low-stock' : 'in-stock'}`;

  detailTitle.textContent = product.title;
  detailRating.innerHTML = `<span class="card-rating-star">★</span> ${product.rating} <span class="card-rating-count">(${product.reviewCount} reviews)</span>`;
  detailPrice.textContent = formatPrice(product.price);
  detailDesc.textContent = product.desc;

  // Specs rendered as a scannable chip grid rather than a plain
  // definition list — easier to read at a glance.
  detailSpecs.innerHTML = Object.entries(product.specs).map(([key, value]) => `
    <div class="detail-spec-chip">
      <span class="spec-label">${key}</span>
      <span class="spec-value">${value}</span>
    </div>
  `).join('');

  detailWishlistBtn.classList.toggle('liked', wishlist.includes(productId));
  detailCompareBtn.classList.toggle('active-compare', compareList.includes(productId));

  // reset fit checker
  fitResult.hidden = true;
  currentDetailDimensions = null;
  detailDimensionsValue.className = 'dim-loading';
  detailDimensionsValue.textContent = 'Measuring 3D model…';
  fitCheckBtn.disabled = true;
  fitCheckBtn.textContent = 'Measuring product…';

  openModal(detailModal);

  getProductDimensions(product).then(dims => {
    if (currentDetailProductId !== productId) return; // modal moved on
    currentDetailDimensions = dims;
    const noteHTML = dims.source === 'estimated'
      ? `<p class="dim-note">Estimated — live measurement from the 3D model wasn't available for this item.</p>`
      : `<p class="dim-note">Measured directly from the 3D model.</p>`;
    detailDimensionsValue.className = 'dim-value';
    detailDimensionsValue.innerHTML = `
      <div class="dim-chips">
        <div class="dim-chip"><strong>${dims.widthFt} ft</strong><span>Width</span></div>
        <div class="dim-chip"><strong>${dims.depthFt} ft</strong><span>Depth</span></div>
        <div class="dim-chip"><strong>${dims.heightFt} ft</strong><span>Height</span></div>
      </div>
      ${noteHTML}`;
    fitCheckBtn.disabled = false;
    fitCheckBtn.textContent = 'Check Fit';
  });
}

detailClose.addEventListener('click', () => closeModal(detailModal));

detailAddCartBtn.addEventListener('click', () => {
  if (currentDetailProductId) addToCart(currentDetailProductId);
});
detailWishlistBtn.addEventListener('click', () => {
  if (currentDetailProductId) toggleWishlist(currentDetailProductId);
});
detailCompareBtn.addEventListener('click', () => {
  if (!currentDetailProductId) return;
  const willAdd = !compareList.includes(currentDetailProductId);
  toggleCompare(currentDetailProductId, willAdd);
});
detailViewARBtn.addEventListener('click', () => {
  if (currentDetailProductId) {
    closeModal(detailModal);
    openAR(currentDetailProductId);
  }
});

fitCheckBtn.addEventListener('click', () => {
  const w = parseFloat(fitWidth.value);
  const l = parseFloat(fitLength.value);
  const h = parseFloat(fitHeight.value);

  if (!w || !l || !h) {
    fitResult.hidden = false;
    fitResult.className = 'fit-result warn';
    fitResult.textContent = 'Enter width, length and height to check fit.';
    return;
  }
  if (!currentDetailDimensions) {
    fitResult.hidden = false;
    fitResult.className = 'fit-result warn';
    fitResult.textContent = 'Still measuring the product — try again in a moment.';
    return;
  }

  const { widthFt, depthFt, heightFt } = currentDetailDimensions;
  const fits = widthFt <= w && depthFt <= l && heightFt <= h;

  fitResult.hidden = false;
  fitResult.className = `fit-result ${fits ? 'ok' : 'warn'}`;
  fitResult.textContent = fits
    ? '✓ Fits your space'
    : '⚠ May be too large for your available space';
});

/* ═══════════════════════════════════════════════════════════════
   AR MODAL — open / close / live dimensions chip
═══════════════════════════════════════════════════════════════ */
function resetArDimsChip() {
  arDimsChip.classList.remove('show');
  arDimW.textContent = '–';
  arDimD.textContent = '–';
  arDimH.textContent = '–';
  arDimNote.textContent = '';
}

function populateArDimsChip(product) {
  getProductDimensions(product).then(dims => {
    // Bail if the AR modal moved on to a different product or closed
    if (currentARProductId !== product.id || !arOverlay.classList.contains('open')) return;
    arDimW.textContent = `${dims.widthCm} cm`;
    arDimD.textContent = `${dims.depthCm} cm`;
    arDimH.textContent = `${dims.heightCm} cm`;
    arDimNote.textContent = dims.source === 'estimated' ? '(estimated)' : '(measured)';
    arDimsChip.classList.add('show');
  });
}

function openAR(productId) {
  const product = productById(productId);
  if (!product) return;

  currentARProductId = productId;
  arActiveModelSrc = product.model.src;
  recordRecentlyViewed(productId);

  arProductName.textContent = product.title;
  arSpinner.classList.remove('hidden');
  resetArDimsChip();
  populateArDimsChip(product);

  arViewer.setAttribute('src', product.model.src);
  if (!prefersReducedMotion) {
    arViewer.setAttribute('auto-rotate', '');
  } else {
    arViewer.removeAttribute('auto-rotate');
  }

  if (product.model.iosSrc) {
    arViewer.setAttribute('ios-src', product.model.iosSrc);
  } else {
    arViewer.removeAttribute('ios-src');
  }

  arOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  arClose.focus();
}

function closeAR() {
  arOverlay.classList.remove('open');
  document.body.style.overflow = '';
  arViewer.removeAttribute('src');
  arViewer.removeAttribute('ios-src');
  currentARProductId = null;
  arActiveModelSrc = '';
  resetArDimsChip();
}

arViewer.addEventListener('load', () => {
  arSpinner.classList.add('hidden');
});


launchARBtn.addEventListener('click', () => {
  if (arViewer.canActivateAR) {
    arViewer.activateAR();
  } else {
    showToast('AR needs iOS Safari or Android Chrome — open this page on your phone');
  }
});

wishlistBtn.addEventListener('click', () => {
  if (currentARProductId) toggleWishlist(currentARProductId);
});

arClose.addEventListener('click', closeAR);

const heroTryARBtn = document.getElementById('heroTryARBtn');
if (heroTryARBtn) {
  heroTryARBtn.addEventListener('click', () => {
    openAR(heroTryARBtn.dataset.productId);
  });
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
renderHeroProduct();
renderCategoryPills();
initialGridLoad();
syncWishlistUI();
syncCartUI();
renderRecentlyViewed();
syncCompareUI();

const statProductCount = document.getElementById('statProductCount');
if (statProductCount) statProductCount.textContent = PRODUCTS.length;