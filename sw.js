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

// ... (其余 sw.js 代码保持不变)