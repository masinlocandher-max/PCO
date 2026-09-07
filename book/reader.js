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

    Deliberately unchanged in principle: the browser never decides whether the
    book is unlocked. It asks Supabase for chapters and renders whatever comes
    back. Row level security answers one chapter for a visitor and all of them
    for a buyer, so there is no check here to forge — the old warning about
    localStorage, query parameters and static codes still holds, and this is
    how it is honoured.

    Configure before this file loads:

      window.FMB_SUPABASE = {
        url: 'https://<ref>.supabase.co',
        anonKey: '<anon key>',
        getAccessToken: function(){ return session token or ''; }
      };

    The anon key belongs in the bundle. The service_role key never does — it
    bypasses row level security, and the build gate rejects it.
    See .github/supabase-contract.md for the schema and policies.
  */
  var supa=window.FMB_SUPABASE||null;
  var CHAPTER_STORE='trwtl.chapters';

  function accessToken(){
    if(!supa)return '';
    if(typeof supa.getAccessToken==='function'){
      try{return supa.getAccessToken()||'';}catch(e){return '';}
    }
    return supa.accessToken||'';
  }

  function renderChapters(rows){
    if(!rows||!rows.length)return false;
    // A visitor gets the single preview row, which the page already shows.
    if(rows.length<2)return false;

    var doc=document.getElementById('readerDoc');
    if(!doc)return false;
    var preview=document.querySelector('.preview-end');
    if(preview)preview.remove();

    var frag=document.createDocumentFragment();
    rows.forEach(function(row,index){
      var meta=document.createElement('span');
      meta.className='chapter-meta';
      meta.textContent=(row.part?row.part+' \u00b7 ':'')+'Chapter '+String(row.number).padStart(2,'0');

      var head=document.createElement('h1');
      head.textContent=row.title;

      var rule=document.createElement('span');
      rule.className='chapter-rule';
      rule.setAttribute('aria-hidden','true');

      var prose=document.createElement('div');
      prose.className='reader-prose';
      String(row.body).split(/\n{2,}/).forEach(function(para){
        if(!para.trim())return;
        var p=document.createElement('p');
        p.textContent=para.trim();
        prose.appendChild(p);
      });

      if(index)frag.appendChild(document.createElement('hr'));
      frag.appendChild(meta); frag.appendChild(head);
      frag.appendChild(rule); frag.appendChild(prose);
    });
    doc.innerHTML='';
    doc.appendChild(frag);
    doc.dataset.chapters=String(rows.length);
    doc.dataset.entitled='true';
    return true;
  }

  function unlockContents(rows){
    var byNumber={};
    rows.forEach(function(r){byNumber[Number(r.number)]=true;});
    Array.prototype.forEach.call(document.querySelectorAll('.toc-item'),function(item){
      var n=Number((item.querySelector('b')||{}).textContent);
      if(!byNumber[n])return;
      item.removeAttribute('data-locked');
      var svg=item.querySelector('svg'); if(svg)svg.remove();
      var note=item.querySelector('.sr-only'); if(note)note.remove();
    });
  }

  /*
    A copy held on this device, so a bought book survives a lost signal and an
    app restart. This is the honest half of "read offline": text that survives
    a flight is text on the device, and a paying reader holding a local copy is
    what an ebook is.

    It is kept out of the service worker caches on purpose. A deliberate,
    visible download the reader can remove is a different thing from text
    written to disk as a side effect of loading a page.
  */
  function keepLocally(rows){
    try{localStorage.setItem(CHAPTER_STORE,JSON.stringify(rows));return true;}
    catch(e){return false;}
  }
  function heldLocally(){
    try{return JSON.parse(localStorage.getItem(CHAPTER_STORE));}catch(e){return null;}
  }
  function removeLocalCopy(){
    try{localStorage.removeItem(CHAPTER_STORE);}catch(e){}
    if('serviceWorker' in navigator&&navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({type:'clear-cache'});
    }
  }

  /* Tell the reader plainly what is on their device, and let them undo it. */
  function describeLocalCopy(){
    var note=document.getElementById('offlineNote');
    var action=document.getElementById('removeCopy');
    if(!note||!action)return;
    var held=heldLocally();
    if(held&&held.length){
      note.textContent='Your book is saved on this device, so you can read it '
        +'with no signal. It stays only here.';
      action.hidden=false;
    }else{
      note.textContent='The app is saved to this device so it opens without a '
        +'signal. Your chapters are saved here once your copy is activated.';
      action.hidden=true;
    }
  }

  function loadChapters(){
    if(!supa||!supa.url||!supa.anonKey){
      var held=heldLocally();
      if(held&&renderChapters(held))unlockContents(held);
      describeLocalCopy();
      return;
    }
    var token=accessToken()||supa.anonKey;
    fetch(supa.url.replace(/\/$/,'')+'/rest/v1/chapters?select=number,part,title,body&order=number.asc',{
      headers:{apikey:supa.anonKey,Authorization:'Bearer '+token,Accept:'application/json'}
    })
      .then(function(response){
        if(!response.ok)throw new Error('chapters unavailable');
        return response.json();
      })
      .then(function(rows){
        if(!renderChapters(rows))return;
        unlockContents(rows);
        keepLocally(rows);
        describeLocalCopy();
        buildWatermark((supa.readerLabel||'PERSONAL COPY').toUpperCase());
      })['catch'](function(){
        // Offline, or the request failed: fall back to the copy on this device.
        var held=heldLocally();
        if(held&&renderChapters(held))unlockContents(held);
        describeLocalCopy();
      });
  }

  var removeBtn=document.getElementById('removeCopy');
  if(removeBtn){
    removeBtn.addEventListener('click',function(){
      removeLocalCopy();
      describeLocalCopy();
      showToast('The copy on this device has been removed. Your access is unchanged.');
    });
  }

  loadChapters();
  describeLocalCopy();
})();
