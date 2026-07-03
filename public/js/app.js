/* ============================================================
   LamsaDZ — Front-end behavior
   ============================================================ */
(function () {
  'use strict';

  var CSRF = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---- API helper (sends CSRF header) ---- */
  function apiPost(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
      body: JSON.stringify(data || {}),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }

  /* ---- Analytics tracking ---- */
  function track(type, extra) {
    try {
      var payload = Object.assign({ type: type, path: location.pathname }, extra || {});
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      // Beacon can't set CSRF header; the /track route uses its own light limiter + is non-mutating analytics.
      if (navigator.sendBeacon) {
        // fall back to fetch with header so CSRF passes
        apiPost('/api/track', payload).catch(function () {});
      } else {
        apiPost('/api/track', payload).catch(function () {});
      }
    } catch (e) { /* no-op */ }
  }

  /* ---- Mobile menu ---- */
  var menuToggle = $('#menuToggle');
  var navLinks = $('#navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- Language menu ---- */
  var langSwitch = $('#langSwitch');
  var langBtn = $('#langBtn');
  if (langBtn && langSwitch) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      langSwitch.classList.toggle('open');
    });
    document.addEventListener('click', function () { langSwitch.classList.remove('open'); });
  }

  /* ---- Search bar toggle + suggestions ---- */
  var searchToggle = $('#searchToggle');
  var searchBar = $('#searchBar');
  var searchInput = $('#searchInput');
  var suggestions = $('#suggestions');
  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', function () {
      searchBar.hidden = !searchBar.hidden;
      if (!searchBar.hidden && searchInput) searchInput.focus();
    });
  }
  if (searchInput && suggestions) {
    var debounce;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounce);
      var q = searchInput.value.trim();
      if (q.length < 2) { suggestions.hidden = true; suggestions.innerHTML = ''; return; }
      debounce = setTimeout(function () {
        fetch('/api/suggest?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data.suggestions || !data.suggestions.length) { suggestions.hidden = true; return; }
            suggestions.innerHTML = data.suggestions.map(function (s) {
              var img = s.image ? '<img src="' + s.image + '" alt="">' : '<span style="width:38px;height:38px;display:inline-block;background:#f3f0e8;border-radius:8px"></span>';
              return '<a href="/product/' + s.slug + '">' + img +
                '<span>' + escapeHtml(s.name_en) + '</span>' +
                '<span class="s-price">' + (s.price ? s.price + ' DA' : '') + '</span></a>';
            }).join('');
            suggestions.hidden = false;
          }).catch(function () {});
      }, 220);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- WhatsApp click tracking ---- */
  $all('.wa-track').forEach(function (el) {
    el.addEventListener('click', function () {
      var pid = el.getAttribute('data-product-id');
      track('whatsapp_click', pid ? { product_id: pid } : {});
      if (window.gtag) gtag('event', 'whatsapp_click', { product_id: pid || null });
    });
  });

  /* ---- Product click tracking ---- */
  $all('.product-name, .product-media').forEach(function (el) {
    el.addEventListener('click', function () {
      var card = el.closest('.product-card');
      if (card) {
        var pid = card.getAttribute('data-product-id');
        track('product_click', { product_id: pid });
      }
    });
  });

  /* ---- Wishlist toggle ---- */
  $all('[data-wish]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var pid = btn.getAttribute('data-wish');
      apiPost('/api/wishlist', { product_id: pid }).then(function (res) {
        if (res.ok) {
          btn.classList.toggle('active', res.body.inWishlist);
          var svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', res.body.inWishlist ? 'currentColor' : 'none');
        } else if (res.body && res.body.error && /Authentication/.test(res.body.error)) {
          location.href = '/login?next=' + encodeURIComponent(location.pathname);
        }
      });
    });
  });

  /* ---- Compare toggle ---- */
  $all('[data-compare]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var pid = btn.getAttribute('data-compare');
      apiPost('/api/compare', { product_id: pid }).then(function (res) {
        if (res.ok) {
          btn.classList.toggle('active', res.body.inCompare);
          flash(btn, res.body.inCompare ? 'Added to compare' : 'Removed');
        } else if (res.body && res.body.error) {
          if (/Authentication/.test(res.body.error)) location.href = '/login?next=' + encodeURIComponent(location.pathname);
          else flash(btn, res.body.error);
        }
      });
    });
  });

  function flash(el, msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---- Generic AJAX form (contact / newsletter / review) ---- */
  function ajaxForm(formId, msgId, url) {
    var form = $('#' + formId);
    if (!form) return;
    var msg = msgId ? $('#' + msgId) : null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      apiPost(url, data).then(function (res) {
        if (msg) {
          msg.textContent = (res.body && res.body.message) || (res.ok ? 'Done!' : (res.body.error || 'Error'));
          msg.className = (msgId === 'newsMsg' ? 'news-msg ' : 'form-msg ') + (res.ok ? 'ok' : 'err');
        }
        if (res.ok) form.reset();
      });
    });
  }
  ajaxForm('contactForm', 'contactMsg', '/api/contact');
  ajaxForm('newsForm', 'newsMsg', '/api/subscribe');
  ajaxForm('reviewForm', 'reviewMsg', '/api/reviews');

  /* ---- Scroll reveal ---- */
  var revealEls = $all('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }
})();
