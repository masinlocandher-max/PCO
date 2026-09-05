(function(){
  'use strict';

  /*
    Commerce hook.
    When a hosted checkout is ready, define window.FMB_BOOK_CHECKOUT_URL before
    this file loads and both purchase CTAs can be pointed to the verified flow.
    Until then the purchase card uses the explicit email purchase request.
  */
  var checkoutUrl=window.FMB_BOOK_CHECKOUT_URL||'';
  var purchase=document.getElementById('purchaseButton');
  var hero=document.getElementById('buyHero');

  if(checkoutUrl){
    [purchase,hero].forEach(function(link){
      if(!link)return;
      link.href=checkoutUrl;
      link.target='_blank';
      link.rel='noopener';
    });
  }
})();
