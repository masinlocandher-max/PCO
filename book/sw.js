/*
  Offline shell support for The Right Way to Live.

  Cached: the public campaign/reader shell, styles, scripts, icons, fabric and
  the intentionally public preview already embedded in reader.html.

  Never cached: Supabase Auth responses, entitlement checks, order data, or any
  protected chapter returned by the book API. Protected book text stays network
  only and is delivered chapter by chapter after access is verified.
*/
var VERSION='trwtl-v6';
var SHELL=VERSION+'-shell';
var RUNTIME=VERSION+'-runtime';

var SHELL_URLS=[
  './',
  './index.html',
  './reader.html',
  './landing.css',
  '../book-mobile-polish.css',
  './scroll-fix.css',
  './reader.css',
  './book.js',
  './reader.js',
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

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(request.method!=='GET')return;

  var url;
  try{url=new URL(request.url);}catch(e){return;}

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
