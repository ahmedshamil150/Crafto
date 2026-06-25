import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'src',
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
      },
    },
  },
});
