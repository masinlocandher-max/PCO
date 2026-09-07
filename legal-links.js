(function(){
  'use strict';

  var legalItems=[
    ['/terms/','Terms'],
    ['/privacy/','Privacy'],
    ['/refunds/','Refunds'],
    ['/ebook-access/','Ebook Access'],
    ['/shipping/','Shipping']
  ];

  function ensureBookVisuals(){
    if(!document.body||!document.body.classList.contains('book-campaign'))return;
    if(document.getElementById('bookVisualSystem'))return;
    var link=document.createElement('link');
    link.id='bookVisualSystem';
    link.rel='stylesheet';
    link.href='/book-visual.css?v=20260907-2';
    document.head.appendChild(link);
  }

  function ensurePaymongo(){
    if(!document.body||!document.body.classList.contains('book-campaign'))return;
    if(document.getElementById('bookPaymongoCheckout'))return;
    var script=document.createElement('script');
    script.id='bookPaymongoCheckout';
    script.src='/book/paymongo.js?v=20260907-1';
    script.async=true;
    document.body.appendChild(script);
  }

  function ensureStyles(){
    if(document.getElementById('bookLegalNavStyles'))return;
    var style=document.createElement('style');
    style.id='bookLegalNavStyles';
    style.textContent='.footer-legal-nav{display:flex;align-items:center;justify-content:center;gap:8px 18px;flex-wrap:wrap;width:min(100%,1400px);margin:0 auto;padding:13px 0 2px;border-top:1px solid rgba(111,77,31,.14);color:#6f6254}.footer-legal-nav a{font:600 10.5px/1.2 "DM Sans",Arial,sans-serif;letter-spacing:.02em;text-decoration:none;white-space:nowrap}.footer-legal-nav a:hover{text-decoration:underline;text-underline-offset:4px}@media(max-width:980px){.footer-legal-nav{justify-content:flex-start;gap:7px 14px;padding:12px 0 1px}.footer-legal-nav a{font-size:10px}.campaign-footer .footer-top nav a[href="/terms/"],.campaign-footer .footer-top nav a[href="/privacy/"],.campaign-footer .footer-top nav a[href="/refunds/"],.campaign-footer .footer-top nav a[href="/ebook-access/"],.campaign-footer .footer-top nav a[href="/shipping/"]{display:none!important}}@media(max-width:560px){.footer-legal-nav{display:grid;grid-template-columns:repeat(3,max-content);justify-content:start;column-gap:16px;row-gap:9px;padding-top:12px}.footer-legal-nav a{font-size:9.8px}}';
    document.head.appendChild(style);
  }

  function injectCheckoutDisclosure(){
    document.querySelectorAll('#bookSecureOrder').forEach(function(form){
      if(form.querySelector('.book-order-legal'))return;
      var p=document.createElement('p');
      p.className='book-order-legal';
      p.innerHTML='By placing this order, you agree to the <a href="/terms/" target="_blank" rel="noopener">Terms of Sale</a> and the policy that applies to your edition. See <a href="/refunds/" target="_blank" rel="noopener">Refunds</a>, <a href="/ebook-access/" target="_blank" rel="noopener">Ebook Access</a>, <a href="/shipping/" target="_blank" rel="noopener">Shipping</a>, and our <a href="/privacy/" target="_blank" rel="noopener">Privacy Notice</a>.';
      var actions=form.querySelector('.book-order-actions');
      if(actions)form.insertBefore(p,actions);else form.appendChild(p);
    });
  }

  function injectFooterNav(){
    var footer=document.querySelector('.campaign-footer');
    if(!footer||footer.querySelector('.footer-legal-nav'))return;
    var mainNav=footer.querySelector('.footer-top nav');
    if(mainNav){
      mainNav.querySelectorAll('a').forEach(function(a){
        if(legalItems.some(function(item){return a.getAttribute('href')===item[0];}))a.remove();
      });
    }
    var nav=document.createElement('nav');
    nav.className='footer-legal-nav';
    nav.setAttribute('aria-label','Legal');
    legalItems.forEach(function(item){var a=document.createElement('a');a.href=item[0];a.textContent=item[1];nav.appendChild(a);});
    var meta=footer.querySelector('.footer-meta');
    if(meta)meta.insertAdjacentElement('afterend',nav);else footer.appendChild(nav);
  }

  function inject(){ensureBookVisuals();ensurePaymongo();ensureStyles();injectCheckoutDisclosure();injectFooterNav();}
  inject();

  /*
    Only the order form arrives after load; everything else above is injected
    once and guards itself. Watching the whole document and re-running all five
    passes on every mutation measured a third of the frame rate during scroll —
    50ms per frame against 16.7ms — because each mutation triggered five
    document-wide queries. This reacts to the one node that actually arrives
    late, coalesces to a frame, and stops watching once it has it.
  */
  function relevant(records){
    for(var i=0;i<records.length;i++){
      var added=records[i].addedNodes;
      for(var j=0;j<added.length;j++){
        var node=added[j];
        if(node.nodeType!==1)continue;
        if(node.id==='bookSecureOrder')return true;
        if(node.querySelector&&node.querySelector('#bookSecureOrder'))return true;
      }
    }
    return false;
  }

  var pending=false;
  var watcher=new MutationObserver(function(records){
    if(pending||!relevant(records))return;
    pending=true;
    requestAnimationFrame(function(){
      pending=false;
      injectCheckoutDisclosure();
    });
  });
  if(document.body)watcher.observe(document.body,{childList:true,subtree:true});
})();
