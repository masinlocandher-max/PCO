(function(){
  'use strict';
  function inject(){
    document.querySelectorAll('#bookSecureOrder').forEach(function(form){
      if(form.querySelector('.book-order-legal'))return;
      var p=document.createElement('p');
      p.className='book-order-legal';
      p.innerHTML='By placing this order, you agree to the <a href="/terms/" target="_blank" rel="noopener">Terms of Sale</a> and applicable <a href="/refunds/" target="_blank" rel="noopener">Refund Policy</a>, <a href="/ebook-access/" target="_blank" rel="noopener">Ebook Access Policy</a> or <a href="/shipping/" target="_blank" rel="noopener">Shipping Policy</a>. See our <a href="/privacy/" target="_blank" rel="noopener">Privacy Notice</a>.';
      var actions=form.querySelector('.book-order-actions');
      if(actions)form.insertBefore(p,actions);else form.appendChild(p);
    });
  }
  inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
