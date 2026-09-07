/*
  Offline shell support for The Right Way to Live.

  Cached: the public campaign/reader shell, styles, scripts, icons, fabric and
  the intentionally public preview already embedded in reader.html.

  Never cached: Supabase Auth responses, entitlement checks, order data, or any
  protected chapter returned by the book API. Protected book text stays network
  only and is delivered chapter by chapter after access is verified.
*/
var VERSION='trwtl-v10';
var SHELL=VERSION+'-shell';
var RUNTIME=VERSION+'-runtime';

var SHELL_URLS=[
  './',
  './index.html',
  './reader.html',
  './landing.css',
  './scroll-fix.css',
  './reader.css',
  './book.js',
  './reader.js',
  '../legal.css',
  '../legal-links.js',
  './manifest.webmanifest',
  './app-icon-192.png',
  './app-icon-512.png',
  './offline.html',
  '../assets/favicon.svg',
  '../assets/img/book-silk-field.webp',
  '../assets/img/book-cover-art.webp',
  '../assets/img/book-hero-portrait.webp'
];

/* Mobile reader usability layer. The protected text/API stay untouched. */
var READER_USABILITY_CSS='\n\
@media (max-width:899px){\n\
  body.reader-page.reader-modern-ready .reader-main{padding-bottom:calc(172px + env(safe-area-inset-bottom))}\n\
  body.reader-page.reader-modern-ready.is-immersive .reader-bar{transform:none;opacity:1}\n\
  body.reader-page.reader-modern-ready .reader-bar{height:58px;padding:0 10px;background:color-mix(in srgb,var(--paper) 82%,transparent);border-bottom-color:color-mix(in srgb,var(--rule) 70%,transparent);-webkit-backdrop-filter:blur(24px) saturate(1.35);backdrop-filter:blur(24px) saturate(1.35)}\n\
  body.reader-page.reader-modern-ready .bar-btn{width:46px;height:46px;border-radius:15px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}\n\
  body.reader-page.reader-modern-ready .bar-btn:active{transform:scale(.94);background:var(--raise)}\n\
  body.reader-page.reader-modern-ready .bar-title{font-size:14px;letter-spacing:-.01em}\n\
  .reader-chapter-nav{position:fixed;z-index:58;left:10px;right:10px;bottom:calc(8px + env(safe-area-inset-bottom));display:grid;grid-template-columns:minmax(0,.72fr) 54px minmax(0,1.28fr);gap:7px;margin:0;padding:26px 8px 8px;border:1px solid color-mix(in srgb,var(--rule) 82%,transparent);border-radius:24px;background:color-mix(in srgb,var(--paper) 88%,transparent);box-shadow:0 18px 50px rgba(35,22,10,.16),inset 0 1px rgba(255,255,255,.62);-webkit-backdrop-filter:blur(26px) saturate(1.35);backdrop-filter:blur(26px) saturate(1.35)}\n\
  .reader-dock-meta{position:absolute;top:7px;left:14px;right:14px;display:flex;align-items:center;justify-content:center;min-width:0;font:600 9px/1.2 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n\
  .reader-nav-button{min-width:0;min-height:60px;padding:9px 11px;border-radius:16px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .2s cubic-bezier(.16,1,.3,1),opacity .2s ease,box-shadow .2s ease}\n\
  .reader-nav-button span{margin-bottom:3px;font-size:8.8px;letter-spacing:.11em}\n\
  .reader-nav-button strong{overflow:hidden;font-size:13.5px;line-height:1.2;white-space:nowrap;text-overflow:ellipsis}\n\
  .reader-nav-primary{box-shadow:0 8px 22px rgba(24,17,12,.18)}\n\
  .reader-nav-primary:active,.reader-nav-secondary:active{transform:scale(.965)}\n\
  .reader-nav-contents{display:grid;place-items:center;min-width:0;min-height:60px;padding:0;border:1px solid var(--rule);border-radius:16px;background:var(--raise);color:var(--ink);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}\n\
  .reader-nav-contents:active{transform:scale(.94)}\n\
  .reader-nav-contents svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n\
  .reader-chapter-nav[data-no-prev] .reader-nav-contents{grid-column:1}\n\
  .reader-chapter-nav[data-no-prev] .reader-nav-primary{grid-column:2/4}\n\
  .reader-chapter-nav[data-finished] .reader-nav-secondary{grid-column:1/3}\n\
  .reader-chapter-nav[data-finished] .reader-nav-contents{grid-column:3}\n\
  body.reader-nav-busy .reader-chapter-nav{pointer-events:none}\n\
  body.reader-nav-busy .reader-chapter-nav>*{opacity:.62}\n\
  body.reader-nav-busy .reader-nav-primary{opacity:1;transform:scale(.985)}\n\
  body.reader-page.reader-modern-ready .reader-access-btn{bottom:calc(104px + env(safe-area-inset-bottom));right:14px;padding:9px 12px;background:color-mix(in srgb,var(--paper) 88%,transparent);border-color:var(--rule);box-shadow:0 10px 28px rgba(35,22,10,.1);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}\n\
  body.reader-page.reader-modern-ready .reader-toast,body.reader-page.reader-modern-ready .offline-flag{bottom:calc(112px + env(safe-area-inset-bottom))}\n\
  .reader-swipe-cue{position:fixed;z-index:74;left:50%;bottom:calc(110px + env(safe-area-inset-bottom));transform:translate(-50%,12px);opacity:0;pointer-events:none;max-width:calc(100vw - 34px);padding:9px 14px;border:1px solid color-mix(in srgb,var(--rule) 70%,transparent);border-radius:999px;background:color-mix(in srgb,var(--paper) 88%,transparent);box-shadow:0 12px 32px rgba(35,22,10,.12);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);font:600 11px/1.25 var(--sans);color:var(--ink-soft);white-space:nowrap;transition:opacity .28s ease,transform .36s cubic-bezier(.16,1,.3,1)}\n\
  .reader-swipe-cue[data-show]{opacity:1;transform:translate(-50%,0)}\n\
}\n\
@media (max-width:380px){\n\
  .reader-chapter-nav{left:7px;right:7px;grid-template-columns:minmax(0,.68fr) 50px minmax(0,1.32fr);padding:25px 7px 7px;border-radius:21px}\n\
  .reader-nav-button,.reader-nav-contents{min-height:56px;border-radius:14px}\n\
  .reader-nav-button{padding:8px 9px}\n\
  .reader-nav-button strong{font-size:12.4px}\n\
}\n\
@media (prefers-reduced-motion:no-preference){\n\
  body[data-reader-direction="next"] .reader-doc.reader-enter{animation:fmb-reader-next-in .42s cubic-bezier(.16,1,.3,1) both}\n\
  body[data-reader-direction="prev"] .reader-doc.reader-enter{animation:fmb-reader-prev-in .42s cubic-bezier(.16,1,.3,1) both}\n\
  @keyframes fmb-reader-next-in{from{opacity:0;transform:translate3d(22px,0,0);filter:blur(1.5px)}to{opacity:1;transform:none;filter:none}}\n\
  @keyframes fmb-reader-prev-in{from{opacity:0;transform:translate3d(-22px,0,0);filter:blur(1.5px)}to{opacity:1;transform:none;filter:none}}\n\
}\n';

