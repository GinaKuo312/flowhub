// FlowHub Service Worker v2.0
const CACHE_NAME = 'flowhub-v2';
const STATIC_ASSETS = ['/admin.html', '/manifest.json'];

// 安裝：快取靜態資源
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(STATIC_ASSETS).catch(function(){});
    })
  );
});

// 啟動：清除舊快取
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

// 攔截請求：網路優先，失敗用快取
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return;
  var url = new URL(e.request.url);
  // API 請求不快取
  if(url.hostname.includes('supabase.co') ||
     url.hostname.includes('telegram.org')) return;
  
  e.respondWith(
    fetch(e.request).then(function(res){
      // 成功就更新快取
      if(res && res.status===200){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, clone);
        });
      }
      return res;
    }).catch(function(){
      // 網路失敗用快取
      return caches.match(e.request).then(function(cached){
        return cached || new Response(
          '<div style="font:16px sans-serif;text-align:center;padding:40px">'+
          '<h2>⚠️ 離線模式</h2><p>請檢查網路連線後重試</p></div>',
          {headers:{'Content-Type':'text/html;charset=utf-8'}}
        );
      });
    })
  );
});

// 推播通知（預留）
self.addEventListener('push', function(e){
  if(!e.data) return;
  var data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title||'FlowHub', {
      body: data.body||'有新的通知',
      icon: '/manifest.json',
      badge: '/manifest.json',
      tag: 'flowhub-notify',
      renotify: true
    })
  );
});
