(function(){
  'use strict';

  var GIFT_API='https://wjnavdpppnhxbuydkrkd.supabase.co/functions/v1/book-gift-api';
  var SESSION_KEY='trwtl.gift.session';
  var EMAIL_KEY='trwtl.gift.email';
  var PROGRESS_KEY='trwtl.gift.progress';
  var PREF_KEY='trwtl.gift.prefs';
  var manifest=[];
  var session='';
  var email='';
  var currentSequence=null;
  var toastTimer=null;
  var deferredInstall=null;

  var main=document.getElementById('main');
  var loading=document.getElementById('loading');
  var doc=document.getElementById('doc');
  var tocPanel=document.getElementById('tocPanel');
  var tocBody=document.getElementById('tocBody');
  var prefsPanel=document.getElementById('prefsPanel');
  var nav=document.getElementById('nav');
  var progress=document.getElementById('progress');
  var barTitle=document.getElementById('barTitle');
  var watermark=document.getElementById('watermark');
  var toast=document.getElementById('toast');
  var shield=document.getElementById('shield');
  var install=document.getElementById('install');
  var installBtn=document.getElementById('installBtn');

  function read(key){try{return localStorage.getItem(key)||'';}catch(e){return '';}}
  function write(key,value){try{localStorage.setItem(key,value);}catch(e){}}
  function remove(key){try{localStorage.removeItem(key);}catch(e){}}
  function readJson(key){try{return JSON.parse(read(key))||null;}catch(e){return null;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){toast.classList.remove('show');},2600);
  }

  async function giftApi(action,payload){
    var body=Object.assign({action:action},payload||{});
    var r=await fetch(GIFT_API,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(body),
      cache:'no-store',
      credentials:'omit',
      referrerPolicy:'no-referrer'
    });
    var data={};
    try{data=await r.json();}catch(e){}
    if(!r.ok)throw new Error(data.error||'service_unavailable');
    return data;
  }

  function giftToken(){
    var hash=location.hash&&location.hash.charAt(0)==='#'?location.hash.slice(1):'';
    var p=new URLSearchParams(hash);
    var token=p.get('gift')||'';
    return /^[0-9a-f]{64}$/.test(token)?token:'';
  }

  function stripGift(){
    if(!location.hash)return;
    history.replaceState(null,'',location.pathname+location.search);
  }

  function fail(title,copy){
    stripGift();
    if(loading)loading.hidden=true;
    if(doc)doc.hidden=true;
    if(nav)nav.hidden=true;
    main.innerHTML='<section class="error-card"><h1>'+escapeHtml(title)+'</h1><p>'+escapeHtml(copy)+'</p><a href="mailto:withlovefmb@gmail.com?subject=Ebook%20access">Request a new access email</a></section>';
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}

  function cleanTitle(title){
    return String(title||'').replace(/^PART\s+[IVX]+:\s*/i,'').replace(/^Interlude:\s*/i,'').replace(/^\d{2}\.\s*/,'');
  }

  function partTitle(title){return String(title||'').replace(/^PART\s+[IVX]+:\s*/i,'');}

  function readingRows(){return manifest.filter(function(row){return row.kind!=='part';});}

  function buildToc(){
    tocBody.innerHTML='';
    manifest.forEach(function(row){
      if(row.kind==='part'){
        var p=document.createElement('p');
        p.className='toc-part';
        p.textContent=partTitle(row.title);
        tocBody.appendChild(p);
        return;
      }
      var b=document.createElement('button');
      b.type='button';b.className='toc-item';b.dataset.sequence=String(row.sequence);
      var n=document.createElement('b');
      var m=/^(\d{2})\.\s*/.exec(row.title||'');
      n.textContent=m?m[1]:'·';
      var s=document.createElement('span');s.textContent=cleanTitle(row.title);
      b.appendChild(n);b.appendChild(s);tocBody.appendChild(b);
    });
  }

  function markActive(sequence){
    tocBody.querySelectorAll('[data-sequence]').forEach(function(btn){btn.classList.toggle('is-active',Number(btn.dataset.sequence)===Number(sequence));});
  }

  function buildWatermark(){
    if(!watermark||!email)return;
    watermark.innerHTML='';
    for(var i=0;i<48;i++){
      var span=document.createElement('span');
      span.textContent=('PERSONAL COPY · '+email).toUpperCase();
      watermark.appendChild(span);
    }
  }

  function applyPrefs(){
    var prefs=readJson(PREF_KEY)||{};
    var step=Number(prefs.step)||1;
    var theme=prefs.theme||'day';
    document.documentElement.style.setProperty('--step',String(step));
    if(theme==='day')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',theme);
    document.querySelectorAll('[data-step]').forEach(function(btn){btn.setAttribute('aria-pressed',String(Number(btn.dataset.step)===step));});
    document.querySelectorAll('[data-theme]').forEach(function(btn){btn.setAttribute('aria-pressed',String(btn.dataset.theme===theme));});
  }

  function renderChapter(chapter,restorePercent){
    doc.innerHTML='';
    var meta=document.createElement('span');meta.className='chapter-meta';meta.textContent=chapter.kind==='chapter'?'Chapter':'The Right Way to Live';
    var h=document.createElement('h1');h.textContent=cleanTitle(chapter.title);
    var rule=document.createElement('span');rule.className='rule';
    var prose=document.createElement('div');prose.className='prose';
    String(chapter.body||'').split(/\n{2,}/).forEach(function(text){
      if(!text.trim())return;
      var p=document.createElement('p');p.textContent=text.trim();prose.appendChild(p);
    });
    doc.appendChild(meta);doc.appendChild(h);doc.appendChild(rule);doc.appendChild(prose);
    doc.hidden=false;loading.hidden=true;nav.hidden=false;
    currentSequence=Number(chapter.sequence);
    barTitle.textContent=h.textContent;
    markActive(currentSequence);
    updateNav();
    buildWatermark();
    requestAnimationFrame(function(){
      var max=document.documentElement.scrollHeight-innerHeight;
      var pct=Math.max(0,Math.min(100,Number(restorePercent)||0));
      scrollTo(0,max>0?max*pct/100:0);
      updateProgress();
    });
  }

  async function openChapter(sequence,restorePercent){
    if(!session)return;
    showToast('Opening chapter…');
    try{
      var data=await giftApi('chapter',{session:session,sequence:Number(sequence)});
      renderChapter(data.chapter,restorePercent||0);
      closePanel(tocPanel);
    }catch(e){
      if(e.message==='access_required'){
        remove(SESSION_KEY);remove(EMAIL_KEY);
        fail('Your access needs a fresh link','For security, this device no longer has an active ebook session.');
      }else showToast('This chapter could not be opened right now.');
    }
  }

  function updateNav(){
    var rows=readingRows();
    var idx=rows.findIndex(function(row){return Number(row.sequence)===Number(currentSequence);});
    document.getElementById('prevBtn').disabled=idx<=0;
    document.getElementById('nextBtn').disabled=idx<0||idx>=rows.length-1;
  }

  function move(delta){
    var rows=readingRows();
    var idx=rows.findIndex(function(row){return Number(row.sequence)===Number(currentSequence);});
    var target=rows[idx+delta];
    if(target)openChapter(target.sequence,0);
  }

  function openPanel(panel){panel.setAttribute('data-open','');panel.setAttribute('aria-hidden','false');}
  function closePanel(panel){panel.removeAttribute('data-open');panel.setAttribute('aria-hidden','true');}

  function updateProgress(){
    if(!currentSequence)return;
    var max=document.documentElement.scrollHeight-innerHeight;
    var pct=max>0?Math.max(0,Math.min(100,scrollY/max*100)):0;
    progress.style.width=pct.toFixed(2)+'%';
    writeJson(PROGRESS_KEY,{sequence:currentSequence,percent:Number(pct.toFixed(2))});
  }

  function wireUi(){
    document.getElementById('tocBtn').addEventListener('click',function(){openPanel(tocPanel);});
    document.getElementById('contentsBtn').addEventListener('click',function(){openPanel(tocPanel);});
    document.getElementById('prefsBtn').addEventListener('click',function(){openPanel(prefsPanel);});
    document.querySelector('[data-close="toc"]').addEventListener('click',function(){closePanel(tocPanel);});
    document.querySelector('[data-close="prefs"]').addEventListener('click',function(){closePanel(prefsPanel);});
    tocBody.addEventListener('click',function(e){var btn=e.target.closest('[data-sequence]');if(btn)openChapter(Number(btn.dataset.sequence),0);});
    document.getElementById('prevBtn').addEventListener('click',function(){move(-1);});
    document.getElementById('nextBtn').addEventListener('click',function(){move(1);});

    document.querySelectorAll('[data-step]').forEach(function(btn){btn.addEventListener('click',function(){var prefs=readJson(PREF_KEY)||{};prefs.step=Number(btn.dataset.step);writeJson(PREF_KEY,prefs);applyPrefs();});});
    document.querySelectorAll('[data-theme]').forEach(function(btn){btn.addEventListener('click',function(){var prefs=readJson(PREF_KEY)||{};prefs.theme=btn.dataset.theme;writeJson(PREF_KEY,prefs);applyPrefs();});});

    var ticking=false;
    addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){updateProgress();ticking=false;});},{passive:true});
    ['copy','cut','contextmenu','dragstart'].forEach(function(type){document.addEventListener(type,function(e){e.preventDefault();if(type==='copy')showToast('This personal copy cannot be copied out.');});});
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')shield.classList.add('show');else setTimeout(function(){shield.classList.remove('show');},120);});
    addEventListener('beforeprint',function(){shield.classList.add('show');});
    addEventListener('afterprint',function(){shield.classList.remove('show');});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closePanel(tocPanel);closePanel(prefsPanel);}});
  }

  function wireInstall(){
    var standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(standalone)return;
    addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;});
    setTimeout(function(){
      if(!session)return;
      install.classList.add('show');
      if(isIOS){document.getElementById('installCopy').textContent='On iPhone or iPad: Share → Add to Home Screen.';installBtn.textContent='Got it';}
    },1400);
    installBtn.addEventListener('click',function(){
      if(isIOS||!deferredInstall){install.classList.remove('show');return;}
      deferredInstall.prompt();deferredInstall.userChoice.finally(function(){install.classList.remove('show');deferredInstall=null;});
    });
    addEventListener('appinstalled',function(){install.classList.remove('show');});
  }

  async function validateStored(){
    var stored=read(SESSION_KEY);
    if(!/^[0-9a-f]{64}$/.test(stored))return null;
    try{
      var data=await giftApi('access',{session:stored});
      if(data.has_access!==true||data.content_ready!==true)return null;
      session=stored;email=data.email||read(EMAIL_KEY);manifest=Array.isArray(data.chapters)?data.chapters:[];
      return data;
    }catch(e){return null;}
  }

  async function exchangeToken(token){
    var data=await giftApi('exchange',{token:token});
    if(!data.session||!Array.isArray(data.chapters))throw new Error('invalid_access_link');
    session=data.session;email=data.email||'';manifest=data.chapters;
    write(SESSION_KEY,session);write(EMAIL_KEY,email);stripGift();
    return data;
  }

  async function start(){
    wireUi();applyPrefs();
    var token=giftToken();
    var access=await validateStored();
    if(!access&&token){
      try{access=await exchangeToken(token);}catch(e){
        if(e.message==='access_link_expired')fail('This access link has expired','Ask FMB for a fresh complimentary access email.');
        else fail('This private link is no longer active','The link may already have been opened on another device. Ask FMB for a fresh access email.');
        return;
      }
    }
    if(!access){
      fail('Open the ebook from your access email','This app does not use registration. Open the private button in the complimentary or paid access email.');
      return;
    }

    buildToc();buildWatermark();wireInstall();
    var saved=readJson(PROGRESS_KEY)||{};
    var rows=readingRows();
    var first=rows.find(function(row){return Number(row.sequence)===Number(saved.sequence);})||rows[0];
    if(!first){fail('The ebook is not available yet','Please try again shortly.');return;}
    await openChapter(first.sequence,Number(saved.percent)||0);
    if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
  }

  start().catch(function(){fail('The ebook could not open','Please try the access link again. If the problem continues, ask FMB to resend it.');});
})();
