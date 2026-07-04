// Vanilla JS orbiting image animation
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=200&q=80',
  'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=200&q=80',
  'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=200&q=80',
  'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80',
  'https://images.unsplash.com/photo-1602872030216-3ae373e4c0a7?w=200&q=80',
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&q=80',
  'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?w=200&q=80',
];

export function initOrbit(container, images, options = {}) {
  if (!container) return;
  images = images && images.length ? images : DEFAULT_IMAGES;

  const {
    itemSize = 80,
    duration = 40000,
    radiusXPct = 38,
    radiusYPct = 14,
    rotation = -6,
  } = options;

  const count = Math.min(images.length, 12);
  container.style.position = 'relative';

  const style = document.createElement('style');
  style.textContent = `
    .orbit-item {
      position: absolute; top: 0; left: 0;
      width: ${itemSize}px; height: ${itemSize}px;
      border-radius: 50%; overflow: hidden;
      box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
      border: 2px solid rgba(212,175,55,0.25);
      transform: translate(-50%, -50%);
      will-change: left, top;
      pointer-events: none;
    }
    .orbit-item img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
  `;
  document.head.appendChild(style);

  const items = images.slice(0, count).map(src => {
    const el = document.createElement('div');
    el.className = 'orbit-item';
    el.innerHTML = `<img src="${src}" alt="" loading="lazy" />`;
    container.appendChild(el);
    return el;
  });

  let rafId = null;
  let startTime = null;

  function frame(time) {
    if (!startTime) startTime = time;
    const t = time - startTime;
    items.forEach((el, i) => {
      const angle = (t / duration) * 2 * Math.PI + (i / count) * 2 * Math.PI;
      const x = 50 + radiusXPct * Math.cos(angle);
      const y = 50 + radiusYPct * Math.sin(angle);
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
    });
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return () => { if (rafId) cancelAnimationFrame(rafId); };
}