var READER_USABILITY_JS='\n;(function(){\n  if(window.__FMB_READER_MODERN_V2)return;window.__FMB_READER_MODERN_V2=true;\n  var body=document.body,doc=document.getElementById("readerDoc"),touch=null,busyTimer=null;\n  if(!body||!doc)return;body.classList.add("reader-modern-ready");\n  function chapterButtons(){return Array.prototype.slice.call(document.querySelectorAll("#tocPanel .toc-item[data-reader-sequence]"));}\n  function activeIndex(){var rows=chapterButtons(),active=document.querySelector("#tocPanel .toc-item.is-active[data-reader-sequence]");return active?rows.indexOf(active):-1;}\n  function panelsOpen(){return !!document.querySelector(".panel[data-open],.reader-auth[data-open],.install-invite[data-show]");}\n  function haptic(){try{if(navigator.vibrate)navigator.vibrate(8);}catch(e){}}\n  function markBusy(direction){body.dataset.readerDirection=direction;body.classList.add("reader-nav-busy");clearTimeout(busyTimer);busyTimer=setTimeout(function(){body.classList.remove("reader-nav-busy")},1800);}\n  function goChapter(delta){var rows=chapterButtons(),i=activeIndex(),target=rows[i+delta];if(i<0||!target)return false;markBusy(delta>0?"next":"prev");haptic();target.click();return true;}\n  function pageStep(delta){var max=Math.max(0,document.documentElement.scrollHeight-innerHeight),nearBottom=max-scrollY<Math.max(80,innerHeight*.16),nearTop=scrollY<80;if(delta>0&&nearBottom)return goChapter(1);if(delta<0&&nearTop)return goChapter(-1);scrollBy({top:delta*innerHeight*.82,behavior:"smooth"});haptic();return true;}\n  function addContents(nav){if(!nav||nav.querySelector(".reader-nav-contents"))return;var primary=nav.querySelector(".reader-nav-primary"),secondary=nav.querySelector(".reader-nav-secondary");var btn=document.createElement("button");btn.type="button";btn.className="reader-nav-contents";btn.setAttribute("aria-label","Open contents");btn.innerHTML="<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 6.5h14M5 12h14M5 17.5h14\"/></svg>";btn.addEventListener("click",function(){var toc=document.getElementById("tocBtn");if(toc)toc.click();});if(primary)nav.insertBefore(btn,primary);else nav.appendChild(btn);if(!secondary)nav.setAttribute("data-no-prev","");if(primary&&primary.textContent.indexOf("Finished")>=0)nav.setAttribute("data-finished","");}\n  function addMeta(nav){if(!nav||nav.querySelector(".reader-dock-meta"))return;var rows=chapterButtons(),i=activeIndex();if(i<0||!rows.length)return;var meta=document.createElement("div");meta.className="reader-dock-meta";meta.textContent="Chapter "+(i+1)+" of "+rows.length;nav.insertBefore(meta,nav.firstChild);}\n  function enhance(){var nav=doc.querySelector(".reader-chapter-nav");if(nav){addContents(nav);addMeta(nav);}body.classList.remove("reader-nav-busy");}\n  new MutationObserver(function(){requestAnimationFrame(enhance);}).observe(doc,{childList:true,subtree:true});\n  document.addEventListener("click",function(e){var next=e.target.closest&&e.target.closest(".reader-nav-primary"),prev=e.target.closest&&e.target.closest(".reader-nav-secondary");if(next)markBusy("next");else if(prev)markBusy("prev");},true);\n  doc.addEventListener("touchstart",function(e){if(panelsOpen()||e.touches.length!==1)return;var t=e.touches[0];if(t.clientX<28||t.clientX>innerWidth-28)return;touch={x:t.clientX,y:t.clientY,time:Date.now()};},{passive:true});\n  doc.addEventListener("touchend",function(e){if(!touch||panelsOpen())return;var t=e.changedTouches&&e.changedTouches[0];if(!t){touch=null;return;}var dx=t.clientX-touch.x,dy=t.clientY-touch.y,dt=Date.now()-touch.time;touch=null;if(dt>760||Math.abs(dx)<68||Math.abs(dx)<Math.abs(dy)*1.35)return;pageStep(dx<0?1:-1);},{passive:true});\n  document.addEventListener("keydown",function(e){if(panelsOpen()||e.altKey||e.metaKey||e.ctrlKey)return;var tag=(e.target&&e.target.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select")return;if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();pageStep(1);}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();pageStep(-1);}});\n  function hint(){try{if(localStorage.getItem("trwtl.reader-swipe-hint.v2"))return;localStorage.setItem("trwtl.reader-swipe-hint.v2","1");}catch(e){}if(activeIndex()<0)return;var cue=document.createElement("div");cue.className="reader-swipe-cue";cue.textContent="Swipe left or right to move through the book";document.body.appendChild(cue);setTimeout(function(){cue.setAttribute("data-show","")},500);setTimeout(function(){cue.removeAttribute("data-show")},4300);setTimeout(function(){cue.remove()},5000);}\n  enhance();setTimeout(enhance,650);setTimeout(hint,1400);\n})();\n';

