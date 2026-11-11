const CACHE = 'alcancia-viva-collaborative-v4';
const SHELL = ['/', '/index.html', '/manifest.json', '/brand/piggy-bank.svg', '/favicon.svg?v=piggy-v1', '/icon-192.png?v=piggy-v1', '/icon-512.png?v=piggy-v1', '/garden/crecimiento.png', '/garden/floreciente.png', '/garden/cosmos-stages.webp', '/garden/courtyard.webp'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k.startsWith('alcancia-viva-')&&k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
   return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));
});
