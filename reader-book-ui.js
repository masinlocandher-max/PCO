(function(){
  'use strict';
  if(window.__FMB_REAL_BOOK_READER)return;window.__FMB_REAL_BOOK_READER=true;

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var BOOK_SLUG='the-right-way-to-live';
  var AUTH_STORE='trwtl.auth';
  var readerDoc=document.getElementById('readerDoc');
  var tocPanel=document.getElementById('tocPanel');
  var toast=document.getElementById('readerToast');
  var bookmarks=[];
  var pendingBookmark=null;
  var tabTimer=null;
  var metricsTick=false;
  var restoring=false;

  function readJson(key){try{return JSON.parse(localStorage.getItem(key))||null;}catch(e){return null;}}
  function session(){return readJson(AUTH_STORE);}
  function parseJwt(token){try{var raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');raw=raw.padEnd(Math.ceil(raw.length/4)*4,'=');return JSON.parse(atob(raw));}catch(e){return {};}}
  function userId(){var s=session();return s&&s.access_token?(parseJwt(s.access_token).sub||null):null;}
  function authHeaders(extra){var s=session();return Object.assign({apikey:SUPABASE_KEY,Authorization:'Bearer '+(s&&s.access_token||''),Accept:'application/json'},extra||{});}
  function tell(message){if(!toast)return;toast.textContent=message;toast.classList.add('is-visible');clearTimeout(tell.t);tell.t=setTimeout(function(){toast.classList.remove('is-visible');},2600);}
  function esc(value){return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function suppressLegacyOpening(){
    if(!readerDoc)return;
    var text=(readerDoc.textContent||'').replace(/\s+/g,' ').trim();
    if(/Opening your copy/i.test(text)&&/private ebook/i.test(text)){
      readerDoc.setAttribute('aria-busy','true');
      readerDoc.innerHTML='<div class="reader-native-loader" role="status" aria-label="Loading book"></div>';
    }else if(!/Opening your copy/i.test(text))readerDoc.removeAttribute('aria-busy');
  }

  function currentSequence(){
    var active=document.querySelector('#tocPanel .toc-item.is-active[data-reader-sequence]');
    if(active)return Number(active.dataset.readerSequence)||null;
    var preview=document.querySelector('#tocPanel .toc-item.is-active[data-preview-chapter]');
    if(preview)return Number(preview.dataset.previewChapter)||7;
    return null;
  }
  function chapterTitle(){var h=document.getElementById('chapterTitle');return h&&h.textContent?h.textContent.trim():(document.getElementById('barTitle')||{}).textContent||'Current page';}
  function chapterLabel(){var meta=document.querySelector('#readerDoc .chapter-meta');var seq=currentSequence();if(meta&&meta.textContent&&/chapter/i.test(meta.textContent))return meta.textContent.replace(/\s*·.*$/,'').trim();return seq?'Section '+seq:'Preview';}
  function scrollPercent(){var max=Math.max(0,document.documentElement.scrollHeight-innerHeight);return max?Math.max(0,Math.min(100,(scrollY/max)*100)):0;}
  function devicePage(){
    var usable=Math.max(420,innerHeight-150);
    var total=Math.max(1,Math.ceil(Math.max(document.documentElement.scrollHeight,innerHeight)/usable));
    var current=Math.max(1,Math.min(total,Math.floor(Math.max(0,scrollY)/usable)+1));
    return {current:current,total:total};
  }
  function readableButtons(){return Array.prototype.slice.call(document.querySelectorAll('#tocPanel .toc-item[data-reader-sequence]'));}
  function overallPercent(){
    var rows=readableButtons(),seq=currentSequence(),pct=scrollPercent();
    if(!rows.length||!seq)return pct;
    var i=rows.findIndex(function(b){return Number(b.dataset.readerSequence)===Number(seq);});
    return i<0?pct:Math.max(0,Math.min(100,((i+(pct/100))/rows.length)*100));
  }

  function installStatus(){
    if(document.getElementById('readerBookStatus'))return;
    var el=document.createElement('div');el.className='reader-book-status';el.id='readerBookStatus';el.setAttribute('aria-live','polite');el.innerHTML='<div class="reader-book-status-row"><span class="reader-book-location" id="readerBookLocation">Preview</span><span class="reader-book-page" id="readerBookPage">Page 1 of 1</span></div><div class="reader-book-track" aria-hidden="true"><i id="readerOverallFill"></i></div>';
    var bar=document.getElementById('readerBar');if(bar)bar.insertAdjacentElement('afterend',el);else document.body.prepend(el);
  }

  function installBookmarkButton(){
    if(document.getElementById('readerBookmarkBtn'))return;
    var toc=document.getElementById('tocBtn'),btn=document.createElement('button');btn.type='button';btn.className='bar-btn reader-bookmark-btn';btn.id='readerBookmarkBtn';btn.setAttribute('aria-label','Bookmark this page');btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15l-5.5-3.4-5.5 3.4Z"/></svg>';
    if(toc&&toc.parentNode)toc.parentNode.insertBefore(btn,toc);else(document.getElementById('readerBar')||document.body).appendChild(btn);
    btn.addEventListener('click',saveBookmark);
  }

  function renderMetrics(){
    metricsTick=false;installStatus();
    var page=devicePage(),overall=overallPercent(),loc=document.getElementById('readerBookLocation'),p=document.getElementById('readerBookPage'),fill=document.getElementById('readerOverallFill');
    if(loc)loc.textContent=chapterLabel()+' · '+chapterTitle();
    if(p)p.textContent='Page '+page.current+' of '+page.total+' · '+Math.round(overall)+'%';
    if(fill)fill.style.width=overall.toFixed(2)+'%';
    updateBookmarkState();
    updatePanelSummary();
  }
  function scheduleMetrics(){if(metricsTick)return;metricsTick=true;requestAnimationFrame(renderMetrics);}

  async function loadBookmarks(){
    var uid=userId();if(!uid){bookmarks=[];renderBookmarks();return;}
    try{
      var url=SUPABASE_URL+'/rest/v1/book_reader_bookmarks?select=id,chapter_sequence,scroll_percent,label,created_at,updated_at&user_id=eq.'+encodeURIComponent(uid)+'&book_slug=eq.'+encodeURIComponent(BOOK_SLUG)+'&order=updated_at.desc';
      var r=await fetch(url,{headers:authHeaders(),cache:'no-store'});if(!r.ok)throw new Error('load_failed');bookmarks=await r.json()||[];renderBookmarks();updateBookmarkState();
    }catch(e){bookmarks=[];renderBookmarks('Bookmarks could not be loaded right now.');}
  }

  async function saveBookmark(){
    var uid=userId(),seq=currentSequence();if(!uid){tell('Sign in to your ebook to save bookmarks.');var access=document.getElementById('readerAccessBtn');if(access)access.click();return;}if(!seq){tell('Open a book section first.');return;}
    var pct=Number(scrollPercent().toFixed(2)),label=chapterTitle().slice(0,120),existing=bookmarks.find(function(b){return Number(b.chapter_sequence)===seq&&Math.abs(Number(b.scroll_percent)-pct)<1.5;});
    try{
      var r;
      if(existing){
        r=await fetch(SUPABASE_URL+'/rest/v1/book_reader_bookmarks?id=eq.'+encodeURIComponent(existing.id),{method:'PATCH',headers:authHeaders({'content-type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({scroll_percent:pct,label:label,updated_at:new Date().toISOString()}),cache:'no-store'});
      }else{
        r=await fetch(SUPABASE_URL+'/rest/v1/book_reader_bookmarks',{method:'POST',headers:authHeaders({'content-type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({user_id:uid,book_slug:BOOK_SLUG,chapter_sequence:seq,scroll_percent:pct,label:label}),cache:'no-store'});
      }
      if(!r.ok)throw new Error('save_failed');tell(existing?'Bookmark updated.':'Page bookmarked.');await loadBookmarks();
    }catch(e){tell('Bookmark could not be saved. Please try again.');}
  }

  async function removeBookmark(id){
    if(!id||!userId())return;
    try{var r=await fetch(SUPABASE_URL+'/rest/v1/book_reader_bookmarks?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:authHeaders({Prefer:'return=minimal'}),cache:'no-store'});if(!r.ok)throw new Error('delete_failed');bookmarks=bookmarks.filter(function(b){return b.id!==id;});renderBookmarks();updateBookmarkState();tell('Bookmark removed.');}catch(e){tell('Bookmark could not be removed.');}
  }

  function updateBookmarkState(){
    var btn=document.getElementById('readerBookmarkBtn'),seq=currentSequence(),pct=scrollPercent();if(!btn)return;
    var saved=bookmarks.some(function(b){return Number(b.chapter_sequence)===Number(seq)&&Math.abs(Number(b.scroll_percent)-pct)<3;});
    if(saved)btn.setAttribute('data-saved','');else btn.removeAttribute('data-saved');
    btn.setAttribute('aria-label',saved?'This page is bookmarked':'Bookmark this page');
  }

  function ensureTabs(){
    if(!tocPanel)return;var body=tocPanel.querySelector('.panel-body');if(!body)return;
    if(body.querySelector(':scope > .reader-panel-tabs'))return;
    var old=Array.prototype.slice.call(body.childNodes);body.innerHTML='';
    var tabs=document.createElement('div');tabs.className='reader-panel-tabs';tabs.setAttribute('role','tablist');tabs.innerHTML='<button class="reader-panel-tab" type="button" role="tab" data-reader-tab="contents" aria-selected="true">Contents</button><button class="reader-panel-tab" type="button" role="tab" data-reader-tab="bookmarks" aria-selected="false">Bookmarks</button>';
    var summary=document.createElement('div');summary.className='reader-book-summary';summary.id='readerBookSummary';summary.innerHTML='<div class="reader-book-summary-percent" id="readerSummaryPercent">0%</div><div><strong>Your reading progress</strong><span id="readerSummaryCopy">Page 1</span></div>';
    var contents=document.createElement('div');contents.className='reader-tab-pane';contents.dataset.readerPane='contents';old.forEach(function(n){contents.appendChild(n);});
    var marks=document.createElement('div');marks.className='reader-tab-pane';marks.dataset.readerPane='bookmarks';marks.hidden=true;marks.innerHTML='<div id="readerBookmarks"></div>';
    body.appendChild(tabs);body.appendChild(summary);body.appendChild(contents);body.appendChild(marks);
    tabs.addEventListener('click',function(e){var b=e.target.closest('[data-reader-tab]');if(!b)return;selectTab(b.dataset.readerTab);});
    renderBookmarks();updatePanelSummary();
  }
  function selectTab(name){
    var body=tocPanel&&tocPanel.querySelector('.panel-body');if(!body)return;
    body.querySelectorAll('[data-reader-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.readerTab===name));});
    body.querySelectorAll('[data-reader-pane]').forEach(function(p){p.hidden=p.dataset.readerPane!==name;});
    if(name==='bookmarks')loadBookmarks();
  }
  function scheduleTabs(){clearTimeout(tabTimer);tabTimer=setTimeout(ensureTabs,70);}

  function updatePanelSummary(){
    var percent=document.getElementById('readerSummaryPercent'),copy=document.getElementById('readerSummaryCopy');if(!percent||!copy)return;
    var page=devicePage(),overall=overallPercent();percent.textContent=Math.round(overall)+'%';copy.textContent=chapterLabel()+' · Page '+page.current+' of '+page.total;
  }

  function renderBookmarks(error){
    var host=document.getElementById('readerBookmarks');if(!host)return;
    if(error){host.innerHTML='<p class="reader-bookmarks-empty">'+esc(error)+'</p>';return;}
    if(!userId()){host.innerHTML='<p class="reader-bookmarks-empty">Sign in to your ebook to keep bookmarks across your devices.</p>';return;}
    if(!bookmarks.length){host.innerHTML='<p class="reader-bookmarks-empty">No bookmarks yet. Tap the bookmark icon while reading to save your exact place.</p>';return;}
    host.innerHTML='<div class="reader-bookmark-list">'+bookmarks.map(function(b){var p=Math.max(0,Math.min(100,Number(b.scroll_percent)||0));return '<div class="reader-bookmark-row"><button type="button" class="reader-bookmark-open" data-open-bookmark="'+esc(b.id)+'"><strong>'+esc(b.label||('Section '+b.chapter_sequence))+'</strong><span>Section '+esc(b.chapter_sequence)+' · '+Math.round(p)+'% through this section</span></button><button type="button" class="reader-bookmark-delete" data-delete-bookmark="'+esc(b.id)+'" aria-label="Delete bookmark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.5h6V7m-8 0 1 13h8l1-13M10 10.5v6M14 10.5v6"/></svg></button></div>';}).join('')+'</div>';
    host.querySelectorAll('[data-open-bookmark]').forEach(function(b){b.addEventListener('click',function(){openBookmark(bookmarks.find(function(x){return x.id===b.dataset.openBookmark;}));});});
    host.querySelectorAll('[data-delete-bookmark]').forEach(function(b){b.addEventListener('click',function(){removeBookmark(b.dataset.deleteBookmark);});});
  }

  function openBookmark(mark){
    if(!mark)return;var seq=Number(mark.chapter_sequence),pct=Number(mark.scroll_percent)||0;pendingBookmark={sequence:seq,percent:pct};
    var current=currentSequence();if(current===seq){restoreBookmarkPosition();return;}
    selectTab('contents');var target=tocPanel&&tocPanel.querySelector('[data-reader-sequence="'+seq+'"]');if(target){target.click();}else tell('That bookmarked section is not available right now.');
  }
  function restoreBookmarkPosition(){
    if(!pendingBookmark||restoring)return;var seq=currentSequence();if(Number(seq)!==Number(pendingBookmark.sequence))return;
    restoring=true;var pct=pendingBookmark.percent;pendingBookmark=null;
    setTimeout(function(){var max=Math.max(0,document.documentElement.scrollHeight-innerHeight);scrollTo({top:max*(Math.max(0,Math.min(100,pct))/100),behavior:'smooth'});restoring=false;scheduleMetrics();if(tocPanel&&tocPanel.hasAttribute('data-open')){var close=tocPanel.querySelector('[data-close-panel]');if(close)close.click();}tell('Bookmark opened.');},220);
  }

  function observe(){
    if(readerDoc)new MutationObserver(function(){suppressLegacyOpening();scheduleMetrics();restoreBookmarkPosition();scheduleTabs();}).observe(readerDoc,{childList:true,subtree:true,characterData:true});
    if(tocPanel)new MutationObserver(scheduleTabs).observe(tocPanel,{childList:true,subtree:true});
    addEventListener('scroll',scheduleMetrics,{passive:true});addEventListener('resize',scheduleMetrics,{passive:true});
  }

  installStatus();installBookmarkButton();suppressLegacyOpening();ensureTabs();observe();scheduleMetrics();setTimeout(loadBookmarks,500);setTimeout(scheduleTabs,800);
})();
