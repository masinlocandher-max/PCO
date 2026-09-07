(function(){
  'use strict';

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var BOOK_API=SUPABASE_URL+'/functions/v1/book-api';
  var AUTH_STORE='trwtl.auth';
  var PREF_STORE='trwtl.reading';
  var doc=document.documentElement;
  var readerDoc=document.getElementById('readerDoc');
  var progress=document.getElementById('progressBar');
  var toast=document.getElementById('readerToast');
  var watermark=document.getElementById('readerWatermark');
  var shield=document.getElementById('privacyShield');
  var offlineFlag=document.getElementById('offlineFlag');
  var toastTimer=null;
  var manifest=[];
  var entitled=false;
  var activeSequence=null;

  function readJson(key){try{return JSON.parse(localStorage.getItem(key))||null;}catch(e){return null;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function removeKey(key){try{localStorage.removeItem(key);}catch(e){}}
  var prefs=readJson(PREF_STORE)||{};

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){toast.classList.remove('is-visible');},3400);
  }

  function applyStep(step){
    doc.style.setProperty('--step',step);
    document.querySelectorAll('[data-step]').forEach(function(chip){chip.setAttribute('aria-pressed',String(Number(chip.dataset.step)===Number(step)));});
  }
  function applyTheme(theme){
    if(theme)doc.setAttribute('data-theme',theme); else doc.removeAttribute('data-theme');
    var effective=theme||(matchMedia('(prefers-color-scheme: dark)').matches?'night':'day');
    document.querySelectorAll('[data-theme-choice]').forEach(function(chip){chip.setAttribute('aria-pressed',String(chip.dataset.themeChoice===effective));});
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='night'?'#14110e':theme==='sepia'?'#f4e8d2':'#fbf6ec');
  }
  applyStep(prefs.step||1);
  applyTheme(prefs.theme||'');
  document.querySelectorAll('[data-step]').forEach(function(chip){chip.addEventListener('click',function(){prefs.step=Number(chip.dataset.step);writeJson(PREF_STORE,prefs);applyStep(prefs.step);});});
  document.querySelectorAll('[data-theme-choice]').forEach(function(chip){chip.addEventListener('click',function(){prefs.theme=chip.dataset.themeChoice;writeJson(PREF_STORE,prefs);applyTheme(prefs.theme);});});

  function openPanel(panel,trigger){if(!panel)return;panel.setAttribute('data-open','');panel.setAttribute('aria-hidden','false');if(trigger)trigger.setAttribute('aria-expanded','true');panel.__trigger=trigger||null;}
  function closePanel(panel){if(!panel)return;panel.removeAttribute('data-open');panel.setAttribute('aria-hidden','true');if(panel.__trigger){panel.__trigger.setAttribute('aria-expanded','false');}}
  function wirePanel(btnId,panelId){var btn=document.getElementById(btnId),panel=document.getElementById(panelId);if(!btn||!panel)return;btn.addEventListener('click',function(){panel.hasAttribute('data-open')?closePanel(panel):openPanel(panel,btn);});panel.querySelectorAll('[data-close-panel]').forEach(function(x){x.addEventListener('click',function(){closePanel(panel);});});}
  wirePanel('tocBtn','tocPanel');
  wirePanel('prefsBtn','prefsPanel');
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.panel[data-open]').forEach(closePanel);});

  function showShield(){if(shield)shield.classList.add('is-visible');}
  function hideShield(){if(shield)shield.classList.remove('is-visible');}
  document.addEventListener('visibilitychange',function(){document.visibilityState==='hidden'?showShield():hideShield();});
  addEventListener('blur',showShield);
  addEventListener('focus',function(){setTimeout(hideShield,180);});
  addEventListener('beforeprint',showShield);
  addEventListener('afterprint',hideShield);
  ['contextmenu','copy','cut','dragstart'].forEach(function(type){document.addEventListener(type,function(e){e.preventDefault();if(type==='copy')showToast('This copy is registered to you, so the text cannot be copied out.');});});

  function buildWatermark(label){
    if(!watermark)return;
    watermark.innerHTML='';
    for(var i=0;i<64;i++){var span=document.createElement('span');span.textContent=label;watermark.appendChild(span);}
  }

  function reflectConnection(){
    if(offlineFlag){if(navigator.onLine)offlineFlag.removeAttribute('data-show');else offlineFlag.setAttribute('data-show','');}
    var note=document.getElementById('offlineNote');
    if(note)note.textContent='The app shell can open without a signal. Protected chapters are fetched only after your access is verified and are not stored as one downloadable book file.';
    var remove=document.getElementById('removeCopy');if(remove)remove.hidden=true;
  }
  addEventListener('online',reflectConnection);addEventListener('offline',reflectConnection);reflectConnection();
  if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});

  var lastY=scrollY;
  function onScroll(){
    var height=document.documentElement.scrollHeight-innerHeight;
    var ratio=height>0?Math.min(1,Math.max(0,scrollY/height)):0;
    if(progress)progress.style.width=(ratio*100).toFixed(2)+'%';
    var y=scrollY;
    if(y>140&&y>lastY+6)document.body.classList.add('is-immersive');else if(y<lastY-6||y<=140)document.body.classList.remove('is-immersive');
    lastY=y;
    if(activeSequence){prefs.sequence=activeSequence;prefs.at=Math.round(scrollY);writeJson(PREF_STORE,prefs);}
  }
  var ticking=false;
  addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){onScroll();ticking=false;});},{passive:true});
  onScroll();

  function parseJwt(token){
    try{var raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');raw=raw.padEnd(Math.ceil(raw.length/4)*4,'=');return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(raw),function(c){return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')));}catch(e){return {};}
  }
  function sessionFromHash(){
    if(!location.hash||location.hash.indexOf('access_token=')<0)return null;
    var p=new URLSearchParams(location.hash.slice(1));
    var access=p.get('access_token'),refresh=p.get('refresh_token');
    if(!access||!refresh)return null;
    var claims=parseJwt(access);
    var session={access_token:access,refresh_token:refresh,expires_at:Number(p.get('expires_at'))||Number(claims.exp)||Math.floor(Date.now()/1000)+Number(p.get('expires_in')||3600)};
    writeJson(AUTH_STORE,session);
    history.replaceState(null,'',location.pathname+location.search);
    return session;
  }
  function currentSession(){return sessionFromHash()||readJson(AUTH_STORE);}
  async function refreshSession(session){
    if(!session||!session.refresh_token)return null;
    try{
      var r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
      if(!r.ok)throw new Error('refresh_failed');
      var data=await r.json();
      var next={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
      writeJson(AUTH_STORE,next);return next;
    }catch(e){removeKey(AUTH_STORE);return null;}
  }
  async function usableSession(){
    var s=currentSession();if(!s)return null;
    if(!s.expires_at||Number(s.expires_at)<Math.floor(Date.now()/1000)+90)s=await refreshSession(s);
    return s;
  }
  async function api(action,input){
    var s=await usableSession();if(!s)throw new Error('sign_in_required');
    var payload=Object.assign({action:action},input||{});
    var r=await fetch(BOOK_API,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),cache:'no-store'});
    var data={};try{data=await r.json();}catch(e){}
    if(r.status===401){removeKey(AUTH_STORE);throw new Error('sign_in_required');}
    if(!r.ok)throw new Error(data.error||'reader_unavailable');
    return data;
  }

  function addAccessUI(){
    var style=document.createElement('style');
    style.textContent='.reader-access-btn{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;border:1px solid rgba(85,61,35,.22);background:rgba(251,246,236,.94);backdrop-filter:blur(14px);border-radius:999px;padding:10px 14px;font:600 12px/1 system-ui,sans-serif;color:#2d2118;box-shadow:0 8px 28px rgba(35,22,10,.12)}.reader-auth{position:fixed;inset:0;z-index:90;display:none;place-items:center;padding:20px;background:rgba(20,14,10,.58);backdrop-filter:blur(12px)}.reader-auth[data-open]{display:grid}.reader-auth-card{width:min(420px,100%);background:#fbf6ec;color:#2d2118;border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.3)}.reader-auth-card h2{margin:0 0 8px;font:600 28px/1.1 Georgia,serif}.reader-auth-card p{font:14px/1.55 system-ui,sans-serif;color:#665546}.reader-auth-card label{display:block;margin:18px 0 6px;font:700 11px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.reader-auth-card input{width:100%;box-sizing:border-box;border:1px solid #cbbca9;border-radius:12px;padding:13px 14px;background:white;font:16px/1.2 system-ui,sans-serif}.reader-auth-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.reader-auth-actions button,.reader-auth-actions a{appearance:none;border:0;border-radius:999px;padding:11px 15px;text-decoration:none;font:700 12px/1 system-ui,sans-serif;cursor:pointer}.reader-auth-primary{background:#2d2118;color:#fff}.reader-auth-secondary{background:#eee3d4;color:#2d2118}.reader-auth-status{min-height:22px;margin-top:10px}.reader-doc hr{border:0;border-top:1px solid rgba(75,55,35,.18);margin:3rem 0}.toc-item[data-reader-sequence]{cursor:pointer}';
    document.head.appendChild(style);
    var btn=document.createElement('button');btn.type='button';btn.className='reader-access-btn';btn.id='readerAccessBtn';btn.textContent='Reader access';document.body.appendChild(btn);
    var modal=document.createElement('div');modal.className='reader-auth';modal.id='readerAuth';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="reader-auth-card" role="dialog" aria-modal="true" aria-labelledby="readerAuthTitle"><h2 id="readerAuthTitle">Open your copy</h2><p id="readerAuthCopy">Use the email attached to your ebook access. We will send a secure sign-in link.</p><form id="readerAuthForm"><label for="readerEmail">Email</label><input id="readerEmail" type="email" autocomplete="email" required placeholder="you@example.com"><div class="reader-auth-actions"><button class="reader-auth-primary" type="submit">Send secure link</button><button class="reader-auth-secondary" type="button" id="readerAuthClose">Close</button><button class="reader-auth-secondary" type="button" id="readerSignOut" hidden>Sign out</button></div><p class="reader-auth-status" id="readerAuthStatus" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(modal);
    function close(){modal.removeAttribute('data-open');modal.setAttribute('aria-hidden','true');}
    btn.addEventListener('click',function(){refreshAccessModal();modal.setAttribute('data-open','');modal.setAttribute('aria-hidden','false');});
    document.getElementById('readerAuthClose').addEventListener('click',close);
    modal.addEventListener('click',function(e){if(e.target===modal)close();});
    document.getElementById('readerAuthForm').addEventListener('submit',async function(e){
      e.preventDefault();
      var email=document.getElementById('readerEmail').value.trim();var status=document.getElementById('readerAuthStatus');
      status.textContent='Sending your secure link…';
      try{
        var r=await fetch(SUPABASE_URL+'/auth/v1/otp',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({email:email,create_user:true,email_redirect_to:location.origin+'/book/reader.html'})});
        if(!r.ok)throw new Error('send_failed');
        status.textContent='Check your email. The sign-in link can be used once and expires shortly.';
      }catch(err){status.textContent='The sign-in link could not be sent right now. Please try again.';}
    });
    document.getElementById('readerSignOut').addEventListener('click',async function(){
      var s=currentSession();
      if(s&&s.access_token){try{await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});}catch(e){}}
      removeKey(AUTH_STORE);entitled=false;manifest=[];btn.textContent='Reader access';location.reload();
    });
  }

  function jwtEmail(){var s=currentSession();return s&&s.access_token?(parseJwt(s.access_token).email||''):'';}
  function refreshAccessModal(){
    var email=jwtEmail(),signout=document.getElementById('readerSignOut'),copy=document.getElementById('readerAuthCopy'),field=document.getElementById('readerEmail');
    if(!copy||!field||!signout)return;
    if(email){field.value=email;field.disabled=true;signout.hidden=false;copy.textContent=entitled?'Your ebook access is active on this account.':'You are signed in, but this account does not have an activated ebook copy yet.';}
    else{field.disabled=false;signout.hidden=true;copy.textContent='Use the email attached to your ebook access. We will send a secure sign-in link.';}
  }

  function cleanTitle(title){return String(title||'').replace(/^PART\s+[IVX]+:\s*/i,'').replace(/^Interlude:\s*/i,'');}
  function buildToc(rows){
    var panel=document.querySelector('#tocPanel .panel-body');if(!panel)return;
    panel.innerHTML='';
    rows.forEach(function(row){
      if(row.kind==='part'){var p=document.createElement('p');p.className='toc-part';p.textContent=cleanTitle(row.title);panel.appendChild(p);return;}
      var b=document.createElement('button');b.type='button';b.className='toc-item';b.dataset.readerSequence=String(row.sequence);
      var m=/^(\d{2})\.\s*/.exec(row.title||'');
      var n=document.createElement('b');n.textContent=m?m[1]:'·';
      var s=document.createElement('span');s.textContent=cleanTitle(String(row.title||'').replace(/^\d{2}\.\s*/,''));
      b.appendChild(n);b.appendChild(s);panel.appendChild(b);
    });
  }

  function markActive(sequence){document.querySelectorAll('.toc-item').forEach(function(x){x.classList.toggle('is-active',Number(x.dataset.readerSequence)===Number(sequence));});}
  function renderChapter(chapter,wm){
    if(!readerDoc||!chapter)return;
    readerDoc.innerHTML='';
    var meta=document.createElement('span');meta.className='chapter-meta';meta.textContent=chapter.kind==='chapter'?'Chapter':'The Right Way to Live';
    var h=document.createElement('h1');h.id='chapterTitle';h.textContent=cleanTitle(String(chapter.title||'').replace(/^\d{2}\.\s*/,''));
    var rule=document.createElement('span');rule.className='chapter-rule';rule.setAttribute('aria-hidden','true');
    var prose=document.createElement('div');prose.className='reader-prose';
    String(chapter.body||'').split(/\n{2,}/).forEach(function(para){if(!para.trim())return;var p=document.createElement('p');p.textContent=para.trim();prose.appendChild(p);});
    readerDoc.appendChild(meta);readerDoc.appendChild(h);readerDoc.appendChild(rule);readerDoc.appendChild(prose);
    activeSequence=Number(chapter.sequence);prefs.sequence=activeSequence;prefs.at=0;writeJson(PREF_STORE,prefs);markActive(activeSequence);
    var barTitle=document.getElementById('barTitle');if(barTitle)barTitle.textContent=h.textContent;
    if(wm&&wm.email)buildWatermark(('PERSONAL COPY · '+wm.email).toUpperCase());
    scrollTo({top:0,behavior:'instant'});onScroll();
  }

  async function openChapter(sequence){
    if(!entitled){showToast('This chapter opens once your copy is activated.');return;}
    showToast('Opening chapter…');
    try{var data=await api('chapter',{sequence:Number(sequence)});renderChapter(data.chapter,data.watermark);closePanel(document.getElementById('tocPanel'));}
    catch(e){if(e.message==='sign_in_required'){showToast('Please sign in again.');document.getElementById('readerAccessBtn').click();}else showToast('This chapter could not be opened right now.');}
  }

  document.getElementById('tocPanel')?.addEventListener('click',function(e){var b=e.target.closest('[data-reader-sequence]');if(b)openChapter(Number(b.dataset.readerSequence));});

  async function activateReader(){
    var btn=document.getElementById('readerAccessBtn');
    var session=await usableSession();
    if(!session){if(btn)btn.textContent='Reader access';return;}
    try{
      var access=await api('access');
      entitled=access.has_access===true&&access.content_ready===true;
      manifest=Array.isArray(access.chapters)?access.chapters:[];
      if(btn)btn.textContent=entitled?'My ebook':'Account';
      refreshAccessModal();
      if(!entitled){showToast(access.content_ready===false?'Your ebook is being prepared.':'Signed in. This copy has not been activated yet.');return;}
      buildToc(manifest);
      var wanted=Number(prefs.sequence)||1;
      var row=manifest.find(function(x){return Number(x.sequence)===wanted&&x.kind!=='part';})||manifest.find(function(x){return x.kind!=='part';});
      if(row)await openChapter(row.sequence);
    }catch(e){if(e.message==='sign_in_required'){removeKey(AUTH_STORE);if(btn)btn.textContent='Reader access';}else showToast('Reader access could not be checked right now.');}
  }

  addAccessUI();
  activateReader();
})();
