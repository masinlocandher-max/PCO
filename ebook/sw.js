var CACHE='trwtl-ebook-app-v1';
var SHELL=['./','./index.html','./app.js','./manifest.webmanifest','../assets/favicon.svg','../book/app-icon-192.png','../book/app-icon-512.png','../book/app-icon-maskable.png','../book/app-icon-apple.png'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(cache){return Promise.all(SHELL.map(function(url){return cache.add(new Request(url,{cache:'reload'})).catch(function(){});}));}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(key){if(key!==CACHE)return caches.delete(key);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(event){
  var req=event.request;if(req.method!=='GET')return;
  var url;try{url=new URL(req.url);}catch(e){return;}
  if(url.origin!==self.location.origin){event.respondWith(fetch(req));return;}
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(function(r){var copy=r.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});return r;}).catch(function(){return caches.match('./index.html');}));return;
  }
  if(/\.(?:js|webmanifest|png|svg|ico)$/i.test(url.pathname))event.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(r){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});return r;});}));
});
