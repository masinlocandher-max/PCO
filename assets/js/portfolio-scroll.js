/* Scroll-driven portfolio interactions for the home experience. */
(function () {
  'use strict';

  var root = document.getElementById('routeGate');
  var shell = document.getElementById('portfolio');
  if (!root || !shell || !document.body.classList.contains('route-locked')) {
    // Still bind when portfolio becomes visible later
  }

  var progress = document.getElementById('pfProgress');
  var nav = document.querySelector('.pf-nav');
  var heroMedia = document.querySelector('.pf-hero-media');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function portfolioVisible() {
    return document.body.classList.contains('route-locked') && root && !root.hidden;
  }

  function onScroll() {
    if (!portfolioVisible()) return;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
    if (nav) nav.classList.toggle('is-solid', window.scrollY > 40);

    if (heroMedia && !reduce) {
      var y = Math.min(window.scrollY, window.innerHeight);
      heroMedia.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
    }

    // Active nav section
    var ids = ['brands', 'selected-work', 'practice', 'about', 'consult'];
    var active = '';
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      var top = el.getBoundingClientRect().top;
      if (top <= window.innerHeight * 0.35) active = ids[i];
    }
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + active);
      });
    }

    // Sticky case activation
    Array.prototype.forEach.call(document.querySelectorAll('[data-pf-case]'), function (caseEl) {
      var r = caseEl.getBoundingClientRect();
      var mid = r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.35;
      caseEl.classList.toggle('is-active', mid);
    });
  }

  function reveal() {
    var nodes = document.querySelectorAll('[data-pf-reveal]');
    if (!nodes.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reveal();
  onScroll();

  // Re-run when returning from CV to portfolio
  var obs = new MutationObserver(function () {
    if (portfolioVisible()) {
      onScroll();
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
