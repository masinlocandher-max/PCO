/*
  The Right Way to Live — public shell service worker.
  Protected chapters, auth, orders, entitlements and Supabase responses are
  deliberately never cached here. The service worker only handles same-origin
  public shell assets and the intentionally public preview.
*/
var VERSION='trwtl-v14';
var SHELL=VERSION+'-shell';
var RUNTIME=VERSION+'-runtime';

var SHELL_URLS=[
  './',
  './index.html',
  './reader.html',
  './payment-success.html',
  './landing.css',
  './reader.css',
  './book.js',
  './paymongo.js',
  './reader.js',
  './manifest.webmanifest',
  './app-icon-192.png',
  './app-icon-512.png',
  './offline.html',
  '../reader-book-ui.js',
  '../reader-book-ui.css',
  '../legal.css',
  '../legal-links.js',
  '../assets/favicon.svg',
  '../assets/img/book-silk-field.webp',
  '../assets/img/book-cover-art.webp',
  '../assets/img/book-hero-portrait.webp'
];

var READER_ENHANCEMENT='\n;(function(){var l=document.getElementById("readerBookUiCss");if(!l){l=document.createElement("link");l.id="readerBookUiCss";l.rel="stylesheet";l.href="/reader-book-ui.css?v=20260907-4";document.head.appendChild(l);}import("/reader-book-ui.js?v=20260907-4").catch(function(){});})();\n';

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(SHELL).then(function(cache){
    return Promise.all(SHELL_URLS.map(function(url){
      return cache.add(new Request(url,{cache:'reload'})).catch(function(){});
    }));
  }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(key){
      if(key!==SHELL&&key!==RUNTIME)return caches.delete(key);
    }));
  }).then(function(){return self.clients.claim();}).then(function(){
    return self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(clients){
      return Promise.all(clients.map(function(client){
        try{var u=new URL(client.url);if(/\/book\/reader\.html$/i.test(u.pathname))return client.navigate(client.url);}catch(e){}
      }));
    });
  }));
});

function withEnhancement(response){
  return response.text().then(function(text){
    var headers=new Headers(response.headers);
    headers.set('Content-Type','text/javascript; charset=utf-8');
    headers.delete('Content-Length');
    return new Response(text+READER_ENHANCEMENT,{status:response.status,statusText:response.statusText,headers:headers});
  });
}

function networkFirst(request,fallback){
  return fetch(request,{cache:'no-store'}).then(function(response){
    if(response&&response.ok){var copy=response.clone();caches.open(RUNTIME).then(function(cache){cache.put(request,copy);});}
    return response;
  }).catch(function(){return caches.match(request).then(function(hit){return hit||caches.match(fallback||'./offline.html');});});
}

self.addEventListener('fetch',function(event){
  var request=event.request;if(request.method!=='GET')return;
  var url;try{url=new URL(request.url);}catch(e){return;}

  if(url.origin!==self.location.origin)return;

  if(/\/book\/reader\.js$/i.test(url.pathname)){
    event.respondWith(fetch(request,{cache:'no-store'}).then(function(response){
      if(!response.ok)throw new Error('reader_js_unavailable');return withEnhancement(response);
    }).catch(function(){return caches.match(request).then(function(hit){return hit?withEnhancement(hit):Response.error();});}));
    return;
  }

  if(request.mode==='navigate'||/\.html$/i.test(url.pathname)){
    event.respondWith(networkFirst(request,'./offline.html'));return;
  }

  if(/\.(?:css|js|webmanifest|png|jpe?g|webp|svg|gif|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith(caches.match(request).then(function(hit){
      var fresh=fetch(request).then(function(response){if(response&&response.ok)caches.open(RUNTIME).then(function(cache){cache.put(request,response.clone());});return response;}).catch(function(){return null;});
      return hit||fresh.then(function(response){return response||Response.error();});
    }));
  }
});

self.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='clear-cache')return;
  event.waitUntil(caches.delete(RUNTIME));
});
