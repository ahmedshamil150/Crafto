import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'src',
  envDir: '../',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:           resolve(__dirname, 'src/index.html'),
        shop:           resolve(__dirname, 'src/shop.html'),
        product:        resolve(__dirname, 'src/product.html'),
        cart:           resolve(__dirname, 'src/cart.html'),
        checkout:       resolve(__dirname, 'src/checkout.html'),
        orderStatus:    resolve(__dirname, 'src/order-status.html'),
        about:          resolve(__dirname, 'src/about.html'),
        contact:        resolve(__dirname, 'src/contact.html'),
        adminLogin:     resolve(__dirname, 'src/admin/login.html'),
        adminDashboard: resolve(__dirname, 'src/admin/dashboard.html'),
        adminProducts:  resolve(__dirname, 'src/admin/products.html'),
        adminOrders:    resolve(__dirname, 'src/admin/orders.html'),
        adminRevenue:   resolve(__dirname, 'src/admin/revenue.html'),
        adminReviews:   resolve(__dirname, 'src/admin/reviews.html'),
        adminCoupons:   resolve(__dirname, 'src/admin/coupons.html'),
        adminHero:      resolve(__dirname, 'src/admin/hero.html'),
        contactSuccess: resolve(__dirname, 'src/contact-success.html'),
        privacy:        resolve(__dirname, 'src/privacy.html'),
        wishlist:       resolve(__dirname, 'src/wishlist.html'),
      },
    },
  },
  plugins: [
    // Move the main .css stylesheet link before <script> tags so CSS is discovered in parallel with JS
    {
      name: 'reorder-css-before-scripts',
      enforce: 'post',
      transformIndexHtml(html) {
        const cssMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="[^"]*\.css"[^>]*\/?>/i);
        if (!cssMatch) return html;
        const cssLink = cssMatch[0];
        let result = html.replace(cssLink, '');
        const scriptIdx = result.search(/<script[\s>]/i);
        if (scriptIdx !== -1) {
          result = result.slice(0, scriptIdx) + cssLink + '\n' + result.slice(scriptIdx);
        }
        return result;
      }
    }
  ],
});
