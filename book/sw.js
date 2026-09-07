/*
  Offline support for The Right Way to Live.

  What is cached: the reading shell — pages, stylesheets, scripts, icons, the
  fabric, the fonts, and the free preview chapter. That is what makes the app
  open and stay readable with no signal.

  What is never cached: anything from the entitlement endpoint, and any chapter
  text it returns. Purchased text is server-owned; writing it into Cache Storage
  would leave a plain-text copy on the device that outlives the purchase. If the
  full book should ever be readable offline, that is a deliberate decision to
  take with the backend, not a side effect of this file.
*/
var VERSION='trwtl-v1';
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
      // addAll is all-or-nothing, so add individually: one 404 must not
      // leave the app with no offline support at all.
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

function isEntitlement(url){
  return url.pathname.indexOf('/entitlement')!==-1||url.pathname.indexOf('/api/')!==-1;
}

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(request.method!=='GET')return;

  var url;
  try{url=new URL(request.url);}catch(e){return;}

  // Purchased content and access checks always go to the network, never to a cache.
  if(isEntitlement(url)){
    event.respondWith(fetch(request));
    return;
  }

  // Pages: fresh when possible, cached copy when not, offline card as a last resort.
  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).then(function(response){
        var copy=response.clone();
        caches.open(RUNTIME).then(function(cache){cache.put(request,copy);});
        return response;
      })['catch'](function(){
        return caches.match(request).then(function(hit){
          return hit||caches.match('./reader.html')||caches.match('./offline.html');
        });
      })
    );
    return;
  }

  if(url.origin!==self.location.origin&&url.hostname.indexOf('fonts.g')===-1)return;

  // Everything else: cached first, then network, refreshing the cache as it goes.
  event.respondWith(
    caches.match(request).then(function(hit){
      var live=fetch(request).then(function(response){
        if(response&&(response.ok||response.type==='opaque')){
          var copy=response.clone();
          caches.open(RUNTIME).then(function(cache){cache.put(request,copy);});
        }
        return response;
      })['catch'](function(){return hit;});
      return hit||live;
    })
  );
});

// Lets the page clear everything when a reader signs out of a shared device.
self.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='clear-cache')return;
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){return caches['delete'](k);}));
  }));
});
