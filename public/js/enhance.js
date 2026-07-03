/* ============================================================
   LamsaDZ — Premium interactions (elegant, performant)
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Scroll progress bar ---- */
  var progress = document.createElement('div');
  progress.id = 'scrollProgress';
  document.body.appendChild(progress);

  /* ---- 2. Back-to-top button ---- */
  var toTop = document.createElement('button');
  toTop.id = 'backToTop';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  function onScroll() {
    var h = document.documentElement;
    var scrolled = h.scrollTop;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (scrolled / max) * 100 : 0;
    progress.style.width = pct + '%';
    toTop.classList.toggle('show', scrolled > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- 3. Count-up animation for hero stats ---- */
  function animateCount(el) {
    var text = el.textContent.trim();
    var match = text.match(/(\d[\d,]*)/);
    if (!match) return;
    var target = parseInt(match[1].replace(/,/g, ''), 10);
    var suffix = text.replace(match[1], '').trim();
    if (reduce || !target) return;
    var start = 0;
    var dur = 1400;
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      var val = Math.round(eased * target);
      el.textContent = val.toLocaleString() + (suffix ? (text.indexOf(match[1]) === 0 ? suffix : suffix) : '');
      // keep the "+"/suffix format like "58" or "1000+"
      el.textContent = val.toLocaleString() + (suffix || '');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + (suffix || '');
    }
    requestAnimationFrame(tick);
  }

  var statEls = document.querySelectorAll('.hero-stats strong');
  if ('IntersectionObserver' in window && statEls.length) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animateCount(en.target); statObs.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    statEls.forEach(function (el) { statObs.observe(el); });
  }

  /* ---- 4. Auto-add reveal class to key sections (progressive enhancement) ---- */
  if (!reduce) {
    var autoReveal = document.querySelectorAll('.product-card, .cat-card, .testi-card, .why-card, .srv-card, .trust-badge');
    autoReveal.forEach(function (el, i) {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        el.style.transitionDelay = (Math.min(i % 4, 3) * 0.06) + 's';
      }
    });
    if ('IntersectionObserver' in window) {
      var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('visible'); revObs.unobserve(en.target); }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) { revObs.observe(el); });
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---- 5. Ripple effect on buttons ---- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var circle = document.createElement('span');
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      circle.style.cssText =
        'position:absolute;border-radius:50%;background:rgba(255,255,255,.5);' +
        'transform:scale(0);animation:ripple .6s ease-out;pointer-events:none;' +
        'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - rect.left - size / 2) +
        'px;top:' + (e.clientY - rect.top - size / 2) + 'px;';
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(circle);
      setTimeout(function () { circle.remove(); }, 600);
    });
    // inject ripple keyframes once
    var style = document.createElement('style');
    style.textContent = '@keyframes ripple{to{transform:scale(2.5);opacity:0}}';
    document.head.appendChild(style);
  }
})();

/* ============================================================
   PREMIUM redesign interactions (header glass, parallax, tilt)
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: transparent at top → glass on scroll */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScrollHeader, { passive: true });
    onScrollHeader();
  }

  if (reduce) return;

  /* Subtle parallax on the hero background as you scroll */
  var hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < 700) hero.style.backgroundPosition = 'center ' + (y * 0.15) + 'px';
    }, { passive: true });
  }

  /* Premium 3D tilt on product cards (mouse-follow depth) */
  var cards = document.querySelectorAll('.product-card, .cat-card');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width - 0.5;
      var cy = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'translateY(-8px) perspective(900px) rotateX(' + (-cy * 4) + 'deg) rotateY(' + (cx * 4) + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });
})();
