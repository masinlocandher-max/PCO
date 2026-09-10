/* Passage controls only. Scroll choreography uses book.js's existing --p system. */
(() => {
  const track = document.querySelector('.passage-track');
  if (!track) return;
  const passages = [...track.children];
  const buttons = [...document.querySelectorAll('[data-passage-step]')];
  const count = document.querySelector('.passage-count');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  const target = (i) => passages[i].offsetLeft - passages[0].offsetLeft;
  const go = (i) => track.scrollTo({left: target(Math.max(0, Math.min(passages.length - 1, i))), behavior: reduce.matches ? 'auto' : 'smooth'});
  buttons.forEach(button => button.addEventListener('click', () => go(current + Number(button.dataset.passageStep))));
  track.addEventListener('keydown', event => {
    const keys = {ArrowRight:current + 1,ArrowLeft:current - 1,Home:0,End:passages.length - 1};
    if (!(event.key in keys)) return;
    event.preventDefault(); go(keys[event.key]);
  });
  const sync = () => {
    current = passages.reduce((best, _, i) => Math.abs(target(i) - track.scrollLeft) < Math.abs(target(best) - track.scrollLeft) ? i : best, 0);
    count.textContent = String(current + 1).padStart(2, '0') + ' / 06';
    buttons[0].disabled = current === 0; buttons[1].disabled = current === passages.length - 1;
  };
  track.addEventListener('scroll', sync, {passive:true}); sync();
})();

/* Active navigation uses visibility observation, without another scroll listener. */
(() => {
  if (!('IntersectionObserver' in window)) return;
  const links = [...document.querySelectorAll('#bookNavLinks a[href^="#"]')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.set(entry.target, entry.intersectionRatio);
      else visible.delete(entry.target);
    });
    const active = [...visible].sort((a,b) => b[1]-a[1])[0];
    if (!active) return;
    links.forEach(link => {
      if (link.getAttribute('href') === '#' + active[0].id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }, {rootMargin:'-12% 0px -40% 0px',threshold:[0,.15,.35,.65]});
  sections.forEach(section => observer.observe(section));
})();

/* Load the hosted PayMongo checkout enhancer on the book landing page. */
(() => {
  if (!/^\/book\/(?:index\.html)?$/i.test(window.location.pathname)) return;
  if (document.querySelector('script[data-book-paymongo]')) return;
  const script = document.createElement('script');
  script.src = '/book/paymongo.js?v=20260910-1';
  script.async = true;
  script.setAttribute('data-book-paymongo', '');
  document.head.appendChild(script);
})();
