<div align="center">

# DropShop AR

### WebAR Home Decor Storefront — B.Tech Capstone Project

<br/>

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Model Viewer](https://img.shields.io/badge/Google%20model--viewer-4285F4?style=for-the-badge&logo=google&logoColor=white)
![WebXR](https://img.shields.io/badge/WebXR-FF6B35?style=for-the-badge&logo=webxr&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

<br/>

> **Place furniture in your room before you buy it — no app download required.**

</div>

---

## Overview

**DropShop AR** is an advanced WebAR e-commerce storefront built as a B.Tech Capstone Project. It eliminates the single biggest barrier in spatial commerce — the app download — by letting users place photorealistic, true-to-scale 3D furniture and home decor models directly into their physical rooms straight from a mobile browser.

The entire experience runs on a single `index.html` page with zero frameworks, zero backend, and zero installation required by the end user. On iOS it hands off to Apple's **Quick Look** AR engine; on Android it delegates to **Scene Viewer** via **WebXR**. The result is a native-quality AR experience delivered through a URL.

---

## Core Features

### Client-Side WebAR — Zero App Friction
Powered by Google's `<model-viewer>` web component, the platform supports three AR delivery modes simultaneously:
- **WebXR** — immersive AR directly in Chrome on Android
- **Scene Viewer** — native Android AR fallback via Google Play Services
- **Quick Look (USDZ)** — native iOS AR via Safari, no app required

A single `<model-viewer>` instance is shared across all products. Clicking "View in Your Space" hands the active model directly to the device's native AR runtime.

### Dynamic Memory Management
The storefront never loads more than one 3D model at a time. The AR modal uses a **lazy-load / eager-unload** pattern:
- The `<model-viewer>` element has **no `src` at page paint** — zero GLB bytes are fetched on load
- When a product card's "View in AR" is clicked, `script.js` dynamically sets the `src` attribute to that product's local GLB path
- On modal close, `src` is **removed** via `removeAttribute('src')`, releasing the parsed mesh and textures from mobile browser memory immediately
- This prevents GPU memory exhaustion and browser crashes during extended demo sessions

### Offline-First Local Asset Pipeline
All six 3D models are stored as `.glb` files inside the `/models` directory and served as local static assets. This design decision was made deliberately for the capstone demo environment:
- **No CDN dependency** — models load even if the university Wi-Fi blocks external asset hosts
- **No CORS issues** — all assets are same-origin
- **Deterministic load times** — model size is known and controlled
- Thumbnails are served from verified external CDN URLs with `loading="lazy"` to keep initial page weight minimal

### Responsive Glassmorphism UI
- Full dark-mode glassmorphism aesthetic built in pure CSS with design tokens
- Sticky frosted-glass navigation bar
- Product grid collapses to **single-column (`1fr`) on all screens ≤ 768px** for clean mobile browsing
- Cards use `display: flex; flex-direction: column` with `justify-content: space-between` so the "View in AR" button is always anchored to the card bottom regardless of description length

---

## Project Structure

```
DropShop-AR/
│
├── index.html          # Semantic shell: nav, hero, product grid, AR modal
├── styles.css          # Full design system — tokens, grid, cards, AR overlay
├── script.js           # Product catalogue (PRODUCTS array) + AR src-swap logic
│
└── models/             # Local GLB assets — served as static files
    ├── GlamVelvetSofa.glb
    ├── GlassHurricaneCandleHolder.glb
    ├── GlassVaseFlowers.glb
    ├── IridescenceLamp.glb
    ├── SheenChair.glb
    └── SpecularSilkPouf.glb
```

---

## How It Works

```
User taps "View in AR"
        │
        ▼
script.js: openAR(productId)
        │
        ├─ Looks up product in PRODUCTS[]
        ├─ arViewer.setAttribute('src', './models/<product>.glb')  ← only fetch point
        ├─ Shows loading spinner
        └─ Opens AR modal overlay
                │
                ▼
        model-viewer loads GLB locally
                │
                ├─ 'load' event fires → spinner hidden
                └─ User taps "View in Your Space"
                        │
                        ├─ iOS Safari   → Quick Look (USDZ)
                        └─ Android Chrome → WebXR / Scene Viewer

User closes modal
        │
        └─ arViewer.removeAttribute('src')  ← GLB released from GPU memory
```

---

## Product Catalogue

| # | Product | Category | Price | Local Model |
|---|---------|----------|-------|-------------|
| 1 | Glam Velvet Sofa | Sofas | $2,199 | `GlamVelvetSofa.glb` |
| 2 | Glass Hurricane Candle Holder | Decor | $129 | `GlassHurricaneCandleHolder.glb` |
| 3 | Glass Vase Flowers | Decor | $89 | `GlassVaseFlowers.glb` |
| 4 | Iridescence Lamp | Lighting | $349 | `IridescenceLamp.glb` |
| 5 | Sheen Accent Chair | Seating | $749 | `SheenChair.glb` |
| 6 | Specular Silk Pouf | Seating | $329 | `SpecularSilkPouf.glb` |

---

## Installation & Running Locally

### Prerequisites
- A modern browser (Chrome 79+, Safari 14+, Firefox 98+)
- Python 3 **or** Node.js (for the local HTTP server)
- An Android or iOS device on the same Wi-Fi network (for AR testing)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/DropShop-AR.git
cd DropShop-AR
```

### 2. Add your GLB files

Place your six `.glb` model files into the `/models` directory so the structure matches the tree above.

### 3. Start a local server

```bash
# Python 3 (recommended)
python3 -m http.server 8000
```

Or with Node.js:

```bash
npx serve .
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

### 4. Test AR on a mobile device

AR requires a secure context (`https://` or `localhost`). Use Chrome DevTools **port forwarding** to tunnel your laptop's server to your phone:

1. Connect your Android phone via USB and enable USB debugging
2. Open `chrome://inspect/#devices` in Chrome on your laptop
3. Under **Port forwarding**, add: `8000` → `localhost:8000`
4. On your phone, open `http://localhost:8000`
5. Tap any "View in AR" button → tap "View in Your Space"

For iOS, use a tool like [ngrok](https://ngrok.com/) to expose your local server over HTTPS:

```bash
ngrok http 8000
```

Then open the generated `https://` URL in Safari on your iPhone.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | CSS3 — Custom Properties, Grid, Flexbox, Backdrop Filter |
| Logic | Vanilla JavaScript (ES6+, strict mode) |
| 3D / AR | Google `<model-viewer>` v3.4.0 |
| AR Runtimes | WebXR, Android Scene Viewer, iOS Quick Look |
| Hosting | GitHub Pages (static) |
| 3D Format | glTF Binary (`.glb`) |

---

## AR Device Compatibility

| Platform | Browser | AR Mode |
|----------|---------|---------|
| Android 8+ | Chrome 79+ | WebXR / Scene Viewer |
| iOS 12+ | Safari | Quick Look (USDZ) |
| Desktop | Chrome / Firefox / Edge | 3D preview (no AR) |

---

<div align="center">

Built with purpose for the B.Tech Capstone Demo · 2026

</div>
