/* Homepage-only motion. Content is visible without JS; no scroll hijacking. */
(function () {
  'use strict';
  var root = document.getElementById('routeGate');
  if (!root) return;
  var progress = document.getElementById('pfProgress');
  var portrait = root.querySelector('.fmb-portrait');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = window.matchMedia('(max-width: 700px)');
  var links = root.querySelectorAll('.fmb-nav nav a[href^="#"]');
  var sections = Array.from(root.querySelectorAll('section[id]'));
  var pending = false;
  function paint() {
    pending = false;
    if (!document.body.classList.contains('route-locked') || root.hidden) return;
    var y = window.scrollY;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.width = Math.min(100, Math.max(0, y / max * 100)) + '%';
    if (portrait) portrait.style.setProperty('--portrait-shift', (!motion.matches && !mobile.matches ? Math.min(y * .035, 18) : 0) + 'px');
    var active = '';
    sections.forEach(function (section) { if (section.getBoundingClientRect().top < window.innerHeight * .4) active = '#' + section.id; });
    links.forEach(function (link) { if (link.getAttribute('href') === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }
  function queue() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  motion.addEventListener('change', queue);
  new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  queue();
})();
