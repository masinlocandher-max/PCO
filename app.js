/* Presidential Communications Office application profile — interactions.
   Standalone: no framework, no ecosystem script, no external dependency. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reveals ------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in-view'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(reveals, function (el) { revealObserver.observe(el); });
  }

  /* progress + active section ------------------------------------------- */
  var progressBar = document.getElementById('progressBar');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.topbar nav a'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (progressBar) progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
      var current = '';
      sections.forEach(function (section) {
        if (window.scrollY >= section.offsetTop - 180) current = '#' + section.id;
      });
      navLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === current);
      });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* scroll lock ---------------------------------------------------------- */
  var locks = 0;
  function lock() { locks += 1; document.body.style.overflow = 'hidden'; }
  function unlock() { locks = Math.max(0, locks - 1); if (!locks) document.body.style.overflow = ''; }

  /* full screen image viewer -------------------------------------------- */
  var viewer = document.getElementById('viewer');
  var viewerImage = document.getElementById('viewerImage');
  var viewerCaption = document.getElementById('viewerCaption');
  var viewerClose = document.getElementById('viewerClose');
  var lastFocused = null;

  function openViewer(src, caption, alt) {
    if (!viewer || !viewerImage || !src) return;
    viewerImage.src = src;
    viewerImage.alt = alt || caption || '';
    if (viewerCaption) viewerCaption.textContent = caption || '';
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    lock();
    if (viewerClose) viewerClose.focus();
  }

  function closeViewer() {
    if (!viewer || !viewer.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    if (viewerImage) viewerImage.removeAttribute('src');
    unlock();
    if (lastFocused) { lastFocused.focus(); lastFocused = null; }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.plate'), function (plate) {
    plate.addEventListener('click', function () {
      var image = plate.querySelector('img');
      lastFocused = plate;
      openViewer(plate.getAttribute('data-full'), plate.getAttribute('data-caption'), image ? image.alt : '');
    });
  });

  if (viewerClose) viewerClose.addEventListener('click', closeViewer);
  if (viewer) {
    viewer.addEventListener('click', function (event) {
      if (event.target === viewer || event.target.classList.contains('viewer-stage')) closeViewer();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeViewer();
  });
})();
