// js/api.js

// Google Apps Script (GAS) のWebアプリURL。ここからJSONデータを取得します。
const API_URL = "https://script.google.com/macros/s/AKfycbx1qC57Bm_ypQJGSNGG8UnHL_KatQncBCNPAjtaK7d5ETO__AHqIu5LV_WrqN_oA6D_gw/exec";

// 文字列を「小文字」に変換し、前後の空白を削除する関数（検索用）
// nullやundefinedが来てもエラーにならないように空文字 "" に変換します
function norm(s){ return (s ?? "").toString().trim().toLowerCase(); }

// 検索対象となるテキストをすべて繋げて、1つの検索用文字列を作る関数
function buildIndex(row){
  // 商品名、カテゴリ、ブランド、別名、場所、メモをすべて結合
  return [row.name, row.category, row.brand, row.keywords, row.area, row.note].map(norm).join(" ");
}

// 数値化（x,y用）
// 文字列でも数値でも受け取り、数値として有効なら返す
function toNum(n){
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

// shelves配列 -> { "①B2": {x:..., y:...}, ... }
function buildShelvesMap(rows){
  const map = {};
  (rows || []).forEach(r => {
    const key = (r.key ?? "").toString().trim();
    const x = toNum(r.x);
    const y = toNum(r.y);
    if(key && x !== null && y !== null){
      map[key] = { x, y };
    }
  });
  return map;
}

// データをAPIから取得する非同期関数
// force=true の場合、キャッシュを無視して最新データを取りに行きます
// 返り値：{ items: [...], shelvesMap: {...} }
export async function loadItems({force=false}={}){
  // fetchを使ってAPIにアクセス
  // cache: "no-store" はキャッシュを使わない設定、"default" は通常通りキャッシュを使う設定
  const res = await fetch(API_URL, { cache: force ? "no-store" : "default" });

  // 通信エラー（404や500など）がないかチェック
  if(!res.ok) throw new Error("API error: " + res.status);

  // レスポンスのJSONデータを解析してJSのオブジェクトに変換
  const data = await res.json();

  // データ形式が正しいかチェック（itemsという配列があるか）
  if(!data.items) throw new Error("Invalid JSON shape");

  // items に検索用 "_index" を付与
  const items = data.items.map(r => ({...r, _index: buildIndex(r)}));

  // shelves（無い場合もあるので安全に）
  const shelvesMap = buildShelvesMap(data.shelves);

  return { items, shelvesMap };
}

// 他のファイルでも使えるように norm 関数をエクスポート
export { norm };


// ===== ローカルキャッシュ（起動高速化用）=====
// - 取得済みデータ（_index付き）を localStorage に保存して次回起動を高速化
// - キャッシュがあれば先に表示し、裏で最新取得して更新する

const LS_KEY_ITEMS = "storemap_items_cache_v1";
const LS_KEY_TIME  = "storemap_items_cache_time_v1";

// 追加：棚番号→座標（shelvesMap）キャッシュ
const LS_KEY_SHELVES = "storemap_shelves_cache_v1";

// キャッシュ保存（itemsは _index 付きの配列を想定）
export function saveItemsCache(items){
  try{
    localStorage.setItem(LS_KEY_ITEMS, JSON.stringify(items));
    localStorage.setItem(LS_KEY_TIME, String(Date.now()));
  }catch(e){
    // 容量超過などは無視（起動は続ける）
  }
}

// キャッシュ読み込み（なければ null）
export function loadItemsCache(){
  try{
    const raw = localStorage.getItem(LS_KEY_ITEMS);
    if(!raw) return null;
    const items = JSON.parse(raw);
    if(!Array.isArray(items)) return null;
    return items;
  }catch(e){
    return null;
  }
}

// キャッシュの保存時刻（表示用）
export function getItemsCacheTime(){
  try{
    const t = Number(localStorage.getItem(LS_KEY_TIME));
    return Number.isFinite(t) ? t : null;
  }catch(e){
    return null;
  }
}

// ===== shelvesMap キャッシュ（棚番号→座標）=====
// shelvesMap 保存（例：{"①A":{x:10,y:20}, ...}）
export function saveShelvesCache(shelvesMap){
  try{
    localStorage.setItem(LS_KEY_SHELVES, JSON.stringify(shelvesMap || {}));
  }catch(e){
    // 容量超過などは無視
  }
}

// shelvesMap 読み込み（なければ null）
export function loadShelvesCache(){
  try{
    const raw = localStorage.getItem(LS_KEY_SHELVES);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return null;
    return obj;
  }catch(e){
    return null;
  }
}
