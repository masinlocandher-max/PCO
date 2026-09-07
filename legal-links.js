(function(){
  'use strict';

  var legalItems=[
    ['/terms/','Terms'],
    ['/privacy/','Privacy'],
    ['/refunds/','Refunds'],
    ['/ebook-access/','Ebook Access'],
    ['/shipping/','Shipping']
  ];

  function suppressBookOrderOverlay(){
    if(!document.body||!document.body.classList.contains('book-campaign'))return;

    if(!document.getElementById('bookOrderOverlayDisabled')){
      var style=document.createElement('style');
      style.id='bookOrderOverlayDisabled';
      style.textContent='#bookOrderModal{display:none!important}';
      document.head.appendChild(style);
    }

    if(!document.documentElement.hasAttribute('data-book-order-overlay-disabled')){
      document.documentElement.setAttribute('data-book-order-overlay-disabled','');
      document.addEventListener('click',function(e){
        var link=e.target&&e.target.closest?e.target.closest('a[data-edition]'):null;
        if(!link)return;
        e.stopImmediatePropagation();
      },true);
    }

    var modal=document.getElementById('bookOrderModal');
    if(!modal)return;

    function neutralize(){
      if(modal.hasAttribute('data-open'))modal.removeAttribute('data-open');
      modal.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
    }

    neutralize();
    if(!modal.__suppressedWatcher){
      modal.__suppressedWatcher=new MutationObserver(function(){
        if(modal.hasAttribute('data-open')||modal.getAttribute('aria-hidden')!=='true')neutralize();
      });
      modal.__suppressedWatcher.observe(modal,{attributes:true,attributeFilter:['data-open','aria-hidden']});
    }
  }

  function ensureStyles(){
    if(document.getElementById('bookLegalNavStyles'))return;
    var style=document.createElement('style');
    style.id='bookLegalNavStyles';
    style.textContent='.footer-legal-nav{display:flex;align-items:center;justify-content:center;gap:8px 18px;flex-wrap:wrap;width:min(100%,1400px);margin:0 auto;padding:13px 0 2px;border-top:1px solid rgba(111,77,31,.14);color:#6f6254}.footer-legal-nav a{font:600 10.5px/1.2 "DM Sans",Arial,sans-serif;letter-spacing:.02em;text-decoration:none;white-space:nowrap}.footer-legal-nav a:hover{text-decoration:underline;text-underline-offset:4px}@media(max-width:980px){.footer-legal-nav{justify-content:flex-start;gap:7px 14px;padding:12px 0 1px}.footer-legal-nav a{font-size:10px}.campaign-footer .footer-top nav a[href="/terms/"],.campaign-footer .footer-top nav a[href="/privacy/"],.campaign-footer .footer-top nav a[href="/refunds/"],.campaign-footer .footer-top nav a[href="/ebook-access/"],.campaign-footer .footer-top nav a[href="/shipping/"]{display:none!important}}@media(max-width:560px){.footer-legal-nav{display:grid;grid-template-columns:repeat(3,max-content);justify-content:start;column-gap:16px;row-gap:9px;padding-top:12px}.footer-legal-nav a{font-size:9.8px}}';
    document.head.appendChild(style);
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
    legalItems.forEach(function(item){
      var a=document.createElement('a');
      a.href=item[0];
      a.textContent=item[1];
      nav.appendChild(a);
    });
    var meta=footer.querySelector('.footer-meta');
    if(meta)meta.insertAdjacentElement('afterend',nav);else footer.appendChild(nav);
  }

  suppressBookOrderOverlay();
  ensureStyles();
  injectFooterNav();
})();
