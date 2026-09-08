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
