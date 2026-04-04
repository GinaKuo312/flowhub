// FlowHub Service Worker v3.0 - 強制清除舊 cache
const CACHE_NAME = 'flowhub-v3';
const STATIC_ASSETS = ['/admin.html', '/manifest.json'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(STATIC_ASSETS).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k!==CACHE_NAME; })
          .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return;
  var url = new URL(e.request.url);
  if(url.hostname.includes('supabase.co') || url.hostname.includes('telegram.org')) return;
  e.respondWith(
    fetch(e.request).then(function(res){
      if(res && res.status===200){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});
