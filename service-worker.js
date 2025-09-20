
const CACHE = "rotawave-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
];
self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k))))
  );
});
self.addEventListener("fetch", (e)=>{
  const url = new URL(e.request.url);
  if(ASSETS.includes(url.href) || ASSETS.includes(url.pathname)){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));
  }
});
