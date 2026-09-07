(function(){
  'use strict';

  /* Orders remain email-based until a hosted checkout is deliberately connected. */
  function initCheckout(){
    var config=window.FMB_BOOK_CHECKOUT;
    if(!config&&window.FMB_BOOK_CHECKOUT_URL)config={ebook:window.FMB_BOOK_CHECKOUT_URL};
    if(!config)return;
    document.querySelectorAll('[data-edition]').forEach(function(link){
      var url=config[link.getAttribute('data-edition')];
      if(!url)return;
      link.href=url;link.target='_blank';link.rel='noopener';
    });
  }

  function initNav(){
    var bar=document.getElementById('bookNav'),toggle=document.getElementById('navToggle'),panel=document.getElementById('bookNavLinks');
    if(!bar||!toggle||!panel)return;
    var desktop=window.matchMedia('(min-width:861px)');
    function isOpen(){return bar.hasAttribute('data-nav-open');}
    function setOpen(open){if(open)bar.setAttribute('data-nav-open','');else bar.removeAttribute('data-nav-open');toggle.setAttribute('aria-expanded',open?'true':'false');toggle.setAttribute('aria-label',open?'Close menu':'Open menu');}
    toggle.addEventListener('click',function(e){e.stopPropagation();setOpen(!isOpen());});
    panel.addEventListener('click',function(e){if(e.target.closest('a'))setOpen(false);});
    document.addEventListener('click',function(e){if(isOpen()&&!bar.contains(e.target))setOpen(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen()){setOpen(false);toggle.focus();}});
    function sync(){if(desktop.matches)setOpen(false);} if(desktop.addEventListener)desktop.addEventListener('change',sync);else if(desktop.addListener)desktop.addListener(sync);sync();
  }

  function initOffline(){
    if(!('serviceWorker' in navigator))return;
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});
  }

  function initReveal(){
    var passages=document.querySelectorAll('.passage');
    if(!passages.length||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    passages.forEach(function(el){el.setAttribute('data-reveal','');});
    var watcher=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;entry.target.setAttribute('data-reveal','in');watcher.unobserve(entry.target);});},{rootMargin:'0px 0px -12% 0px',threshold:.15});
    passages.forEach(function(el){watcher.observe(el);});
  }

  /* The shell may be installable, but manuscript text is not shipped with it.
     Protected text is delivered chapter by chapter only after Supabase verifies access. */
  function alignReaderCopy(){
    var buy=document.querySelector('[data-edition="ebook"]');
    var card=buy&&buy.closest('.edition');
    if(!card)return;
    var note=card.querySelector('.edition-note');
    if(note)note.textContent='Protected reader access';
    card.querySelectorAll('li').forEach(function(li){
      var t=li.textContent.trim().toLowerCase();
      if(t.indexOf('without a signal')>=0)replaceListCopy(li,'Chapter-by-chapter secure reading');
      if(t.indexOf('yours, and yours alone')>=0)replaceListCopy(li,'Access checked before every protected chapter');
    });
    if(!card.querySelector('.reader-existing-access')){
      var link=document.createElement('a');
      link.className='text-link reader-existing-access';
      link.href='reader.html';
      link.textContent='Already have access? Open reader';
      card.appendChild(link);
    }
  }

  function replaceListCopy(li,text){
    var svg=li.querySelector('svg');
    while(li.firstChild)li.removeChild(li.firstChild);
    if(svg)li.appendChild(svg);
    li.appendChild(document.createTextNode(text));
  }

  initCheckout();
  initNav();
  initOffline();
  initReveal();
  alignReaderCopy();
})();
