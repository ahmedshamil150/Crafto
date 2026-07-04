// src/js/seo.js — Schema.org, GEO, AEO, SEO injection

(function () {
  const BASE = 'https://crafto.pk';
  const SITE_NAME = 'Crafto';
  const DESC = 'Discover unique home décor and handicrafts meticulously created by skilled Pakistani artisans who preserve centuries of heritage.';

  // ── Organization + WebSite Schema (every page) ──
  function injectOrgSchema() {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'schema-org';
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': BASE + '/#organization',
          name: SITE_NAME,
          url: BASE,
          logo: BASE + '/favicon.png',
          description: DESC,
          foundingLocation: { '@type': 'Place', name: 'Pakistan' },
          areaServed: { '@type': 'Country', name: 'Pakistan' },
          sameAs: []
        },
        {
          '@type': 'WebSite',
          '@id': BASE + '/#website',
          url: BASE,
          name: SITE_NAME,
          description: DESC,
          publisher: { '@id': BASE + '/#organization' },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: BASE + '/shop?q={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    });
    document.head.appendChild(el);
  }

  // ── FAQ Schema (AEO) ──
  function injectFaqSchema() {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'schema-faq';
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Crafto?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Crafto is a Pakistani marketplace for authentic handcrafted home décor and handicrafts, created by skilled artisans across Pakistan.'
          }
        },
        {
          '@type': 'Question',
          name: 'Where is Crafto based?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Crafto is based in Pakistan and works with artisans from all regions of the country to bring you authentic Pakistani craftsmanship.'
          }
        },
        {
          '@type': 'Question',
          name: 'Do you ship across Pakistan?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, we deliver to all major cities across Pakistan with local and outstation delivery options.'
          }
        },
        {
          '@type': 'Question',
          name: 'Can I return or exchange a product?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We accept returns and exchanges within 7 days of delivery. The product must be in its original condition. Contact our support team to initiate a return.'
          }
        },
        {
          '@type': 'Question',
          name: 'How can I track my order?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can track your order using the order tracking page on our website. Enter your order number to get real-time updates on your delivery status.'
          }
        },
        {
          '@type': 'Question',
          name: 'What payment methods do you accept?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We accept Cash on Delivery (COD) for orders across Pakistan.'
          }
        }
      ]
    });
    document.head.appendChild(el);
  }

  // ── BreadcrumbList Schema ──
  function injectBreadcrumb(items) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'schema-breadcrumb';
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: BASE + item.path
      }))
    });
    const existing = document.getElementById('schema-breadcrumb');
    if (existing) existing.remove();
    document.head.appendChild(el);
  }

  // ── Product Schema (product detail page) ──
  window.injectProductSchema = function (product) {
    const existing = document.getElementById('schema-product');
    if (existing) existing.remove();

    if (!product) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'schema-product';
    const price = product.discount_percent > 0
      ? product.price * (1 - product.discount_percent / 100)
      : product.price;
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || DESC,
      image: product.image || (BASE + '/ogimage.jpeg'),
      sku: product.id,
      brand: {
        '@type': 'Brand',
        name: 'Crafto'
      },
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'PKR',
        availability: 'https://schema.org/InStock',
        url: BASE + '/product?id=' + product.id,
        seller: { '@type': 'Organization', '@id': BASE + '/#organization' }
      },
      review: product.review_count > 0 ? [] : undefined
    });
    document.head.appendChild(el);
  };

  // ── Meta tag helpers ──
  function addMeta(name, content) {
    if (document.querySelector('meta[name="' + name + '"]')) return;
    const m = document.createElement('meta');
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  }

  function addCanonical(path) {
    if (document.querySelector('link[rel="canonical"]')) return;
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = BASE + path;
    document.head.appendChild(link);
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    const path = location.pathname.replace(/\/+$/, '') || '/index';
    const page = path.split('/').pop();

    injectOrgSchema();
    addMeta('robots', 'index, follow');
    addCanonical(path === '' || path.endsWith('index') ? '/' : location.pathname);

    // FAQ on every page (AEO / GEO)
    injectFaqSchema();

    // Breadcrumbs
    if (page === 'shop' || page === 'shop.html') {
      injectBreadcrumb([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]);
    } else if (page.startsWith('product') || page === 'product.html') {
      injectBreadcrumb([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: 'Product', path: location.pathname + location.search }
      ]);
    } else if (page === 'about' || page === 'about.html') {
      injectBreadcrumb([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]);
    } else if (page === 'contact' || page === 'contact.html') {
      injectBreadcrumb([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]);
    } else if (page === 'cart' || page === 'cart.html') {
      injectBreadcrumb([{ name: 'Home', path: '/' }, { name: 'Cart', path: '/cart' }]);
    } else if (page === 'checkout' || page === 'checkout.html') {
      injectBreadcrumb([{ name: 'Home', path: '/' }, { name: 'Checkout', path: '/checkout' }]);
    }
  });
})();