self.addEventListener('install',function(event){
  event.waitUntil(
    caches.open(SHELL).then(function(cache){
      return Promise.all(SHELL_URLS.map(function(url){
        return cache.add(new Request(url,{cache:'reload'}))['catch'](function(){});
      }));
    }).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if(key!==SHELL&&key!==RUNTIME)return caches['delete'](key);
      }));
    }).then(function(){return self.clients.claim();})
  );
});

var CACHEABLE=/\.(?:html|css|js|webmanifest|png|jpe?g|webp|svg|gif|ico|woff2?)$/i;

function mayCache(url,response){
  if(url.origin!==self.location.origin&&url.hostname.indexOf('fonts.g')===-1)return false;
  if(!CACHEABLE.test(url.pathname))return false;
  if(response){
    var control=response.headers.get('Cache-Control')||'';
    if(/no-store|private/i.test(control))return false;
  }
  return true;
}

function appendTextResponse(response,extra,type){
  return response.text().then(function(text){
    var headers=new Headers(response.headers);
    headers.set('Content-Type',type+'; charset=utf-8');
    headers['delete']('Content-Length');
    return new Response(text+extra,{status:response.status,statusText:response.statusText,headers:headers});
  });
}

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(request.method!=='GET')return;

  var url;
  try{url=new URL(request.url);}catch(e){return;}

  if(url.origin===self.location.origin&&/\/book\/reader\.css$/i.test(url.pathname)){
    event.respondWith(fetch(request).then(function(response){
      if(!response.ok)throw new Error('reader_css_unavailable');
      return appendTextResponse(response,READER_USABILITY_CSS,'text/css');
    })['catch'](function(){
      return caches.match(request).then(function(hit){return hit?appendTextResponse(hit,READER_USABILITY_CSS,'text/css'):Response.error();});
    }));
    return;
  }

  if(url.origin===self.location.origin&&/\/book\/reader\.js$/i.test(url.pathname)){
    event.respondWith(fetch(request).then(function(response){
      if(!response.ok)throw new Error('reader_js_unavailable');
      return appendTextResponse(response,READER_USABILITY_JS,'text/javascript');
    })['catch'](function(){
      return caches.match(request).then(function(hit){return hit?appendTextResponse(hit,READER_USABILITY_JS,'text/javascript'):Response.error();});
    }));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).then(function(response){
        if(mayCache(url,response)){
          var copy=response.clone();
          caches.open(RUNTIME).then(function(cache){cache.put(request,copy);});
        }
        return response;
      })['catch'](function(){
        return caches.match(request).then(function(hit){
          return hit||caches.match('./reader.html')||caches.match('./offline.html');
        });
      })
    );
    return;
  }

  /* Cross-origin Supabase requests and all non-static response shapes are
     network-only. No access token or protected chapter enters Cache Storage. */
  if(!mayCache(url)){
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(function(hit){
      var live=fetch(request).then(function(response){
        if(response&&(response.ok||response.type==='opaque')&&mayCache(url,response)){
          var copy=response.clone();
          caches.open(RUNTIME).then(function(cache){cache.put(request,copy);});
        }
        return response;
      })['catch'](function(){return hit;});
      return hit||live;
    })
  );
});

self.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='clear-cache')return;
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){return caches['delete'](k);}));
  }));
});