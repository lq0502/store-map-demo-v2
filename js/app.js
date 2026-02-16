// js/app.js
import {
  loadItems,
  norm,
  saveItemsCache,
  loadItemsCache,
  getItemsCacheTime,
  saveShelvesCache,
  loadShelvesCache
} from './api.js';

import * as UI from './ui.js';
import { initScanner } from './scanner.js';

// State
let allItems = [];
let selectedCategory = "all";

// 棚座標マップ（例：{"①B2":{x:20.09,y:60.63}, ...}）
let shelvesMap = {};

const $ = (id) => document.getElementById(id);

// ===== 座標解決ヘルパー =====

// 棚キー（例：①B2）から座標を引く。無ければ null
function getShelfPos(key){
  const k = (key ?? "").toString().trim();
  if(!k) return null;
  const pos = shelvesMap[k];
  if(pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y))){
    return { x: Number(pos.x), y: Number(pos.y) };
  }
  return null;
}

// 商品rowから単点座標を解決（area優先→なければrow.x,row.y）
function resolveXY(row){
  const pos = getShelfPos(row.area);
  if(pos) return pos;

  const x = Number(row.x);
  const y = Number(row.y);
  return { x, y };
}

// 商品rowから「範囲」座標も含めて解決
// - area2 があるなら (x2,y2) も作る（棚キー優先→なければrow.x2,row.y2）
function resolveXYWithRange(row){
  const p1 = resolveXY(row);
  const out = { ...p1 };

  const a2 = (row.area2 ?? "").toString().trim();
  if(a2){
    const p2 = getShelfPos(a2);
    if(p2){
      out.x2 = p2.x;
      out.y2 = p2.y;
      return out;
    }
    const x2 = Number(row.x2);
    const y2 = Number(row.y2);
    if(Number.isFinite(x2) && Number.isFinite(y2)){
      out.x2 = x2;
      out.y2 = y2;
    }
  }
  return out;
}

// --- Core Search Logic ---
function runSearch(){
  const q = norm($("q").value);
  const mode = $("mode").value;

  UI.clearPins();
  $("list").innerHTML = "";

  // 1. Filter by Category
  let pool = allItems;
  if (selectedCategory !== "all") {
    pool = pool.filter(r => norm(r.category) === norm(selectedCategory));
  }

  // 2. Filter by Keyword
  let found = pool;
  if (q) {
    found = pool.filter(r => {
      if(mode === "name") return norm(r.name).includes(q);
      if(mode === "category") return norm(r.category).includes(q);
      if(mode === "brand") return norm(r.brand).includes(q);
      if(mode === "keywords") return norm(r.keywords).includes(q);
      return r._index.includes(q);
    });
  }

  // Empty State
  if (!q && selectedCategory === "all") {
    UI.showMessage("カテゴリを選ぶか、検索キーワードを入力してください。");
    return;
  }

  if(found.length === 0){
    UI.showMessage("一致する商品が見つかりませんでした。");
    return;
  }

  // 3. Render（複数ピン表示）
  UI.clearPins();

  // 地図に複数ピン/ライン（重くなるので上限）
  const MAX_PINS = 12;
  found.slice(0, MAX_PINS).forEach(row => {
    const pos = resolveXYWithRange(row);
    // UIは row.x,row.y,row.x2,row.y2 を見るので上書き
    const r = { ...row, ...pos };
    UI.addPin(r);
  });

  // meta は先頭候補を表示
  const firstPos = resolveXYWithRange(found[0]);
  UI.updateMeta({ ...found[0], ...firstPos });

  // Render list（クリックで単一フォーカス）
  UI.renderList(found, (row) => handleResultClick(row));
}

function handleResultClick(row){
  const pos = resolveXYWithRange(row);
  const r = { ...row, ...pos };

  UI.clearPins();
  UI.addPin(r);
  UI.updateMeta(r);
}

function handleCategoryClick(cat){
  selectedCategory = cat;
  UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);
  runSearch();
}

// --- Initialization ---
// 起動を速くするため、まずキャッシュがあればそれで即表示し、裏で最新データを取得する
async function init(force = false){
  if(!force){
    const cached = loadItemsCache();
    if(cached && cached.length){
      allItems = cached;

      // 棚座標もキャッシュがあれば先に復元
      const shel = loadShelvesCache();
      if(shel) shelvesMap = shel;

      UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);

      const t = getItemsCacheTime();
      const dt = t ? new Date(t) : null;
      const timeLabel = dt
        ? `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`
        : "";

      UI.showMessage(`準備OK（キャッシュ${timeLabel ? "：" + timeLabel : ""}）。更新確認中…`);
    }else{
      UI.showMessage("データ読み込み中…");
    }
  }else{
    UI.showMessage("データ読み込み中…");
  }

  // ネットワークから最新を取得（成功したらキャッシュ更新）
  try{
    const out = await loadItems({force});
    allItems = out.items;
    shelvesMap = out.shelvesMap || {};

    saveItemsCache(allItems);
    saveShelvesCache(shelvesMap);

    UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);
    UI.showMessage("準備OK。検索するか、カテゴリを選んでください。");
  }catch(e){
    console.error(e);

    const cached = loadItemsCache();
    if(cached && cached.length){
      allItems = cached;

      const shel = loadShelvesCache();
      if(shel) shelvesMap = shel;

      UI.showMessage("準備OK（キャッシュ）。現在オフラインの可能性があります。");
    }else{
      UI.showMessage("データ取得に失敗しました。");
    }
  }
}

// --- Event Listeners ---
$("btn").addEventListener("click", runSearch);
$("refresh").addEventListener("click", () => init(true));
$("q").addEventListener("keydown", (e) => { if(e.key === "Enter") runSearch(); });

// Init Scanner
initScanner((text) => {
  $("q").value = text;
  runSearch();
});

// PWA Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

// Start
init(false);
