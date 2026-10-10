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

  /* ─── Vanilla tilt ─── */
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

  /* ─── Hero parallax ─── */
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

  /* ─── Magnetic CTA buttons ─── */
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width  / 2) * .08}px,${(e.clientY - r.top  - r.height / 2) * .12}px)`;
      });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* ─── Three.js GLB viewer ───────────────────────────────────────────────
   *
   *  Requirements in index.html / product.html:
   *    1. Load Three.js r150+ before this script:
   *         <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
   *    2. Load GLTFLoader:
   *         <script src="https://unpkg.com/three@0.160.0/examples/js/loaders/GLTFLoader.js"></script>
   *    3. Mark the viewer container:
   *         <div data-shoe-viewer style="width:100%;height:500px"></div>
   *    4. Mark colour-variant sections:
   *         <section data-shoe-color="blue"> … </section>
   *    5. Place GLB files at:
   *         /models/shoe-<color>.glb   (e.g. shoe-blue.glb, shoe-white.glb)
   *
   *  Everything auto-wires from those attributes — no further JS edits needed
   *  when adding new colour variants.
   * ────────────────────────────────────────────────────────────────────── */

  const colorSections = document.querySelectorAll('[data-shoe-color]');
  const shoeModels = {};
  colorSections.forEach(el => {
    const color = el.dataset.shoeColor.trim().toLowerCase();
    if (color) shoeModels[color] = `models/shoe-${color}.glb`;
  });

  let activeColor = colorSections.length
    ? [...colorSections][0].dataset.shoeColor.trim().toLowerCase()
    : 'black';

  const viewerEl = document.querySelector('[data-shoe-viewer]');

  function loadShoeGLB(scene, color) {
    const path = shoeModels[color];
    if (!path) return;

    const prev = scene.getObjectByName('__shoe__');
    if (prev) {
      // Dispose geometry + materials to avoid GPU leaks
      prev.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose());
        }
      });
      scene.remove(prev);
    }

    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
      console.warn('[STRIDE] Three.js or GLTFLoader not found. Load them before main.js.');
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      path,
      gltf => {
        const shoe = gltf.scene;
        shoe.name = '__shoe__';

        // Centre + normalise scale
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

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key  = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    // Drag-to-rotate
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

    // Responsive resize
    new ResizeObserver(() => {
      const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }).observe(viewerEl);

    loadShoeGLB(scene, activeColor);

    // Render loop
    (function loop() {
      requestAnimationFrame(loop);
      const shoe = scene.getObjectByName('__shoe__');
      if (shoe) {
        if (!dragging && !reduced) rotY += 0.004;
        shoe.rotation.y = rotY;
      }
      renderer.render(scene, camera);
    })();

    // Public API for colour switcher buttons
    window.__strideSetColor = color => {
      color = color.trim().toLowerCase();
      if (shoeModels[color] && color !== activeColor) {
        activeColor = color;
        loadShoeGLB(scene, color);
      }
    };
  }

  /* ─── Colour-swatch click handler ─── */
  colorSections.forEach(el => {
    el.addEventListener('click', () => {
      const color = el.dataset.shoeColor.trim().toLowerCase();
      document.querySelectorAll('[data-shoe-color]').forEach(s => s.classList.remove('color-active'));
      el.classList.add('color-active');
      if (typeof window.__strideSetColor === 'function') window.__strideSetColor(color);
    });
  });

  /* ─── CSS-spin fallback (product.html, no GLB yet) ─── */
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
