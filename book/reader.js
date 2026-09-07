(function(){
  'use strict';

  /* Disable the older service-worker reader enhancement. This file now owns
     the complete reading experience while the worker continues to protect
     caching boundaries. */
  window.__FMB_READER_MODERN_V2=true;

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var BOOK_API=SUPABASE_URL+'/functions/v1/book-api';
  var BOOK_SLUG='the-right-way-to-live';
  var AUTH_STORE='trwtl.auth';
  var PREF_STORE='trwtl.reading';

  var doc=document.documentElement;
  var readerDoc=document.getElementById('readerDoc');
  var progress=document.getElementById('progressBar');
  var toast=document.getElementById('readerToast');
  var watermark=document.getElementById('readerWatermark');
  var shield=document.getElementById('privacyShield');
  var offlineFlag=document.getElementById('offlineFlag');

  var manifest=[];
  var bookmarks=[];
  var entitled=false;
  var activeSequence=null;
  var activeUserId=null;
  var activeTitle='';
  var restoringProgress=false;
  var progressTimer=null;
  var lastProgressWrite=0;
  var toastTimer=null;
  var showInstallForReader=function(){};
  var statusUI=null;
  var bookmarkButton=null;
  var readerAccessButton=null;

  function readJson(key){try{return JSON.parse(localStorage.getItem(key))||null;}catch(e){return null;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function removeKey(key){try{localStorage.removeItem(key);}catch(e){}}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  var prefs=readJson(PREF_STORE)||{};

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){toast.classList.remove('is-visible');},2600);
  }

  function cleanTitle(title){
    return String(title||'')
      .replace(/^PART\s+[IVX]+:\s*/i,'')
      .replace(/^Interlude:\s*/i,'')
      .replace(/^\d{2}\.\s*/, '');
  }
  function titleNumber(title){var match=/^(\d{2})\.\s*/.exec(String(title||''));return match?match[1]:'';}
  function readableRows(){return manifest.filter(function(row){return row&&row.kind!=='part';});}
  function rowFor(sequence){return manifest.find(function(row){return Number(row.sequence)===Number(sequence);})||null;}

  function applyStep(step){
    doc.style.setProperty('--step',step);
    document.querySelectorAll('[data-step]').forEach(function(chip){chip.setAttribute('aria-pressed',String(Number(chip.dataset.step)===Number(step)));});
    setTimeout(updateReadingStatus,60);
  }
  function applyTheme(theme){
    if(theme)doc.setAttribute('data-theme',theme);else doc.removeAttribute('data-theme');
    var effective=theme||(matchMedia('(prefers-color-scheme: dark)').matches?'night':'day');
    document.querySelectorAll('[data-theme-choice]').forEach(function(chip){chip.setAttribute('aria-pressed',String(chip.dataset.themeChoice===effective));});
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='night'?'#16120f':theme==='sepia'?'#f1e3ca':'#fbf6ec');
    setTimeout(updateReadingStatus,60);
  }
  applyStep(prefs.step||1);
  applyTheme(prefs.theme||'');
  document.querySelectorAll('[data-step]').forEach(function(chip){chip.addEventListener('click',function(){prefs.step=Number(chip.dataset.step);writeJson(PREF_STORE,prefs);applyStep(prefs.step);});});
  document.querySelectorAll('[data-theme-choice]').forEach(function(chip){chip.addEventListener('click',function(){prefs.theme=chip.dataset.themeChoice;writeJson(PREF_STORE,prefs);applyTheme(prefs.theme);});});

  function openPanel(panel,trigger){
    if(!panel)return;
    panel.setAttribute('data-open','');panel.setAttribute('aria-hidden','false');
    if(trigger)trigger.setAttribute('aria-expanded','true');
    panel.__trigger=trigger||null;
  }
  function closePanel(panel){
    if(!panel)return;
    panel.removeAttribute('data-open');panel.setAttribute('aria-hidden','true');
    if(panel.__trigger)panel.__trigger.setAttribute('aria-expanded','false');
  }
  function wirePanel(btnId,panelId){
    var btn=document.getElementById(btnId),panel=document.getElementById(panelId);if(!btn||!panel)return;
    btn.addEventListener('click',function(){panel.hasAttribute('data-open')?closePanel(panel):openPanel(panel,btn);});
    panel.querySelectorAll('[data-close-panel]').forEach(function(x){x.addEventListener('click',function(){closePanel(panel);});});
  }
  wirePanel('tocBtn','tocPanel');
  wirePanel('prefsBtn','prefsPanel');
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.panel[data-open],.reader-auth[data-open]').forEach(function(p){p.removeAttribute('data-open');p.setAttribute('aria-hidden','true');});});

  function showShield(){if(shield)shield.classList.add('is-visible');}
  function hideShield(){if(shield)shield.classList.remove('is-visible');}
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){showShield();flushProgress(true);}else hideShield();});
  addEventListener('blur',showShield);
  addEventListener('focus',function(){setTimeout(hideShield,160);});
  addEventListener('beforeprint',showShield);
  addEventListener('afterprint',hideShield);
  addEventListener('pagehide',function(){flushProgress(true);});
  ['contextmenu','copy','cut','dragstart'].forEach(function(type){document.addEventListener(type,function(e){e.preventDefault();if(type==='copy')showToast('This copy is registered to you, so the text cannot be copied out.');});});

  function buildWatermark(label){
    if(!watermark)return;
    watermark.innerHTML='';
    for(var i=0;i<48;i++){var span=document.createElement('span');span.textContent=label;watermark.appendChild(span);}
  }

  function reflectConnection(){
    if(offlineFlag){if(navigator.onLine)offlineFlag.removeAttribute('data-show');else offlineFlag.setAttribute('data-show','');}
    var note=document.getElementById('offlineNote');
    if(note)note.textContent='Protected chapters require a connection and are fetched only after your access is verified.';
    var remove=document.getElementById('removeCopy');if(remove)remove.hidden=true;
    document.querySelectorAll('.pref-note').forEach(function(p){
      if(p.textContent.indexOf('place in the book stay on this device only')>=0)p.innerHTML='Your text size and page colour stay on this device. <strong>Your reading place and bookmarks sync securely to your account.</strong>';
    });
  }
  addEventListener('online',reflectConnection);addEventListener('offline',reflectConnection);reflectConnection();
  if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});

  function initInstall(){
    var invite=document.getElementById('installInvite'),installBtn=document.getElementById('installBtn'),dismiss=document.getElementById('installDismiss');if(!invite)return;
    var deferred=null,standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    function hide(){invite.removeAttribute('data-show');}
    function baseCopy(){var copy=invite.querySelector('p');if(!copy)return;copy.innerHTML=isIOS?'<strong>Add to Home Screen</strong>Tap Safari’s Share button, then choose <b>Add to Home Screen</b>.':'<strong>Keep your reader on your Home Screen</strong>Open your book in one tap, like an app.';}
    showInstallForReader=function(){if(standalone||!entitled||prefs.installPrompted||prefs.installDismissed)return;baseCopy();if(installBtn)installBtn.hidden=isIOS;invite.setAttribute('data-show','');prefs.installPrompted=true;writeJson(PREF_STORE,prefs);};
    addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(entitled)setTimeout(showInstallForReader,350);});
    addEventListener('appinstalled',function(){prefs.installInstalled=true;writeJson(PREF_STORE,prefs);deferred=null;hide();showToast('The reader is now on your Home Screen.');});
    if(installBtn)installBtn.addEventListener('click',function(){if(!deferred)return;deferred.prompt();deferred.userChoice.then(function(choice){prefs.installInstalled=choice&&choice.outcome==='accepted';writeJson(PREF_STORE,prefs);deferred=null;hide();});});
    if(dismiss)dismiss.addEventListener('click',function(){prefs.installDismissed=true;writeJson(PREF_STORE,prefs);hide();});
  }
  initInstall();

  function normalizePreviewCopy(){
    var card=document.querySelector('.unlock-card');if(!card)return;
    var heading=card.querySelector('h2');if(heading)heading.textContent='Continue with your full copy.';
    var paragraphs=card.querySelectorAll('p');if(paragraphs[0])paragraphs[0].textContent='Your full reader opens after your copy is activated. Paid and complimentary copies use the same protected reader.';
    var note=card.querySelector('.unlock-note');if(note)note.innerHTML='Already have access? Open <b>Reader access</b> and use the email attached to your copy.';
  }
  normalizePreviewCopy();

  function parseJwt(token){try{var raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');raw=raw.padEnd(Math.ceil(raw.length/4)*4,'=');return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(raw),function(c){return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')));}catch(e){return {};}}
  function sessionFromHash(){
    if(!location.hash||location.hash.indexOf('access_token=')<0)return null;
    var p=new URLSearchParams(location.hash.slice(1)),access=p.get('access_token'),refresh=p.get('refresh_token');if(!access||!refresh)return null;
    var claims=parseJwt(access),session={access_token:access,refresh_token:refresh,expires_at:Number(p.get('expires_at'))||Number(claims.exp)||Math.floor(Date.now()/1000)+Number(p.get('expires_in')||3600)};
    writeJson(AUTH_STORE,session);history.replaceState(null,'',location.pathname+location.search);return session;
  }
  function currentSession(){return sessionFromHash()||readJson(AUTH_STORE);}
  async function refreshSession(session){
    if(!session||!session.refresh_token)return null;
    try{
      var r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store'});
      if(!r.ok)throw new Error('refresh_failed');
      var data=await r.json(),next={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
      writeJson(AUTH_STORE,next);return next;
    }catch(e){removeKey(AUTH_STORE);return null;}
  }
  async function usableSession(){var s=currentSession();if(!s)return null;if(!s.expires_at||Number(s.expires_at)<Math.floor(Date.now()/1000)+90)s=await refreshSession(s);return s;}
  async function api(action,input){
    var s=await usableSession();if(!s)throw new Error('sign_in_required');
    var r=await fetch(BOOK_API,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.assign({action:action},input||{})),cache:'no-store'}),data={};
    try{data=await r.json();}catch(e){}
    if(r.status===401){removeKey(AUTH_STORE);throw new Error('sign_in_required');}
    if(!r.ok)throw new Error(data.error||'reader_unavailable');
    return data;
  }

  function chapterMetrics(){
    if(!readerDoc)return {percent:0,page:1,pages:1};
    var rect=readerDoc.getBoundingClientRect();
    var top=scrollY+rect.top;
    var pageHeight=Math.max(360,innerHeight-150);
    var local=clamp(scrollY-top,0,Math.max(0,readerDoc.scrollHeight-pageHeight));
    var max=Math.max(1,readerDoc.scrollHeight-pageHeight);
    var pages=Math.max(1,Math.ceil(readerDoc.scrollHeight/pageHeight));
    var page=Math.min(pages,Math.floor(local/pageHeight)+1);
    return {percent:clamp((local/max)*100,0,100),page:page,pages:pages};
  }
  function overallPercent(chapterPercent){
    var rows=readableRows(),index=rows.findIndex(function(row){return Number(row.sequence)===Number(activeSequence);});
    if(index<0||!rows.length)return chapterPercent||0;
    return clamp(((index+(Number(chapterPercent)||0)/100)/rows.length)*100,0,100);
  }
  function chapterStatusText(){
    var row=rowFor(activeSequence);if(!row)return 'Preview';
    var n=titleNumber(row.title);
    if(row.kind==='chapter')return n?'Chapter '+Number(n):'Chapter';
    if(row.kind==='interlude')return 'Interlude';
    if(row.kind==='frontmatter')return 'Front Matter';
    return 'The Right Way to Live';
  }

  function createStatusUI(){
    if(document.getElementById('readerStatus'))return;
    var status=document.createElement('div');status.id='readerStatus';status.className='reader-status';status.setAttribute('aria-live','polite');status.innerHTML='<span id="readerStatusChapter">Preview</span><span id="readerStatusPage">Page 1</span><span id="readerStatusBook">0%</span>';
    var line=document.querySelector('.reader-progress');
    if(line&&line.parentNode)line.parentNode.insertBefore(status,line);else document.body.appendChild(status);
    statusUI=status;

    var bar=document.getElementById('readerBar');
    if(bar&&!document.getElementById('readerBookmarkBtn')){
      var button=document.createElement('button');button.type='button';button.className='bar-btn reader-bookmark-btn';button.id='readerBookmarkBtn';button.setAttribute('aria-label','Bookmark this page');button.setAttribute('aria-pressed','false');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15l-5.5-3.3-5.5 3.3Z"/></svg>';
      var prefsButton=document.getElementById('prefsBtn');bar.insertBefore(button,prefsButton||document.getElementById('tocBtn'));
      button.addEventListener('click',toggleBookmark);
      bookmarkButton=button;
    }
  }
  createStatusUI();

  function updateBookmarkButton(){
    if(!bookmarkButton)return;
    if(!entitled||!activeSequence){bookmarkButton.disabled=true;bookmarkButton.setAttribute('aria-pressed','false');return;}
    bookmarkButton.disabled=false;
    var key=Math.round(chapterMetrics().percent);
    var active=bookmarks.some(function(b){return Number(b.chapter_sequence)===Number(activeSequence)&&Number(b.position_key)===Number(key);});
    bookmarkButton.setAttribute('aria-pressed',active?'true':'false');
    bookmarkButton.setAttribute('aria-label',active?'Remove bookmark from this page':'Bookmark this page');
  }
  function updateReadingStatus(){
    if(!statusUI)statusUI=document.getElementById('readerStatus');
    var metrics=chapterMetrics();
    var chapter=document.getElementById('readerStatusChapter'),page=document.getElementById('readerStatusPage'),book=document.getElementById('readerStatusBook');
    if(chapter)chapter.textContent=activeSequence?chapterStatusText():'Preview';
    if(page)page.textContent='Page '+metrics.page+' of '+metrics.pages;
    var overall=activeSequence?overallPercent(metrics.percent):0;
    if(book)book.textContent=Math.round(overall)+'%';
    if(progress)progress.style.width=overall.toFixed(2)+'%';
    updateBookmarkButton();
    return metrics;
  }

  async function loadRemoteProgress(session){
    if(!session||!session.access_token)return null;
    var claims=parseJwt(session.access_token);if(!claims.sub)return null;activeUserId=claims.sub;
    try{
      var url=SUPABASE_URL+'/rest/v1/book_reader_progress?select=chapter_sequence,scroll_percent,updated_at&user_id=eq.'+encodeURIComponent(claims.sub)+'&book_slug=eq.'+BOOK_SLUG+'&limit=1';
      var r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token,Accept:'application/json'},cache:'no-store'});
      if(!r.ok)return null;var rows=await r.json();return rows&&rows[0]?rows[0]:null;
    }catch(e){return null;}
  }
  async function saveRemoteProgress(keepalive){
    if(!entitled||!activeSequence||!activeUserId)return;
    var s=currentSession();if(!s||!s.access_token)return;
    var percent=Number(chapterMetrics().percent.toFixed(2));
    var url=SUPABASE_URL+'/rest/v1/book_reader_progress?on_conflict=user_id,book_slug';
    try{
      await fetch(url,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:activeUserId,book_slug:BOOK_SLUG,chapter_sequence:Number(activeSequence),scroll_percent:percent}),cache:'no-store',keepalive:keepalive===true});
      lastProgressWrite=Date.now();
    }catch(e){}
  }
  function scheduleProgressSave(){if(!entitled||!activeUserId)return;clearTimeout(progressTimer);var wait=Math.max(1200,5000-(Date.now()-lastProgressWrite));progressTimer=setTimeout(function(){saveRemoteProgress(false);},wait);}
  function flushProgress(keepalive){clearTimeout(progressTimer);progressTimer=null;if(entitled&&activeUserId)saveRemoteProgress(keepalive===true);}

  async function loadBookmarks(session){
    if(!session||!session.access_token||!activeUserId){bookmarks=[];renderBookmarks();return;}
    try{
      var url=SUPABASE_URL+'/rest/v1/book_reader_bookmarks?select=id,chapter_sequence,scroll_percent,position_key,chapter_title,created_at&user_id=eq.'+encodeURIComponent(activeUserId)+'&book_slug=eq.'+BOOK_SLUG+'&order=chapter_sequence.asc,scroll_percent.asc';
      var r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token,Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error('bookmark_load_failed');bookmarks=await r.json();
    }catch(e){bookmarks=[];}
    renderBookmarks();updateBookmarkButton();
  }
  async function toggleBookmark(){
    if(!entitled||!activeUserId||!activeSequence){showToast('Bookmarks are available in your activated copy.');return;}
    var s=await usableSession();if(!s)return;
    var metrics=chapterMetrics(),key=Math.round(metrics.percent);
    var existing=bookmarks.find(function(b){return Number(b.chapter_sequence)===Number(activeSequence)&&Number(b.position_key)===Number(key);});
    try{
      if(existing){
        var del=await fetch(SUPABASE_URL+'/rest/v1/book_reader_bookmarks?id=eq.'+encodeURIComponent(existing.id),{method:'DELETE',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,Prefer:'return=minimal'},cache:'no-store'});
        if(!del.ok)throw new Error('bookmark_delete_failed');bookmarks=bookmarks.filter(function(b){return b.id!==existing.id;});showToast('Bookmark removed.');
      }else{
        var payload={user_id:activeUserId,book_slug:BOOK_SLUG,chapter_sequence:Number(activeSequence),scroll_percent:Number(metrics.percent.toFixed(2)),position_key:key,chapter_title:activeTitle||cleanTitle((rowFor(activeSequence)||{}).title||'')};
        var add=await fetch(SUPABASE_URL+'/rest/v1/book_reader_bookmarks',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'});
        if(!add.ok)throw new Error('bookmark_add_failed');var rows=await add.json();if(rows&&rows[0])bookmarks.push(rows[0]);showToast('Page bookmarked.');
      }
      renderBookmarks();updateBookmarkButton();
    }catch(e){showToast('Bookmark could not be saved right now.');}
  }

  var lastY=scrollY,ticking=false;
  function onScroll(){
    var metrics=updateReadingStatus();
    if(activeSequence&&!restoringProgress){prefs.sequence=activeSequence;prefs.percent=Number(metrics.percent.toFixed(2));writeJson(PREF_STORE,prefs);scheduleProgressSave();}
    lastY=scrollY;
  }
  addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){onScroll();ticking=false;});},{passive:true});
  addEventListener('resize',function(){requestAnimationFrame(updateReadingStatus);},{passive:true});
  onScroll();

  function addAccessUI(){
    var btn=document.createElement('button');btn.type='button';btn.className='reader-access-btn';btn.id='readerAccessBtn';btn.textContent='Reader access';document.body.appendChild(btn);readerAccessButton=btn;
    var modal=document.createElement('div');modal.className='reader-auth';modal.id='readerAuth';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="reader-auth-card" role="dialog" aria-modal="true" aria-labelledby="readerAuthTitle"><h2 id="readerAuthTitle">Reader access</h2><p id="readerAuthCopy">Use the email attached to your ebook access. We will send a secure sign-in link.</p><form id="readerAuthForm"><label for="readerEmail">Email</label><input id="readerEmail" type="email" autocomplete="email" required placeholder="you@example.com"><div class="reader-auth-actions"><button class="reader-auth-primary" type="submit">Send secure link</button><button class="reader-auth-secondary" type="button" id="readerAuthClose">Close</button><button class="reader-auth-secondary" type="button" id="readerSignOut" hidden>Sign out</button></div><p class="reader-auth-status" id="readerAuthStatus" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(modal);
    function close(){modal.removeAttribute('data-open');modal.setAttribute('aria-hidden','true');}
    btn.addEventListener('click',function(){refreshAccessModal();modal.setAttribute('data-open','');modal.setAttribute('aria-hidden','false');});
    document.getElementById('readerAuthClose').addEventListener('click',close);
    modal.addEventListener('click',function(e){if(e.target===modal)close();});
    document.getElementById('readerAuthForm').addEventListener('submit',async function(e){
      e.preventDefault();var email=document.getElementById('readerEmail').value.trim(),status=document.getElementById('readerAuthStatus');status.textContent='Sending secure link…';
      try{var r=await fetch(SUPABASE_URL+'/auth/v1/otp',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({email:email,create_user:true,email_redirect_to:location.origin+'/book/reader.html'}),cache:'no-store'});if(!r.ok)throw new Error('send_failed');status.textContent='Check your email and open the secure link on this device.';}catch(err){status.textContent='The sign-in link could not be sent right now.';}
    });
    document.getElementById('readerSignOut').addEventListener('click',async function(){
      flushProgress(false);var s=currentSession();if(s&&s.access_token){try{await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});}catch(e){}}
      removeKey(AUTH_STORE);activeUserId=null;entitled=false;manifest=[];bookmarks=[];
      if('serviceWorker' in navigator&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({type:'clear-cache'});
      location.reload();
    });
  }
  function jwtEmail(){var s=currentSession();return s&&s.access_token?(parseJwt(s.access_token).email||''):'';}
  function refreshAccessModal(){
    var email=jwtEmail(),signout=document.getElementById('readerSignOut'),copy=document.getElementById('readerAuthCopy'),field=document.getElementById('readerEmail');if(!copy||!field||!signout)return;
    if(email){field.value=email;field.disabled=true;signout.hidden=false;copy.textContent=entitled?'Your ebook access is active on this account.':'You are signed in, but this account does not have an activated ebook copy yet.';}
    else{field.value='';field.disabled=false;signout.hidden=true;copy.textContent='Use the email attached to your ebook access. We will send a secure sign-in link.';}
  }
  addAccessUI();

  function buildToc(rows){
    var panel=document.querySelector('#tocPanel .panel-body');if(!panel)return;
    panel.innerHTML='<div class="reader-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-reader-tab="contents">Contents</button><button type="button" role="tab" aria-selected="false" data-reader-tab="bookmarks">Bookmarks <span id="bookmarkCount">0</span></button></div><div class="reader-tab-view" id="readerContentsView"></div><div class="reader-tab-view" id="readerBookmarksView" hidden></div>';
    var contents=document.getElementById('readerContentsView');
    rows.forEach(function(row){
      if(row.kind==='part'){var p=document.createElement('p');p.className='toc-part';p.textContent=cleanTitle(row.title);contents.appendChild(p);return;}
      var b=document.createElement('button');b.type='button';b.className='toc-item';b.dataset.readerSequence=String(row.sequence);
      var n=document.createElement('b');n.textContent=titleNumber(row.title)||'·';
      var s=document.createElement('span');s.textContent=cleanTitle(row.title);
      var page=document.createElement('small');page.textContent=row.kind==='frontmatter'?'Front Matter':row.kind==='interlude'?'Interlude':'';
      b.appendChild(n);b.appendChild(s);b.appendChild(page);contents.appendChild(b);
    });
    panel.querySelectorAll('[data-reader-tab]').forEach(function(tab){tab.addEventListener('click',function(){
      var mode=tab.dataset.readerTab;panel.querySelectorAll('[data-reader-tab]').forEach(function(t){t.setAttribute('aria-selected',String(t===tab));});
      document.getElementById('readerContentsView').hidden=mode!=='contents';document.getElementById('readerBookmarksView').hidden=mode!=='bookmarks';
    });});
    renderBookmarks();markActive(activeSequence);
  }
  function renderBookmarks(){
    var view=document.getElementById('readerBookmarksView'),count=document.getElementById('bookmarkCount');if(count)count.textContent=String(bookmarks.length);if(!view)return;
    view.innerHTML='';
    if(!bookmarks.length){var empty=document.createElement('div');empty.className='bookmark-empty';empty.innerHTML='<strong>No bookmarks yet</strong><span>Tap the bookmark icon while reading to save a page.</span>';view.appendChild(empty);return;}
    bookmarks.slice().sort(function(a,b){return Number(a.chapter_sequence)-Number(b.chapter_sequence)||Number(a.scroll_percent)-Number(b.scroll_percent);}).forEach(function(bookmark){
      var row=document.createElement('button');row.type='button';row.className='bookmark-row';row.innerHTML='<span class="bookmark-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.5 4.5h11v15l-5.5-3.3-5.5 3.3Z"/></svg></span><span class="bookmark-copy"><strong></strong><small></small></span><span class="bookmark-chevron" aria-hidden="true">›</span>';
      row.querySelector('strong').textContent=bookmark.chapter_title||cleanTitle((rowFor(bookmark.chapter_sequence)||{}).title||'Saved page');
      row.querySelector('small').textContent='Saved at '+Math.round(Number(bookmark.scroll_percent)||0)+'% of this section';
      row.addEventListener('click',function(){openBookmark(bookmark);});view.appendChild(row);
    });
  }
  function markActive(sequence){document.querySelectorAll('.toc-item').forEach(function(x){x.classList.toggle('is-active',Number(x.dataset.readerSequence)===Number(sequence));});}
  async function openBookmark(bookmark){
    closePanel(document.getElementById('tocPanel'));
    if(Number(activeSequence)===Number(bookmark.chapter_sequence))restoreScroll(Number(bookmark.scroll_percent)||0);
    else await openChapter(Number(bookmark.chapter_sequence),Number(bookmark.scroll_percent)||0);
  }

  function appendChapterNavigation(sequence){
    var rows=readableRows(),index=rows.findIndex(function(row){return Number(row.sequence)===Number(sequence);});if(index<0)return;
    var nav=document.createElement('nav');nav.className='chapter-end-nav';nav.setAttribute('aria-label','Chapter navigation');
    if(index>0){var prev=document.createElement('button');prev.type='button';prev.innerHTML='<span>Previous</span><strong>'+cleanTitle(rows[index-1].title)+'</strong>';prev.addEventListener('click',function(){openChapter(rows[index-1].sequence,0);});nav.appendChild(prev);}
    if(index<rows.length-1){var next=document.createElement('button');next.type='button';next.className='is-next';next.innerHTML='<span>Next</span><strong>'+cleanTitle(rows[index+1].title)+'</strong>';next.addEventListener('click',function(){openChapter(rows[index+1].sequence,0);});nav.appendChild(next);}
    readerDoc.appendChild(nav);
  }
  function appendReaderEndNote(sequence){
    var rows=readableRows();if(!rows.length||Number(rows[rows.length-1].sequence)!==Number(sequence))return;
    var note=document.createElement('section');note.className='reader-end-note';note.innerHTML='<span>A note from FMB</span><h2>Thank you for staying until the last page.</h2><p>Keep what helps you. Question what does not. Change your mind when life gives you a better answer.</p><p class="reader-end-signoff">With love,<br><strong>FMB</strong></p>';readerDoc.appendChild(note);
  }
  function restoreScroll(percent){
    restoringProgress=true;
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      var rect=readerDoc.getBoundingClientRect(),top=scrollY+rect.top,pageHeight=Math.max(360,innerHeight-150),max=Math.max(0,readerDoc.scrollHeight-pageHeight);
      scrollTo(0,top+max*(clamp(Number(percent)||0,0,100)/100));restoringProgress=false;onScroll();
    });});
  }
  function chapterMeta(chapter){
    var n=titleNumber(chapter.title);
    if(chapter.kind==='chapter')return n?'Chapter '+Number(n):'Chapter';
    if(chapter.kind==='interlude')return 'Interlude';
    if(chapter.kind==='frontmatter')return 'Front Matter';
    return 'The Right Way to Live';
  }
  function renderChapter(chapter,wm,restorePercent){
    if(!readerDoc||!chapter)return;
    readerDoc.innerHTML='';readerDoc.classList.remove('reader-enter');
    activeSequence=Number(chapter.sequence);activeTitle=cleanTitle(chapter.title);
    var meta=document.createElement('span');meta.className='chapter-meta';meta.textContent=chapterMeta(chapter);
    var h=document.createElement('h1');h.id='chapterTitle';h.textContent=activeTitle;
    var rule=document.createElement('span');rule.className='chapter-rule';rule.setAttribute('aria-hidden','true');
    var prose=document.createElement('div');prose.className='reader-prose';
    String(chapter.body||'').split(/\n{2,}/).forEach(function(para){if(!para.trim())return;var p=document.createElement('p');p.textContent=para.trim();prose.appendChild(p);});
    readerDoc.appendChild(meta);readerDoc.appendChild(h);readerDoc.appendChild(rule);readerDoc.appendChild(prose);
    prefs.sequence=activeSequence;prefs.percent=Number(restorePercent)||0;writeJson(PREF_STORE,prefs);markActive(activeSequence);
    var barTitle=document.getElementById('barTitle');if(barTitle)barTitle.textContent=activeTitle;
    if(wm&&wm.email)buildWatermark(('PERSONAL COPY · '+wm.email).toUpperCase());
    appendReaderEndNote(activeSequence);appendChapterNavigation(activeSequence);
    requestAnimationFrame(function(){readerDoc.classList.add('reader-enter');document.body.classList.remove('reader-resolving');});
    restoreScroll(restorePercent||0);scheduleProgressSave();
  }
  async function openChapter(sequence,restorePercent){
    if(!entitled){showToast('This section opens once your copy is activated.');return;}
    document.body.classList.add('reader-changing');
    try{
      flushProgress(false);var data=await api('chapter',{sequence:Number(sequence)});renderChapter(data.chapter,data.watermark,restorePercent||0);closePanel(document.getElementById('tocPanel'));
    }catch(e){
      document.body.classList.remove('reader-changing');
      if(e.message==='sign_in_required'){showToast('Please sign in again.');if(readerAccessButton)readerAccessButton.click();}
      else showToast('This section could not be opened right now.');
    }
  }
  var toc=document.getElementById('tocPanel');if(toc)toc.addEventListener('click',function(e){var b=e.target.closest('[data-reader-sequence]');if(b)openChapter(Number(b.dataset.readerSequence),0);else if(e.target.closest('[data-locked]'))showToast('This section opens once your copy is activated.');else if(e.target.closest('[data-preview-chapter]')){closePanel(toc);scrollTo({top:0,behavior:'smooth'});}});

  async function activateReader(){
    var session=await usableSession();
    if(!session){if(readerAccessButton)readerAccessButton.textContent='Reader access';updateReadingStatus();return;}
    document.body.classList.add('reader-resolving');
    var claims=parseJwt(session.access_token);activeUserId=claims.sub||null;
    try{
      var access=await api('access');
      entitled=access.has_access===true&&access.content_ready===true;
      manifest=Array.isArray(access.chapters)?access.chapters:[];
      if(readerAccessButton){readerAccessButton.textContent=entitled?'Account':'Reader access';readerAccessButton.hidden=entitled;}
      refreshAccessModal();
      if(!entitled){document.body.classList.remove('reader-resolving');showToast(access.content_ready===false?'Your ebook is being prepared.':'Signed in. This copy has not been activated yet.');return;}

      buildToc(manifest);
      await loadBookmarks(session);
      var remote=await loadRemoteProgress(session);
      var savedSequence=remote?Number(remote.chapter_sequence):Number(prefs.sequence)||0;
      var savedPercent=remote?Number(remote.scroll_percent)||0:Number(prefs.percent)||0;
      var row=manifest.find(function(x){return Number(x.sequence)===savedSequence&&x.kind!=='part';});
      if(!row)row=manifest.find(function(x){return x.kind==='chapter';})||manifest.find(function(x){return x.kind!=='part';});
      if(row)await openChapter(row.sequence,savedSequence? savedPercent:0);
      setTimeout(showInstallForReader,650);
    }catch(e){
      document.body.classList.remove('reader-resolving');
      if(e.message==='sign_in_required'){removeKey(AUTH_STORE);activeUserId=null;if(readerAccessButton)readerAccessButton.textContent='Reader access';}
      else showToast('Reader access could not be checked right now.');
    }
  }

  activateReader();
})();
