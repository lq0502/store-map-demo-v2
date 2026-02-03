// sw.js
// Service Worker（PWA用）
// - 静的ファイルをキャッシュしてオフライン耐性を上げる
// - HTMLは network-first（古い画面が残るのを防ぐ）
// - 画像/CSS/JSなどは stale-while-revalidate（表示は速く、裏で更新）

// キャッシュ名（バージョンを変えるとキャッシュが更新される）
const CACHE_NAME = "store-map-pwa-v4-split"; 

// 事前キャッシュする静的アセット一覧（同一オリジン配下のみ）
// ※外部CDN（例：unpkg）はここに入れず、必要ならローカル化して追加する
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.json",
  "./map.jpg",
  "./icon-192.png",
  "./icon-512.png",
  // 追加ファイル（分割した構成）
  "./css/style.css",
  "./js/app.js",
  "./js/api.js",
  "./js/ui.js",
  "./js/scanner.js",
  // 外部CDNは通常プリキャッシュしない
  // （完全オフライン対応したい場合はローカルに配置してここへ追加）
];


// install: 事前キャッシュを行い、待機せずに即時有効化を狙う
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // 指定名のキャッシュ領域を開く（なければ作成）
    const cache = await caches.open(CACHE_NAME);
    // 事前キャッシュ（オフラインでも読み込めるようにする）
    await cache.addAll(PRECACHE_ASSETS);
    // 新しいSWを waiting を飛ばしてすぐ有効化させる
    await self.skipWaiting();
  })());
});

// activate: 古いキャッシュを削除し、既に開いているページも即座に制御下に置く
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 既存キャッシュ名の一覧を取得
    const keys = await caches.keys();
    // 現在の CACHE_NAME 以外を削除（旧バージョン掃除）
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    // すでに開かれているクライアントにも適用
    await self.clients.claim();
  })());
});

// ===== ヘルパー関数 =====

// network-first：まずネットワークを試し、失敗時にキャッシュへフォールバック
// HTML向き（古いHTMLが残って更新されない問題を減らす）
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // 最新を取りに行く（ブラウザ内蔵キャッシュを使わない）
    const fresh = await fetch(request, { cache: "no-store" });
    // 成功したらキャッシュ更新
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    // ネットワーク失敗時：キャッシュがあれば返す
    const cached = await cache.match(request);
    if (cached) return cached;
    // キャッシュもなければエラーを投げる
    throw e;
  }
}

// stale-while-revalidate：まずキャッシュを返し、裏でネット更新して次回に反映
// 静的資産向き（体感速度を優先しつつ、更新も取り込む）
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // 裏で最新を取得してキャッシュ更新（失敗しても無視）
  const fetchPromise = fetch(request).then((res) => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  // キャッシュがあればそれを即返す。なければネット結果を待つ。
  return cached || (await fetchPromise);
}

// fetch: リクエストごとにキャッシュ戦略を振り分ける
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET以外（POST等）はSWで触らない
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 同一オリジンのみ対象（例：GitHub Pages 配下）
  // 外部APIやCDNはここでは処理しない
  if (url.origin !== self.location.origin) return;

  // HTML判定：画面遷移（navigate）または Accept に text/html が含まれる
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  // HTMLは network-first
  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // その他（CSS/JS/画像など）は stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});
