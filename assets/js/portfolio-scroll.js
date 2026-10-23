/* Progressive, homepage-scoped motion. Native scrolling stays in control. */
(function () {
  'use strict';
  var gate = document.getElementById('routeGate');
  var site = document.getElementById('portfolio');
  if (!gate || !site) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var small = window.matchMedia('(max-width: 760px)');
  var progress = document.getElementById('pfProgress');
  var portrait = site.querySelector('.fmb-photo-window');
  var hero = site.querySelector('.fmb-hero');
  var cards = Array.from(site.querySelectorAll('[data-case]'));
  var statement = site.querySelector('[data-read]');
  var toggle = site.querySelector('.fmb-motion');
  var links = Array.from(site.querySelectorAll('.fmb-nav nav a[href^="#"]'));
  var sections = Array.from(site.querySelectorAll('section[id]'));
  var words = [];
  var observer;
  var scheduled = false;
  var paused = false;
  try { paused = sessionStorage.getItem('fmb-motion-paused') === 'true'; } catch (_) {}

  // Keep the complete heading as its accessible name while individual words react to scroll.
  if (statement) {
    var sentence = statement.textContent.trim();
    statement.setAttribute('aria-label', sentence);
    var fragment = document.createDocumentFragment();
    sentence.split(/\s+/).forEach(function (word, i) {
      if (i) fragment.appendChild(document.createTextNode(' '));
      var span = document.createElement('span');
      span.setAttribute('data-word', '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = word;
      words.push(span);
      fragment.appendChild(span);
    });
    statement.replaceChildren(fragment);
  }

  function enabled() { return !reduced.matches && !paused; }
  function syncMotion() {
    site.classList.toggle('motion-paused', !enabled());
    if (toggle) {
      toggle.hidden = reduced.matches;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'Enable motion' : 'Pause motion';
    }
    queue();
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function paint() {
    scheduled = false;
    if (gate.hidden || !document.body.classList.contains('route-locked')) return;
    var viewport = window.innerHeight;
    var max = Math.max(1, document.documentElement.scrollHeight - viewport);
    if (progress) progress.style.width = clamp(window.scrollY / max * 100, 0, 100) + '%';
    var motion = enabled();
    if (portrait && hero) {
      var heroTop = hero.getBoundingClientRect().top;
      var amount = motion ? clamp(-heroTop / viewport, 0, 1) : 0;
      portrait.style.setProperty('--portrait-scale', String(motion ? 1.035 + amount * .035 : 1));
      portrait.style.setProperty('--portrait-shift', (motion ? -amount * 14 : 0) + 'px');
    }
    if (statement) {
      var r = statement.getBoundingClientRect();
      var reading = motion ? clamp((viewport * .8 - r.top) / (r.height + viewport * .28), 0, 1) : 1;
      words.forEach(function (word, i) { word.classList.toggle('is-read', i / words.length <= reading); });
    }
    cards.forEach(function (card, i) {
      var next = cards[i + 1];
      var depth = motion && !small.matches && next ? clamp((viewport * .9 - next.getBoundingClientRect().top) / (viewport * .75), 0, 1) : 0;
      card.style.setProperty('--case-scale', String(1 - depth * .035));
    });
    var active = '';
    sections.forEach(function (section) { if (section.getBoundingClientRect().top < viewport * .4) active = '#' + section.id; });
    links.forEach(function (link) {
      if (link.getAttribute('href') === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queue() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(paint); }
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    site.querySelectorAll('[data-reveal]').forEach(function (element) { observer.observe(element); });
    site.classList.add('motion-ready');
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      paused = !paused;
      try { sessionStorage.setItem('fmb-motion-paused', String(paused)); } catch (_) {}
      syncMotion();
    });
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('pageshow', queue);
  reduced.addEventListener('change', syncMotion);
  small.addEventListener('change', queue);
  new MutationObserver(queue).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncMotion();
})();
