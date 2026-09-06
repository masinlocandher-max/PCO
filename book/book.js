(function(){
  'use strict';

  /*
    Commerce hook.
    When a hosted checkout is ready, define window.FMB_BOOK_CHECKOUT_URL before
    this file loads. Until then the final purchase CTA uses the explicit email
    purchase request and access is issued only after payment verification.
  */
  var checkoutUrl=window.FMB_BOOK_CHECKOUT_URL||'';
  if(!checkoutUrl)return;

  ['buyHero','purchaseButton'].forEach(function(id){
    var link=document.getElementById(id);
    if(!link)return;
    link.href=checkoutUrl;
    link.target='_blank';
    link.rel='noopener';
  });
})();
