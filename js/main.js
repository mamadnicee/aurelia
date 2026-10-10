(()=>{
  'use strict';

  /* ─── Reduced-motion preference ─── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Scroll-reveal ─── */
  const revealEls = document.querySelectorAll(
    '.feature-section,.intro-row,.shop-card,.newsletter,.mini-product,.catalog-hero,.product-detail,.related'
  );
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3) el.classList.add('reveal-delay-' + (i % 3));
  });
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      }),
      { threshold: .12, rootMargin: '0px 0px -35px' }
    );
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ─── Vanilla tilt (pointer-based perspective, no library) ─── */
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      if (matchMedia('(pointer: coarse)').matches) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      card.style.setProperty('--tilt-x', (-y * 7) + 'deg');
      card.style.setProperty('--tilt-y', ( x * 9) + 'deg');
      const v = card.querySelector('.card-visual');
      if (v && !card.matches(':hover')) v.style.transform = `rotateX(${-y*5}deg) rotateY(${x*7}deg)`;
    });
    card.addEventListener('pointerleave', () => {
      const v = card.querySelector('.card-visual');
      if (v) v.style.transform = '';
    });
  });

  /* ─── Subtle hero parallax ─── */
  const heroArt = document.querySelector('[data-parallax]');
  if (heroArt && !reduced) {
    let busy = false;
    window.addEventListener('scroll', () => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => {
        const r = heroArt.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight)
          heroArt.style.transform = `translateY(${Math.max(-22, Math.min(22, (r.top - innerHeight / 2) * -.035))}px)`;
        busy = false;
      });
    }, { passive: true });
  }

  /* ─── Magnetic CTA buttons (desktop only) ─── */
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width  / 2) * .08}px,${(e.clientY - r.top  - r.height / 2) * .12}px)`;
      });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* ─── 3-D shoe viewer — data-driven, GLB-ready ─────────────────────────
   *
   *  Convention:
   *    • Every colour variant needs a <section> (or any block element) with
   *      data-shoe-color="<name>" somewhere in the page.
   *    • The viewer canvas/container must carry  data-shoe-viewer.
   *    • GLB files live in  /models/shoe-<name>.glb
   *      e.g. shoe-white.glb, shoe-blue.glb, shoe-red.glb, shoe-green.glb
   *
   *  When you add a new colour section to the HTML the JS picks it up
   *  automatically — no further code changes needed.
   *
   *  If Three.js + GLTFLoader are available (loaded before this script),
   *  the real model is rendered.  Otherwise the legacy CSS spin fallback
   *  stays active so the page never breaks during development.
   * ─────────────────────────────────────────────────────────────────────── */

  // Build the colour → model map from whatever data-shoe-color elements exist.
  const colorSections = document.querySelectorAll('[data-shoe-color]');
  const shoeModels = {};
  colorSections.forEach(el => {
    const color = el.dataset.shoeColor.trim().toLowerCase();
    if (color) shoeModels[color] = `models/shoe-${color}.glb`;
  });

  // Active colour (default to the first one found, or 'black' as fallback).
  let activeColor = colorSections.length ? [...colorSections][0].dataset.shoeColor.trim().toLowerCase() : 'black';

  // Viewer element (the section that hosts the Three.js canvas).
  const viewerEl = document.querySelector('[data-shoe-viewer]');

  /**
   * Loads a GLB into the given Three.js scene, replacing any previous shoe.
   * Expects Three.js r150+ and GLTFLoader to be available as globals or
   * imported at the top of your bundle.
   */
  function loadShoeGLB(scene, color) {
    const path = shoeModels[color];
    if (!path) return;

    // Remove the previous shoe mesh group if present.
    const prev = scene.getObjectByName('__shoe__');
    if (prev) scene.remove(prev);

    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') return;

    const loader = new THREE.GLTFLoader();
    loader.load(
      path,
      gltf => {
        const shoe = gltf.scene;
        shoe.name = '__shoe__';

        // Centre and scale to fit a normalised unit box.
        const box    = new THREE.Box3().setFromObject(shoe);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        shoe.position.sub(centre);
        shoe.scale.setScalar(1.8 / maxDim);

        scene.add(shoe);
      },
      undefined,
      err => console.warn(`[STRIDE] Could not load ${path}:`, err)
    );
  }

  // Initialise Three.js viewer if the container and Three.js are both present.
  if (viewerEl && typeof THREE !== 'undefined') {
    const W = viewerEl.clientWidth  || 600;
    const H = viewerEl.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    viewerEl.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 3.5);

    // Lighting — two soft area lights, no harsh specular.
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const key     = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 5, 4);
    const fill    = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, 1, -2);
    scene.add(ambient, key, fill);

    // Drag-to-rotate state.
    let dragging = false, lastX = 0, rotY = 0;

    renderer.domElement.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      rotY += (e.clientX - lastX) * .008;
      lastX = e.clientX;
    });
    renderer.domElement.addEventListener('pointerup',     () => dragging = false);
    renderer.domElement.addEventListener('pointercancel', () => dragging = false);

    // Resize handling.
    const ro = new ResizeObserver(() => {
      const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(viewerEl);

    // Load the initial shoe.
    loadShoeGLB(scene, activeColor);

    // Render loop — slow auto-spin when not dragging.
    (function loop() {
      requestAnimationFrame(loop);
      const shoe = scene.getObjectByName('__shoe__');
      if (shoe) {
        if (!dragging && !reduced) rotY += 0.004;
        shoe.rotation.y = rotY;
      }
      renderer.render(scene, camera);
    })();

    // Expose a global so colour-switcher buttons can call it.
    window.__strideSetColor = color => {
      color = color.trim().toLowerCase();
      if (shoeModels[color] && color !== activeColor) {
        activeColor = color;
        loadShoeGLB(scene, color);
      }
    };
  }

  /* ─── Colour-swatch click handler ──────────────────────────────────────
   *  Elements with  data-shoe-color="<name>"  act as swatches.
   *  Clicking one:
   *    1. swaps the active class for CSS highlight
   *    2. calls __strideSetColor() if the 3-D viewer is running
   *    3. falls back to scrolling to / showing the matching section
   * ─────────────────────────────────────────────────────────────────────── */
  colorSections.forEach(el => {
    el.addEventListener('click', () => {
      const color = el.dataset.shoeColor.trim().toLowerCase();
      document.querySelectorAll('[data-shoe-color]').forEach(s => s.classList.remove('color-active'));
      el.classList.add('color-active');
      if (typeof window.__strideSetColor === 'function') window.__strideSetColor(color);
    });
  });

  /* ─── Legacy CSS spin (product.html fallback when no GLB yet) ─── */
  const spin    = document.querySelector('.shoe-spin');
  const gallery = document.querySelector('.gallery-main');
  if (spin && gallery && !viewerEl) {
    let down = false, last = 0, angle = 0;
    gallery.addEventListener('pointerdown', e => {
      down = true; last = e.clientX;
      gallery.setPointerCapture(e.pointerId);
      spin.style.animation = 'none';
      spin.style.cursor = 'grabbing';
    });
    gallery.addEventListener('pointermove', e => {
      if (!down) return;
      angle += (e.clientX - last) * .7;
      last = e.clientX;
      spin.style.transform = `rotate(-18deg) rotateY(${angle}deg)`;
    });
    const end = () => { down = false; spin.style.cursor = 'grab'; };
    gallery.addEventListener('pointerup',     end);
    gallery.addEventListener('pointercancel', end);
  }

  /* ─── Mobile navigation ─── */
  const toggle = document.querySelector('.menu-toggle');
  const nav    = document.querySelector('.site-header nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ─── Newsletter ─── */
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const old = btn.textContent;
      btn.textContent = 'THANK YOU — ممنون!';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = old; btn.disabled = false; form.reset(); }, 3200);
    });
  });

})();
