# Crafto Front‑End & Admin Panel Implementation Plan

## Goal Description
Create a modern, responsive front‑end for the **Crafto** home‑decor and handicraft e‑commerce store targeting customers in Pakistan. The site will be hosted on Vercel and will include a public storefront and an admin panel for managing products, orders, and inventory. The design will be premium, culturally‑relevant, and avoid generic AI‑generated aesthetics.

## Chosen Technology Stack
- **Framework**: Plain static site using **HTML, CSS, and vanilla JavaScript**. No React/Next.js – this keeps the build simple, reduces bundle size, and works perfectly with Vercel's static hosting.
- **Build Tool (optional)**: We will use **Vite** in non‑interactive mode only to bundle assets and enable ES‑module imports during development. The final output will be pure static files.
- **Design System**: Custom CSS with variables, glassmorphism cards, micro‑animations, and responsive grid. Typography will use Google Fonts **Outfit** (headings) and **Inter** (body).
- **Admin Authentication**: Simple custom auth – three hard‑coded admin usernames/passwords stored securely in environment variables (`.env.local`). No registration flow.
- **Data Layer**: Supabase for product data and media storage. Admin panel will call Supabase REST APIs using a lightweight wrapper.

## Design Assets
- **Color Palette** (inspired by Pakistani motifs):
  - Primary: `#006064` (deep teal)
  - Accent: `#FFB74D` (warm amber)
  - Secondary: `#8D6E63` (muted terracotta)
  - Background: `#F5F5F5` (soft neutral) / dark mode `#1E1E1E`.
- **Typography**: `Outfit` for headings, `Inter` for body text.
- **Imagery**: Placeholder product images will be generated; you can replace them later with real assets.

## Admin Panel Features (MVP)
- **Login**: Custom username/password check against values in `.env.local`.
- **Product CRUD**: Create, read, update, delete products (title, description, price, images). Images uploaded to Supabase Storage.
- **Order List**: View orders placed by customers (read‑only for now).
- **Media Upload**: Simple file picker that uploads to Supabase and stores the public URL.
- **Dashboard**: Overview cards showing total products, pending orders, and sales summary (static placeholders for now).

## Public Pages (Confirmed)
- Home (`index.html`)
- Shop / Catalog (`shop.html`)
- Product Detail (`product.html` – receives `?id=` query param)
- Cart (`cart.html`)
- Checkout (`checkout.html` – static mockup, later integration with payment gateway)
- About (`about.html`)
- Contact (`contact.html`)

## Project Structure
```
Crafto/                     (project root)
├─ public/                  # static assets (images, favicon)
├─ src/
│   ├─ index.html          # Home page
│   ├─ shop.html           # Product catalog
│   ├─ product.html        # Detail page (query param based)
│   ├─ cart.html           # Shopping cart UI
│   ├─ checkout.html       # Checkout mockup
│   ├─ about.html
│   ├─ contact.html
│   ├─ admin/
│   │   ├─ login.html      # Admin login
│   │   ├─ dashboard.html  # Admin dashboard
│   │   ├─ products.html   # Manage products
│   │   └─ orders.html     # View orders
│   ├─ css/
│   │   ├─ style.css       # Global styles / design system
│   │   └─ admin.css       # Admin‑specific styles
│   └─ js/
│       ├─ main.js         # Front‑end interactions (nav, cart)
│       ├─ product.js      # Load product data from Supabase
│       ├─ cart.js         # Cart management (localStorage)
│       ├─ checkout.js     # Checkout flow
│       ├─ admin.js        # Admin panel logic & Supabase calls
│       └─ api.js          # Supabase helper (fetch wrapper)
├─ .env.local              # Env vars (Supabase URL, anon key, admin creds)
├─ vite.config.js          # Vite config (optional)
├─ package.json            # npm scripts (dev, build, lint)
└─ vercel.json            # Vercel configuration (static site settings)
```

## Deployment to Vercel
- Add `vercel.json` with static file redirects (if we later use SPA fallback).
- `npm run build` will output to `dist/` which Vercel serves.
- Environment variables from `.env.local` will be mapped in Vercel dashboard.

## Verification Plan
### Automated Checks
- Lint with ESLint (via `npm run lint`).
- Basic Playwright smoke test: navigation flow, admin login, product CRUD actions.

