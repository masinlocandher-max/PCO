/* Miss Intercontinental application microsite — interactions.
   Standalone: no dependency on fmb-unified-system.js or any ecosystem script. */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reveals ------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in-view'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* progress + active section ------------------------------------------- */
  var progressBar = document.getElementById('progressBar');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.topbar nav a'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  function onScroll() {
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
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* scroll lock ---------------------------------------------------------- */
  var locks = 0;
  function lock() { locks += 1; document.body.style.overflow = 'hidden'; }
  function unlock() { locks = Math.max(0, locks - 1); if (!locks) document.body.style.overflow = ''; }

  /* entry gate + opening music ------------------------------------------ */
  var gate = document.getElementById('gate');
  var gateSound = document.getElementById('gateSound');
  var gateSilent = document.getElementById('gateSilent');
  var pill = document.getElementById('audioToggle');
  var label = document.getElementById('audioLabel');
  var music = document.getElementById('openingMusic');
  var CHOICE = 'fmb-mi-entry';

  function remembered() {
    try { return sessionStorage.getItem(CHOICE); } catch (e) { return null; }
  }
  function remember(value) {
    try { sessionStorage.setItem(CHOICE, value); } catch (e) { /* private mode */ }
  }

  function paint(playing) {
    if (!pill) return;
    pill.setAttribute('aria-pressed', playing ? 'true' : 'false');
    pill.setAttribute('aria-label', playing ? 'Pause opening music' : 'Play opening music');
    if (label) label.textContent = playing ? 'Playing' : 'Music';
  }

  /* Autoplay is blocked on iOS Safari and most modern browsers unless sound
     starts inside a user gesture. The gate button IS that gesture, so
     playback is only ever started from a click handler, never on load. */
  function play() {
    if (!music) return;
    var attempt = music.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () { paint(false); });
    }
  }

  function closeGate() {
    if (!gate) return;
    gate.classList.remove('is-open');
    unlock();
    window.setTimeout(function () {
      if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
    }, 600);
  }

  if (music && pill) {
    pill.hidden = false;
    paint(false);
    music.addEventListener('play', function () { paint(true); });
    music.addEventListener('pause', function () { paint(false); });
    pill.addEventListener('click', function () {
      if (music.paused) play(); else music.pause();
    });
  }

  if (gate) {
    if (remembered()) {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
    } else {
      gate.classList.add('is-open');
      lock();
      if (gateSound) {
        gateSound.focus();
        gateSound.addEventListener('click', function () {
          remember('sound');
          play();
          closeGate();
        });
      }
      if (gateSilent) {
        gateSilent.addEventListener('click', function () {
          remember('silent');
          closeGate();
        });
      }
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && gate.classList.contains('is-open')) {
          remember('silent');
          closeGate();
        }
      });
    }
  }

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

  document.querySelectorAll('.plate').forEach(function (plate) {
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
