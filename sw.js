// sw.js

// 增加版本号，强制浏览器更新缓存
const CACHE_NAME = "store-map-pwa-v4-split"; 

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.json",
  "./map.jpg",
  "./icon-192.png",
  "./icon-512.png",
  // 新增的文件
  "./css/style.css",
  "./js/app.js",
  "./js/api.js",
  "./js/ui.js",
  "./js/scanner.js",
  // 外部CDN通常建议NetworkFirst或者单独处理，这里先不预缓存外部CDN，
  // 除非你想把jsQR下载到本地（推荐下载到 js/jsQR.js 并引用本地文件）
];


// install: 预缓存 + 立刻进入 waiting -> active
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_ASSETS);
    await self.skipWaiting();
  })());
});

// activate: 清旧缓存 + 立刻接管已打开页面
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

// helpers
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((res) => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  // 先返缓存（如果有），同时后台更新
  return cached || (await fetchPromise);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 只处理同源（GitHub Pages 配下）
  if (url.origin !== self.location.origin) return;

  // HTML：强烈建议 network-first（避免老页面卡住）
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 其他静态资源：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});