### Manual Checks
- Open the Vercel preview URL and verify:
  - Responsive layout on mobile/desktop.
  - Admin login works with the three custom credentials.
  - Product CRUD updates reflect in the storefront.
  - Cart persists across page reloads.
  - Checkout page displays mock order summary.

---
**Next Steps**
1. Create the project skeleton (folders, placeholder HTML/CSS/JS files).
2. Add the design system (CSS variables, fonts, base layout).
3. Implement the admin login using credentials from `.env.local`.
4. Build the product CRUD UI integrated with Supabase.
5. Deploy the initial version to Vercel for review.

Please confirm that the above choices align with your expectations or let me know any adjustments you’d like before I start generating the file structure and starter code.

## Goal Description
Create a modern, responsive front‑end for the Crafto home‑deco and handicraft e‑commerce store targeting customers in Pakistan. The site will be hosted on Vercel and will include a public storefront and an admin panel for managing products, orders, and inventory. The design should be high‑quality, locally relevant, and not exhibit generic AI‑generated aesthetics.

## User Review Required
> [!IMPORTANT] 
> The user must approve the chosen technology stack and confirm design directions before any code is written.

## Open Questions
> [!WARNING] 
> Please answer the following to shape the implementation:
> - **Framework Preference**: Do you want a plain HTML/CSS/JS static site, or a modern React‑based framework (e.g., Next.js) which integrates well with Vercel?
> - **Design Assets**: Do you have brand colors, logo, or typography preferences? If not, should we propose a palette inspired by Pakistani cultural motifs?
> - **Admin Authentication**: Should the admin panel use Supabase Auth (email/password, social logins) or a simple custom auth?
> - **Feature Scope for MVP**: Which admin features are required initially (product CRUD, order list, media upload, etc.)?
> - **Page List**: Confirm required public pages (Home, Shop, Product Detail, Cart, Checkout, About, Contact).

## Proposed Changes
---
### Project Structure (Next.js example)
- **[NEW]** `d:/my projects/Crafto/package.json` – Initialize with `create-next-app`.
- **[NEW]** `d:/my projects/Crafto/next.config.js` – Vercel configuration.
- **[NEW]** `d:/my projects/Crafto/pages/` – Contains public pages (`index.js`, `shop.js`, `product/[id].js`, `cart.js`, `checkout.js`).
- **[NEW]** `d:/my projects/Crafto/pages/admin/` – Admin panel routes (`dashboard.js`, `products.js`, `orders.js`).
- **[NEW]** `d:/my projects/Crafto/components/` – Reusable UI components (Header, Footer, Card, Modal, etc.).
- **[NEW]** `d:/my projects/Crafto/styles/` – Global CSS and Tailwind or custom design system.
- **[NEW]** `d:/my projects/Crafto/lib/supabase.js` – Supabase client wrapper for DB operations and auth.

### Styling & Design
- Adopt a **custom design system** with a curated color palette (e.g., warm earth tones, teal accents) and modern typography (Google Font "Outfit").
- Use **CSS Modules** or **styled‑components** for scoped styles.
- Add **micro‑animations** (hover effects, smooth transitions) to give a premium feel.
- Ensure **responsive layout** with mobile‑first breakpoints.

### Core Functionality
- **Public Storefront**: Fetch product data from Supabase, display grid of items, product detail pages, add‑to‑cart using localStorage.
- **Cart & Checkout**: Simple cart UI; checkout page will later integrate payment processor (outside current scope).
- **Admin Panel**: Protected routes via Supabase auth; provide CRUD UI for products (title, description, price, images), view orders, and manage inventory.
- **SEO**: Set appropriate `<title>`, meta description, OpenGraph tags on each page.

### Deployment
- Configure `vercel.json` for serverless functions (if any) and environment variables (Supabase URL and anon key).
- Add scripts `npm run dev` and `npm run build`.

## Verification Plan
### Automated Tests
- Write a few Jest + React Testing Library tests for component rendering.
- Use `npm run lint` and `npm run format` to ensure code quality.

### Manual Verification
- Run `npm run dev` and manually check:
  - Responsive layout on mobile and desktop.
  - Admin login flow.
  - Product listing displays correctly.
  - Cart persists across page reloads.
- Deploy to Vercel preview and confirm environment variables are loaded.

---
**Next Steps**
1. Await user confirmation on framework, design assets, and feature scope.
2. Once approved, create the project skeleton and begin incremental development.
