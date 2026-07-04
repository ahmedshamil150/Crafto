// CSS offset-path orbiting image animation (port of reactbits.dev OrbitImages)
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

function generatePath(shape, cx, cy, rx, ry, r) {
  switch (shape) {
    case 'circle':
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
    case 'ellipse':
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
    case 'square': {
      const h = r;
      return `M ${cx - h} ${cy - h} L ${cx + h} ${cy - h} L ${cx + h} ${cy + h} L ${cx - h} ${cy + h} Z`;
    }
    default:
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
  }
}

export function initOrbit(container, images, opts = {}) {
  if (!container) return;
  images = images && images.length ? images : DEFAULT_IMAGES;

  const {
    shape = 'ellipse',
    baseWidth = 1000,
    radiusX = 400,
    radiusY = 100,
    radius = 300,
    duration = 30,
    itemSize = 72,
    rotation = -6,
    direction = 'normal',
    fill = true,
    showPath = true,
    pathColor = 'rgba(212,175,55,0.12)',
    responsive = true,
  } = opts;

  const cx = baseWidth / 2;
  const cy = baseWidth / 2;
  const path = generatePath(shape, cx, cy, radiusX, radiusY, radius);
  const count = Math.min(images.length, 12);

  container.style.cssText = 'position:relative;overflow:hidden;width:100%;aspect-ratio:1/1';
  container.innerHTML = '';

  // Scaling wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'orbit-wrapper';
  wrapper.style.cssText = `position:absolute;top:50%;left:50%;width:${baseWidth}px;height:${baseWidth}px;transform:translate(-50%,-50%);transform-origin:center center;will-change:transform`;
  container.appendChild(wrapper);

  // Rotation wrapper
  const rotator = document.createElement('div');
  rotator.style.cssText = `width:100%;height:100%;transform:rotate(${rotation}deg)`;
  wrapper.appendChild(rotator);

  // SVG path
  if (showPath) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${baseWidth} ${baseWidth}`);
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', pathColor);
    p.setAttribute('stroke-width', '2');
    svg.appendChild(p);
    rotator.appendChild(svg);
  }

  // Keyframe animation
  const animName = 'orbit-' + Date.now();
  const style = document.createElement('style');
  style.textContent = `@keyframes ${animName}{from{offset-distance:0%}to{offset-distance:100%}}`;
  document.head.appendChild(style);

  // Images
  images.slice(0, count).forEach((src, i) => {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;top:0;left:0;
      width:${itemSize}px;height:${itemSize}px;
      border-radius:50%;overflow:hidden;
      box-shadow:0 6px 24px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.05);
      border:2px solid rgba(212,175,55,0.25);
      offset-path:path("${path}");
      offset-rotate:0deg;
      animation:${animName} ${duration}s linear infinite;
      animation-direction:${direction === 'reverse' ? 'reverse' : 'normal'};
      pointer-events:none;
    `;
    if (fill) el.style.animationDelay = `-${(duration / count) * i}s`;
    el.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" />`;
    rotator.appendChild(el);
  });

  // Responsive scaling
  function updateScale() {
    const w = container.clientWidth;
    const s = w / baseWidth;
    wrapper.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  if (responsive) {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => { ro.disconnect(); style.remove(); };
  }
}
