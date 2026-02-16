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

// データをAPIから取得する非同期関数
// force=true の場合、キャッシュを無視して最新データを取りに行きます
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
  
  // 取得したデータそれぞれに "_index" という検索用の隠し項目を追加して返します
  return data.items.map(r => ({...r, _index: buildIndex(r)}));
}

// 他のファイルでも使えるように norm 関数をエクスポート
export { norm };


// ===== ローカルキャッシュ（起動高速化用）=====
// - 取得済みデータ（_index付き）を localStorage に保存して次回起動を高速化
// - キャッシュがあれば先に表示し、裏で最新取得して更新する

const LS_KEY_ITEMS = "storemap_items_cache_v1";
const LS_KEY_TIME  = "storemap_items_cache_time_v1";

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
