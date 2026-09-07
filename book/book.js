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
    Motion.

    One rAF per scroll, all reads batched before all writes, and nothing
    animated except transform and opacity — those are the only two properties
    the compositor can handle without touching layout or paint. Expensive is
    not more movement; it is movement that never stutters.

    JavaScript writes a single number per element, --p, roughly -1 to 1 for how
    far past the viewport centre it sits. CSS decides what to do with it, so the
    choreography lives with the design rather than in here.

    Everything degrades to a still page: elements are only hidden once script
    confirms it can reveal them, and prefers-reduced-motion opts out entirely.
  */
  function initMotion(){
    var body=document.body;
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');

    // The opening sequence. Marked on the next frame so the first paint is the
    // page at rest, never a flash of the finished state.
    requestAnimationFrame(function(){body.setAttribute('data-ready','');});

    // The bar earns a background only once it is over content.
    var bar=document.getElementById('bookNav');
    if(bar){
      var lastState=null;
      var markBar=function(){
        var over=window.scrollY>24;
        if(over===lastState)return;
        lastState=over;
        bar.toggleAttribute('data-over',over);
      };
      window.addEventListener('scroll',markBar,{passive:true});
      markBar();
    }

    if(reduce.matches||!('IntersectionObserver' in window))return;

    // ---- reveals: one shot, staggered by CSS ----
    var reveals=document.querySelectorAll('[data-motion]');
    if(reveals.length){
      Array.prototype.forEach.call(reveals,function(el){el.setAttribute('data-motion-state','wait');});
      var revealer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting)return;
          entry.target.setAttribute('data-motion-state','in');
          revealer.unobserve(entry.target);
        });
      },{rootMargin:'0px 0px -10% 0px',threshold:.12});
      Array.prototype.forEach.call(reveals,function(el){revealer.observe(el);});
    }

    // ---- continuous parallax ----
    var tracked=document.querySelectorAll('[data-parallax]');
    if(!tracked.length)return;
    var live=[];

    // Only elements near the viewport are measured, so the cost per frame stays
    // flat however long the page grows.
    var watcher=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var el=entry.target;
        var at=live.indexOf(el);
        if(entry.isIntersecting&&at===-1)live.push(el);
        else if(!entry.isIntersecting&&at!==-1)live.splice(at,1);
      });
      schedule();
    },{rootMargin:'25% 0px'});
    Array.prototype.forEach.call(tracked,function(el){watcher.observe(el);});

    var queued=false;
    function frame(){
      queued=false;
      var height=window.innerHeight||1;
      var middle=height/2;
      var i,box,measured=[];
      for(i=0;i<live.length;i++){                    // read
        box=live[i].getBoundingClientRect();
        measured.push((box.top+box.height/2-middle)/height);
      }
      for(i=0;i<live.length;i++){                    // write
        live[i].style.setProperty('--p',measured[i].toFixed(4));
      }
    }
    function schedule(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(frame);
    }

    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    schedule();
  }

  initCheckout();
  initNav();
  initOffline();
  initMotion();
})();
