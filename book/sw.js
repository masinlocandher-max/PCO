/*
  Offline shell support for The Right Way to Live.

  Cached: the public campaign/reader shell, styles, scripts, icons, fabric and
  the intentionally public preview already embedded in reader.html.

  Never cached: Supabase Auth responses, entitlement checks, order data, or any
  protected chapter returned by the book API. Protected book text stays network
  only and is delivered chapter by chapter after access is verified.
*/
var VERSION='trwtl-v9';
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

/* The full-access reader already renders Previous / Next controls for every
   chapter. On mobile they used to live only at the end of the chapter, which
   made navigation unnecessarily difficult. This override keeps those controls
   persistently reachable without touching entitlement or chapter delivery. */
var READER_USABILITY_CSS='\n\
@media (max-width:899px){\n\
  body.reader-page:has(.reader-chapter-nav) .reader-main{padding-bottom:calc(154px + env(safe-area-inset-bottom))}\n\
  body.reader-page:has(.reader-chapter-nav).is-immersive .reader-bar{transform:none;opacity:1}\n\
  .reader-chapter-nav{position:fixed;z-index:58;left:10px;right:10px;bottom:calc(8px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr;gap:8px;margin:0;padding:8px;border:1px solid var(--rule);border-radius:22px;background:color-mix(in srgb,var(--paper) 90%,transparent);box-shadow:0 14px 42px rgba(35,22,10,.16),inset 0 1px rgba(255,255,255,.5);-webkit-backdrop-filter:blur(22px) saturate(1.25);backdrop-filter:blur(22px) saturate(1.25)}\n\
  .reader-chapter-nav:has(.reader-nav-secondary){grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr)}\n\
  .reader-nav-button{min-width:0;min-height:58px;padding:9px 12px;border-radius:15px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}\n\
  .reader-nav-button span{margin-bottom:3px;font-size:9px;letter-spacing:.12em}\n\
  .reader-nav-button strong{overflow:hidden;font-size:13.5px;line-height:1.2;white-space:nowrap;text-overflow:ellipsis}\n\
  .reader-nav-primary{box-shadow:0 6px 18px rgba(24,17,12,.16)}\n\
  body.reader-page:has(.reader-chapter-nav) .reader-access-btn{bottom:calc(86px + env(safe-area-inset-bottom))}\n\
  body.reader-page:has(.reader-chapter-nav) .reader-toast,body.reader-page:has(.reader-chapter-nav) .offline-flag{bottom:calc(92px + env(safe-area-inset-bottom))}\n\
}\n\
@media (max-width:380px){\n\
  .reader-chapter-nav{left:7px;right:7px;padding:7px;border-radius:19px}\n\
  .reader-nav-button{min-height:54px;padding:8px 10px;border-radius:13px}\n\
  .reader-nav-button strong{font-size:12.5px}\n\
}\n';

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

function readerCssResponse(response){
  return response.text().then(function(text){
    var headers=new Headers(response.headers);
    headers.set('Content-Type','text/css; charset=utf-8');
    headers['delete']('Content-Length');
    return new Response(text+READER_USABILITY_CSS,{status:response.status,statusText:response.statusText,headers:headers});
  });
}

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(request.method!=='GET')return;

  var url;
  try{url=new URL(request.url);}catch(e){return;}

  if(url.origin===self.location.origin&&/\/book\/reader\.css$/i.test(url.pathname)){
    event.respondWith(
      fetch(request).then(function(response){
        if(!response.ok)throw new Error('reader_css_unavailable');
        return readerCssResponse(response);
      })['catch'](function(){
        return caches.match(request).then(function(hit){return hit?readerCssResponse(hit):Response.error();});
      })
    );
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
