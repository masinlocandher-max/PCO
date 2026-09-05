(function(){
  'use strict';

  var main=document.getElementById('readerMain');
  var sidebar=document.getElementById('readerSidebar');
  var tocToggle=document.getElementById('mobileTocToggle');
  var shield=document.getElementById('privacyShield');
  var watermark=document.getElementById('readerWatermark');
  var toast=document.getElementById('readerToast');
  var status=document.getElementById('readerStatus');
  var entitlementEndpoint=window.FMB_BOOK_ENTITLEMENT_ENDPOINT||'';
  var toastTimer=null;

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(function(){toast.classList.remove('is-visible');},2400);
  }

  function buildWatermark(label){
    if(!watermark)return;
    watermark.innerHTML='';
    var rows=6,cols=5;
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        var span=document.createElement('span');
        span.textContent=label;
        span.style.left=(c*25-10)+'%';
        span.style.top=(r*20-4)+'%';
        watermark.appendChild(span);
      }
    }
  }

  buildWatermark('FMB PERSONAL READER • PREVIEW');

  function showShield(){if(shield)shield.classList.add('is-visible');}
  function hideShield(){if(shield)shield.classList.remove('is-visible');}

  document.addEventListener('visibilitychange',function(){
    if(document.hidden)showShield();
    else window.setTimeout(hideShield,180);
  });
  window.addEventListener('blur',showShield);
  window.addEventListener('focus',function(){window.setTimeout(hideShield,180);});

  /* Browser-level deterrents. These reduce casual copying and printing but do
     not claim to block OS screenshots, screen recording or camera capture. */
  ['contextmenu','copy','cut','dragstart'].forEach(function(type){
    document.addEventListener(type,function(event){
      if(!main||!main.contains(event.target))return;
      event.preventDefault();
      showToast('This reader is for personal reading. Copying and exporting are disabled.');
    });
  });

  document.addEventListener('selectstart',function(event){
    if(main&&main.contains(event.target))event.preventDefault();
  });

  document.addEventListener('keydown',function(event){
    var key=(event.key||'').toLowerCase();
    var mod=event.ctrlKey||event.metaKey;
    if(mod&&['c','x','s','p','u','a'].indexOf(key)!==-1){
      event.preventDefault();
      showToast('Copy, save, print and source shortcuts are disabled in the protected reader.');
    }
    if(event.key==='PrintScreen'){
      showShield();
      window.setTimeout(hideShield,1200);
      showToast('Screen capture cannot be guaranteed by a website. Purchaser watermarking remains active.');
    }
    if(event.key==='Escape'&&sidebar)sidebar.classList.remove('is-open');
  });

  window.addEventListener('beforeprint',function(){
    showShield();
    showToast('Printing is disabled for this reader.');
  });
  window.addEventListener('afterprint',hideShield);

  if(tocToggle&&sidebar){
    tocToggle.addEventListener('click',function(){sidebar.classList.toggle('is-open');});
  }

  var lockedButtons=Array.prototype.slice.call(document.querySelectorAll('.toc-button[aria-disabled="true"]'));
  lockedButtons.forEach(function(button){
    button.addEventListener('click',function(){
      showToast('This chapter is available after verified purchase. Reader access is ₱999.');
      if(window.innerWidth<=760&&sidebar)sidebar.classList.remove('is-open');
    });
  });

  var previewButton=document.querySelector('[data-preview-chapter="7"]');
  if(previewButton){
    previewButton.addEventListener('click',function(){
      if(main)main.scrollTo({top:0,behavior:'smooth'});
      if(window.innerWidth<=760&&sidebar)sidebar.classList.remove('is-open');
    });
  }

  /*
    Secure entitlement integration point.

    Do NOT unlock the full book from localStorage, query parameters or a static
    access code: all of those can be forged on a public GitHub Pages site.
    When a backend is connected, it should authenticate the purchaser, verify
    payment server-side and return an entitlement response. Full chapter text
    should then be fetched only from an authenticated endpoint, never from the
    public repository.
  */
  function checkEntitlement(){
    if(!entitlementEndpoint)return;
    fetch(entitlementEndpoint,{credentials:'include',headers:{'Accept':'application/json'}})
      .then(function(response){
        if(!response.ok)throw new Error('Not entitled');
        return response.json();
      })
      .then(function(data){
        if(!data||data.authorized!==true)return;
        if(status)status.textContent='Verified access';
        var label=data.watermarkLabel||data.displayName||'FMB VERIFIED READER';
        buildWatermark(String(label).toUpperCase()+' • PERSONAL COPY');
        document.documentElement.dataset.entitled='true';
        /* Full content deliberately remains server-owned. A future entitlement
           response may provide a short-lived content endpoint, which should be
           fetched here and rendered into the reader. */
      })
      .catch(function(){
        if(status)status.textContent='Locked reader';
      });
  }

  checkEntitlement();
})();
