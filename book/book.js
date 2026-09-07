(function(){
  'use strict';

  /*
    Commerce hook.
    When a hosted checkout is ready, define window.FMB_BOOK_CHECKOUT_URL before
    this file loads. Until then the final purchase CTA uses the explicit email
    purchase request and access is issued only after payment verification.
  */
  function initCheckout(){
    var checkoutUrl=window.FMB_BOOK_CHECKOUT_URL||'';
    if(!checkoutUrl)return;

    ['buyHero','purchaseButton'].forEach(function(id){
      var link=document.getElementById(id);
      if(!link)return;
      link.href=checkoutUrl;
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

  initCheckout();
  initNav();
})();
