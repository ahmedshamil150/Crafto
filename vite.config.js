import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        shop: 'src/shop.html',
        product: 'src/product.html',
        cart: 'src/cart.html',
        checkout: 'src/checkout.html',
        about: 'src/about.html',
        contact: 'src/contact.html',
        adminLogin: 'src/admin/login.html',
        adminDashboard: 'src/admin/dashboard.html',
        adminProducts: 'src/admin/products.html',
        adminOrders: 'src/admin/orders.html',
      },
    },
  },
});
  "name": "crafto",
  "type": "module"
}
