/*
  The Right Way to Live — ebook app shell.

  This worker caches the SHELL only: the page, its icons and the fabric image.

  It must never see a chapter. Chapter text, entitlement checks and reading
  progress all go to the Supabase function over POST on another origin, and both
  of those are excluded below — cross-origin first, then anything that is not a
  GET. Two guards rather than one, because the cost of getting this wrong is the
  manuscript sitting in a cache on a device that no longer has access to it.
*/
var VERSION = 'trwtl-ebook-v1';
var SHELL = VERSION + '-shell';

var SHELL_URLS = [
  '/ebook/',
  '/ebook/index.html',
  '/ebook/manifest.webmanifest',
  '/assets/favicon.svg',
  '/assets/img/book-silk-field.webp',
  '/book/app-icon-192.png',
  '/book/app-icon-512.png',
  '/book/app-icon-apple.png',
  '/book/app-icon-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return Promise.all(SHELL_URLS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' }))['catch'](function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== SHELL && key.indexOf('trwtl-ebook-') === 0) return caches['delete'](key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Guard one: never a write, never anything but a plain read.
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  // Guard two: never another origin. The book itself lives on one.
  if (url.origin !== self.location.origin) return;

  // Only this app's own shell.
  if (url.pathname.indexOf('/ebook/') !== 0 &&
      url.pathname.indexOf('/assets/') !== 0 &&
      url.pathname.indexOf('/book/app-icon') !== 0) return;

  // The page itself is always fetched fresh when there is a network, so a
  // repaired build reaches an installed reader on their next open.
  if (request.mode === 'navigate' || /\.html$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(SHELL).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      })['catch'](function () {
        return caches.match(request).then(function (hit) {
          return hit || caches.match('/ebook/index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      var fresh = fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(SHELL).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      })['catch'](function () { return null; });
      return hit || fresh.then(function (response) { return response || Response.error(); });
    })
  );
});
