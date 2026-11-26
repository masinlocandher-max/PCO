/* Progressive enhancement for the homepage. Native links and disclosure remain usable without this script. */
(() => {
  'use strict';
  const home = document.getElementById('portfolio');
  if (!home) return;
  const menu = home.querySelector('.gold-menu');
  const booking = document.getElementById('booking-panel');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('click', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (menu.open && event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  home.querySelectorAll('[data-appointment]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      booking.open = true;
    });
  });
  home.querySelector('[data-print-cv]').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Keep the locked CV's existing print handler and its print stylesheet.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (location.hash === '#cv' && document.getElementById('routeGate').hidden) {
        document.getElementById('cvPrint').click();
      }
    }));
  });

  const carousel = home.querySelector('[data-carousel]');
  const track = carousel.querySelector('.gold-track');
  const cards = [...track.children];
  const dots = carousel.querySelector('.gold-dots');
  const prev = carousel.querySelector('[data-prev]');
  const next = carousel.querySelector('[data-next]');
  let pages = [];
  let frame = 0;

  const start = card => card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  const closest = () => pages.reduce((a, p, i) => Math.abs(track.scrollLeft - p) < Math.abs(track.scrollLeft - pages[a]) ? i : a, 0);
  function sync() {
    const i = closest();
    prev.disabled = i === 0;
    next.disabled = i >= pages.length - 1;
    [...dots.children].forEach((button, n) => {
      if (n === i) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }
  function go(i) {
    track.scrollTo({left: pages[Math.max(0, Math.min(pages.length - 1, i))], behavior: reduceMotion.matches ? 'instant' : 'smooth'});
  }
  function measure() {
    if (!track.clientWidth) return;
    const step = start(cards[1]) - start(cards[0]);
    if (step <= 0) return;
    const perPage = Math.max(1, Math.round(track.clientWidth / step));
    const max = track.scrollWidth - track.clientWidth;
    const nextPages = cards.filter((_, i) => i % perPage === 0).map(card => Math.min(max, start(card)));
    if (nextPages.length !== pages.length) {
      dots.replaceChildren(...nextPages.map((_, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Photograph page ' + (i + 1));
        button.setAttribute('aria-controls', track.id);
        button.addEventListener('click', () => go(i));
        return button;
      }));
    }
    pages = nextPages;
    dots.hidden = carousel.querySelector('.gold-arrows').hidden = pages.length < 2;
    sync();
  }
  prev.addEventListener('click', () => go(closest() - 1));
  next.addEventListener('click', () => go(closest() + 1));
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sync);
  }, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track);
  else window.addEventListener('resize', measure);
  measure();
})();
