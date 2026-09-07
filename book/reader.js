(function(){
  'use strict';

  var doc=document.documentElement;
  var bar=document.getElementById('readerBar');
  var main=document.getElementById('readerMain');
  var progress=document.getElementById('progressBar');
  var toast=document.getElementById('readerToast');
  var watermark=document.getElementById('readerWatermark');
  var shield=document.getElementById('privacyShield');
  var offlineFlag=document.getElementById('offlineFlag');
  var STORE='trwtl.reading';
  var toastTimer=null;

  /* Reading preferences only. Nothing here grants access to anything. */
  function load(){
    try{return JSON.parse(localStorage.getItem(STORE))||{};}catch(e){return {};}
  }
  function save(prefs){
    try{localStorage.setItem(STORE,JSON.stringify(prefs));}catch(e){}
  }
  var prefs=load();

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(function(){toast.classList.remove('is-visible');},3200);
  }

  /* ── Reading preferences ─────────────────────────────────────────── */
  function applyStep(step){
    doc.style.setProperty('--step',step);
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(chip){
      chip.setAttribute('aria-pressed',String(Number(chip.dataset.step)===Number(step)));
    });
  }
  function applyTheme(theme){
    if(theme)doc.setAttribute('data-theme',theme);
    else doc.removeAttribute('data-theme');
    // With no choice saved the page follows the device. Show which one is
    // actually in effect, so the reader never sees three unselected options.
    var effective=theme||(window.matchMedia('(prefers-color-scheme: dark)').matches?'night':'day');
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'),function(chip){
      chip.setAttribute('aria-pressed',String(chip.dataset.themeChoice===effective));
    });
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='night'?'#14110e':theme==='sepia'?'#f4e8d2':'#fbf6ec');
  }
  applyStep(prefs.step||1);
  applyTheme(prefs.theme||'');

  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(chip){
    chip.addEventListener('click',function(){
      prefs.step=Number(chip.dataset.step); save(prefs); applyStep(prefs.step);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'),function(chip){
    chip.addEventListener('click',function(){
      prefs.theme=chip.dataset.themeChoice; save(prefs); applyTheme(prefs.theme);
    });
  });

  /* ── Panels ──────────────────────────────────────────────────────── */
  function openPanel(panel,trigger){
    panel.setAttribute('data-open','');
    panel.setAttribute('aria-hidden','false');
    if(trigger)trigger.setAttribute('aria-expanded','true');
    panel.__trigger=trigger||null;
  }
  function closePanel(panel){
    panel.removeAttribute('data-open');
    panel.setAttribute('aria-hidden','true');
    if(panel.__trigger){panel.__trigger.setAttribute('aria-expanded','false');panel.__trigger.focus();}
  }
  function wirePanel(btnId,panelId){
    var btn=document.getElementById(btnId),panel=document.getElementById(panelId);
    if(!btn||!panel)return;
    btn.addEventListener('click',function(){
      if(panel.hasAttribute('data-open'))closePanel(panel);
      else openPanel(panel,btn);
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-close-panel]'),function(close){
      close.addEventListener('click',function(){closePanel(panel);});
    });
  }
  wirePanel('tocBtn','tocPanel');
  wirePanel('prefsBtn','prefsPanel');

  document.addEventListener('keydown',function(event){
    if(event.key!=='Escape')return;
    Array.prototype.forEach.call(document.querySelectorAll('.panel[data-open]'),closePanel);
  });

  /* Chapters that are not open yet. The wording matters: the reader has done
     nothing wrong, and the preview is genuinely theirs to keep reading. */
  Array.prototype.forEach.call(document.querySelectorAll('.toc-item[data-locked]'),function(button){
    button.addEventListener('click',function(){
      showToast('This chapter opens once your copy is activated. The preview stays yours to read.');
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.toc-item[data-preview-chapter]'),function(button){
    button.addEventListener('click',function(){
      closePanel(document.getElementById('tocPanel'));
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });

  /* ── Progress, immersive chrome, and place in the book ───────────── */
  var lastY=window.scrollY;
  function onScroll(){
    var height=document.documentElement.scrollHeight-window.innerHeight;
    var ratio=height>0?Math.min(1,Math.max(0,window.scrollY/height)):0;
    if(progress)progress.style.width=(ratio*100).toFixed(2)+'%';

    // Chrome retreats while reading forward, returns the moment you look up.
    var y=window.scrollY;
    if(y>140&&y>lastY+6)document.body.classList.add('is-immersive');
    else if(y<lastY-6||y<=140)document.body.classList.remove('is-immersive');
    lastY=y;

    prefs.at=Math.round(window.scrollY);
    save(prefs);
  }
  var ticking=false;
  window.addEventListener('scroll',function(){
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(function(){onScroll();ticking=false;});
  },{passive:true});

  // Return the reader to where they stopped.
  if(prefs.at>200){
    window.setTimeout(function(){
      window.scrollTo(0,prefs.at);
      showToast('Picking up where you left off.');
    },220);
  }
  onScroll();

  /* ── Offline and installing ──────────────────────────────────────── */
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('sw.js')['catch'](function(){
        var note=document.getElementById('offlineNote');
        if(note)note.textContent='This device could not save the book for offline reading. Reading online still works normally.';
      });
    });
  }

  function reflectConnection(){
    if(!offlineFlag)return;
    if(navigator.onLine)offlineFlag.removeAttribute('data-show');
    else offlineFlag.setAttribute('data-show','');
  }
  window.addEventListener('online',reflectConnection);
  window.addEventListener('offline',reflectConnection);
  reflectConnection();

  var invite=document.getElementById('installInvite');
  var installBtn=document.getElementById('installBtn');
  var dismissBtn=document.getElementById('installDismiss');
  var deferred=null;
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  window.addEventListener('beforeinstallprompt',function(event){
    event.preventDefault();
    deferred=event;
    if(!standalone&&!prefs.installDismissed&&invite)invite.setAttribute('data-show','');
  });
  if(installBtn){
    installBtn.addEventListener('click',function(){
      if(!deferred)return;
      deferred.prompt();
      deferred.userChoice.then(function(){
        deferred=null;
        if(invite)invite.removeAttribute('data-show');
      });
    });
  }
  if(dismissBtn){
    dismissBtn.addEventListener('click',function(){
      prefs.installDismissed=true; save(prefs);
      if(invite)invite.removeAttribute('data-show');
    });
  }
  // iOS gives no install event, so say how, once, and only where it applies.
  var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isIOS&&!standalone&&!prefs.installDismissed&&invite){
    var note=invite.querySelector('p');
    if(note)note.innerHTML='<strong>Keep it on your home screen</strong>Tap Share, then “Add to Home Screen”, and the book opens like an app.';
    if(installBtn)installBtn.hidden=true;
    invite.setAttribute('data-show','');
  }

  /* ── Reading protections ─────────────────────────────────────────── */
  function buildWatermark(label){
    if(!watermark)return;
    watermark.innerHTML='';
    for(var i=0;i<80;i++){
      var span=document.createElement('span');
      span.textContent=label;
      watermark.appendChild(span);
    }
  }
  function showShield(){if(shield)shield.classList.add('is-visible');}
  function hideShield(){if(shield)shield.classList.remove('is-visible');}

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')showShield(); else hideShield();
  });
  window.addEventListener('blur',showShield);
  window.addEventListener('focus',function(){window.setTimeout(hideShield,180);});
  window.addEventListener('beforeprint',showShield);
  window.addEventListener('afterprint',hideShield);

  ['contextmenu','copy','cut','dragstart'].forEach(function(type){
    document.addEventListener(type,function(event){
      event.preventDefault();
      if(type==='copy')showToast('This copy is registered to you, so the text cannot be copied out.');
    });
  });

  /*
    Access.

    Deliberately unchanged: access is never granted from localStorage, a query
    parameter or a static code. All three can be forged on a public GitHub Pages
    site, so any of them would hand the book away. The reader asks the server
    every time, and the server is the only thing that can say yes.

    Set window.FMB_ENTITLEMENT_ENDPOINT before this file loads once a backend
    exists. Until then the book stays in preview, which is the honest state.
  */
  var entitlementEndpoint=window.FMB_ENTITLEMENT_ENDPOINT||'';

  function checkEntitlement(){
    if(!entitlementEndpoint)return;
    fetch(entitlementEndpoint,{credentials:'include',headers:{'Accept':'application/json'}})
      .then(function(response){
        if(!response.ok)throw new Error('Not entitled');
        return response.json();
      })
      .then(function(data){
        if(!data||data.authorized!==true)return;
        var label=data.watermarkLabel||data.displayName||'FMB READER';
        buildWatermark(String(label).toUpperCase()+' · PERSONAL COPY');
        doc.dataset.entitled='true';
        /* Chapter text stays server-owned. When the entitlement response carries
           a short-lived content endpoint, fetch and render it here. It must not
           be written into Cache Storage: see the note at the top of sw.js. */
      })['catch'](function(){});
  }
  checkEntitlement();
})();
