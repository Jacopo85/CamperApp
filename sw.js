const CACHE="camper-compagno-shell-v16";
const SHELL=["./","./index.html","./styles.css","./manifest.webmanifest","./guide.js","./vademecum-data.js","./norme-sosta.js","./norme-regionali.js","./route-geo.js","./app.js"];
const FRESH_FILES=new Set(["app.js","route-geo.js","guide.js","vademecum-data.js","norme-sosta.js","norme-regionali.js","styles.css","index.html","manifest.webmanifest"]);

// Warm the offline shell with the newest files instead of the browser's old HTTP cache.
self.addEventListener("install",event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>cache.addAll(SHELL.map(path=>new Request(path,{cache:"reload"}))))
    .then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith("camper-compagno-shell-")&&key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin)return;
  const file=url.pathname.substring(url.pathname.lastIndexOf("/")+1);
  const networkFirst=request.mode==="navigate"||FRESH_FILES.has(file);
  if(networkFirst){
    event.respondWith((async()=>{
      try{
        // Revalidate against GitHub Pages instead of reusing outdated app shell files.
        const response=await fetch(request,{cache:"no-cache"});
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
        }
        return response;
      }catch{
        return await caches.match(request)||Response.error();
      }
    })());
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
    }
    return response;
  })));
});
