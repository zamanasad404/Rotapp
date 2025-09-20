
const CACHE = "rotawave-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=4",
  "./app.js?v=4",
  "./manifest.webmanifest?v=4",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
  "./icons/favicon.ico",
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
  if(ASSETS.includes(url.href) || ASSETS.includes(url.pathname) || ASSETS.includes(url.pathname + url.search)){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));
  }
});
