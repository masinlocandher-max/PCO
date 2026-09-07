(function(){
  'use strict';

  /*
    Commerce hook.
    Orders are placed by email until a hosted checkout exists. To switch an
    edition over, define window.FMB_BOOK_CHECKOUT before this file loads:

      window.FMB_BOOK_CHECKOUT = {
        ebook:      'https://checkout.example/ebook',
        pocketbook: 'https://checkout.example/pocketbook'
      };

    Editions are upgraded independently, so print can stay on email order while
    the ebook goes live, or the reverse. Anything not configured keeps its
    mailto link — a buyer is never shown a checkout that cannot take payment.
  */
  function initCheckout(){
    var config=window.FMB_BOOK_CHECKOUT;

    // Back-compatible with the earlier single-product hook.
    if(!config&&window.FMB_BOOK_CHECKOUT_URL){
      config={ebook:window.FMB_BOOK_CHECKOUT_URL};
    }
    if(!config)return;

    var buttons=document.querySelectorAll('[data-edition]');
    Array.prototype.forEach.call(buttons,function(link){
      var url=config[link.getAttribute('data-edition')];
      if(!url)return;
      link.href=url;
      link.target='_blank';
      link.rel='noopener';
    });
  }

  /*
    Small-screen navigation.
    The links collapse into a panel below the bar. The panel is closed with
    visibility:hidden so it stays out of the accessibility tree, and the desktop
    layout is untouched: above the breakpoint the toggle is display:none and the
    open state is meaningless.
  */
  function initNav(){
    var bar=document.getElementById('bookNav');
    var toggle=document.getElementById('navToggle');
    var panel=document.getElementById('bookNavLinks');
    if(!bar||!toggle||!panel)return;

    var desktop=window.matchMedia('(min-width:861px)');

    function isOpen(){return bar.hasAttribute('data-nav-open');}

    function setOpen(open){
      if(open)bar.setAttribute('data-nav-open','');
      else bar.removeAttribute('data-nav-open');
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    }

    toggle.addEventListener('click',function(event){
      event.stopPropagation();
      setOpen(!isOpen());
    });

    // Choosing a destination closes the panel.
    panel.addEventListener('click',function(event){
      if(event.target.closest('a'))setOpen(false);
    });

    document.addEventListener('click',function(event){
      if(isOpen()&&!bar.contains(event.target))setOpen(false);
    });

    document.addEventListener('keydown',function(event){
      if(event.key!=='Escape'||!isOpen())return;
      setOpen(false);
      toggle.focus();
    });

    // Never leave the open state behind when the desktop bar comes back.
    function syncDesktop(){if(desktop.matches)setOpen(false);}
    if(desktop.addEventListener)desktop.addEventListener('change',syncDesktop);
    else if(desktop.addListener)desktop.addListener(syncDesktop);
    syncDesktop();
  }

  /* Cache the shell so the book opens with no signal, and so "add to home
     screen" is offered from the page people actually land on. */
  function initOffline(){
    if(!('serviceWorker' in navigator))return;
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('sw.js')['catch'](function(){});
    });
  }

  /*
    The quote journey arrives a passage at a time. Nothing is hidden without
    JavaScript — the reveal class is added by script, so with JS off every
    passage is simply visible, and prefers-reduced-motion skips it entirely.
  */
  function initReveal(){
    var passages=document.querySelectorAll('.passage');
    if(!passages.length)return;
    if(!('IntersectionObserver' in window))return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

    Array.prototype.forEach.call(passages,function(el){el.setAttribute('data-reveal','');});
    var watcher=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        entry.target.setAttribute('data-reveal','in');
        watcher.unobserve(entry.target);
      });
    },{rootMargin:'0px 0px -12% 0px',threshold:.15});
    Array.prototype.forEach.call(passages,function(el){watcher.observe(el);});
  }

  initCheckout();
  initNav();
  initOffline();
  initReveal();
})();
