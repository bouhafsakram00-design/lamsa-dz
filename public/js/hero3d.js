/* ============================================================
   LamsaDZ — Cinematic 3D Hero (Three.js, code-built phone)
   - No external model files (fast; nothing multi-MB to download)
   - Auto-fallback: only runs on capable, non-reduced-motion,
     wide-enough, decent-connection devices.
   - Scroll-driven rotation + floating particles + blue ambient light.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('hero3d');
  if (!canvas) return;

  // ---------- Capability gate (protect mobile speed & battery) ----------
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.innerWidth < 900;
  var conn = navigator.connection || {};
  var slow = conn.saveData || /(^|-)(2|3)g$/.test(conn.effectiveType || '');
  var lowMem = (navigator.deviceMemory || 4) < 4;
  if (reduce || narrow || slow || lowMem) return; // graceful fallback = static hero image

  // ---------- Load Three.js from CDN (only now that we passed the gate) ----------
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  var s = document.createElement('script');
  s.src = THREE_URL;
  s.onload = init;
  s.onerror = function () { /* CDN blocked → keep static hero */ };
  document.head.appendChild(s);

  function init() {
    var THREE = window.THREE;
    if (!THREE) return;
    var hero = canvas.closest('.hero');

    var scene = new THREE.Scene();
    var W = canvas.clientWidth, H = canvas.clientHeight || 500;

    var camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);

    // ---------- Lighting: dark scene, blue ambient + rim ----------
    scene.add(new THREE.AmbientLight(0x2a4a7a, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 6); scene.add(key);
    var blue = new THREE.PointLight(0x2f8fff, 3.2, 30); blue.position.set(-5, 2, 4); scene.add(blue);
    var silver = new THREE.PointLight(0x9ec5ff, 2.0, 30); silver.position.set(5, -3, 5); scene.add(silver);

    // ---------- Build a premium phone from geometry ----------
    var phone = new THREE.Group();

    function rounded(w, h, r, d) {
      var shape = new THREE.Shape();
      var x = -w / 2, y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
      return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, steps: 1 });
    }

    // Body (metallic titanium frame)
    var bodyGeo = rounded(3.0, 6.2, 0.55, 0.5);
    bodyGeo.center();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x11151c, metalness: 0.95, roughness: 0.28 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    phone.add(body);

    // Screen (deep glass with slight blue tint + emissive glow)
    var screenGeo = rounded(2.6, 5.7, 0.4, 0.06); screenGeo.center();
    var screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1730, metalness: 0.5, roughness: 0.08, emissive: 0x0d2a5a, emissiveIntensity: 0.6 });
    var screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.29;
    phone.add(screen);

    // Camera bump (back)
    var camBump = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0c0f14, metalness: 0.9, roughness: 0.3 })
    );
    camBump.position.set(-0.6, 1.9, -0.32);
    phone.add(camBump);
    [[-0.85, 2.15], [-0.35, 2.15], [-0.6, 1.65]].forEach(function (p) {
      var lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a3a6a, metalness: 1, roughness: 0.1, emissive: 0x0a2a5a, emissiveIntensity: 0.4 })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(p[0], p[1], -0.4);
      phone.add(lens);
    });

    phone.rotation.set(0.15, -0.5, 0);
    phone.position.x = 2.2; // sit on the right of the hero
    scene.add(phone);

    // ---------- Floating particles / light dust ----------
    var pCount = 220;
    var pGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(pCount * 3);
    for (var i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x6fa8dc, size: 0.05, transparent: true, opacity: 0.7 }));
    scene.add(particles);

    hero.classList.add('has-3d');

    // ---------- Interaction: mouse + scroll ----------
    var targetRotY = -0.5, targetRotX = 0.15, mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });

    var scrollY = 0;
    window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });

    // ---------- Resize ----------
    function onResize() {
      W = canvas.clientWidth; H = canvas.clientHeight || 500;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
      if (window.innerWidth < 900) { renderer.setAnimationLoop(null); } // bail to fallback if resized narrow
    }
    window.addEventListener('resize', onResize, { passive: true });

    // ---------- Animate (60fps) ----------
    var t = 0;
    renderer.setAnimationLoop(function () {
      t += 0.008;
      // gentle idle float + auto spin, blended with mouse + scroll
      targetRotY = -0.5 + mouseX * 0.6 + scrollY * 0.0016 + Math.sin(t) * 0.08;
      targetRotX = 0.15 + mouseY * 0.4 + Math.cos(t * 0.8) * 0.05;
      phone.rotation.y += (targetRotY - phone.rotation.y) * 0.06;
      phone.rotation.x += (targetRotX - phone.rotation.x) * 0.06;
      phone.position.y = Math.sin(t * 1.2) * 0.25;
      // scroll: pull camera slightly closer + screen glow pulse
      camera.position.z = 9 - Math.min(scrollY, 400) * 0.004;
      screenMat.emissiveIntensity = 0.55 + Math.sin(t * 2) * 0.15;
      particles.rotation.y += 0.0006;
      blue.position.x = Math.sin(t * 0.6) * 5;
      renderer.render(scene, camera);
    });
  }
})();
