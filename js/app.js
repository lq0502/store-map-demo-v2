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

// row（商品）から最終座標を解決する
// ルール：row.area に棚キー（例：①B2）が入っていれば shelvesMap を優先
// 見つからなければ従来の row.x,row.y を使う（互換）
function resolveXY(row){
  const key = (row.area ?? "").toString().trim();
  const pos = shelvesMap[key];
  if(pos) return pos;
  return { x: Number(row.x), y: Number(row.y) };
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

  // 地図に複数ピン（重くなるので上限）
  const MAX_PINS = 12;
  found.slice(0, MAX_PINS).forEach(row => {
    const pos = resolveXY(row);
    const r = { ...row, x: pos.x, y: pos.y }; // UIは row.x,row.y を使う
    UI.addPin(r);
  });

  // meta は先頭候補を表示（後で「候補◯件」などに拡張可）
  const firstPos = resolveXY(found[0]);
  UI.updateMeta({ ...found[0], x: firstPos.x, y: firstPos.y });

  // Render list（クリックで単一フォーカス）
  UI.renderList(found, (row) => handleResultClick(row));

  // Update Status text（必要ならUI側に表示領域を用意して使う）
  const catLabel = (selectedCategory === "all") ? "全て" : selectedCategory;
  const msg = `カテゴリ：<b>${catLabel}</b>${q ? ` / キーワード：<b>${q}</b>` : ""}<br>候補：${found.length}件`;
  // 現状は msg を表示していない
}

function handleResultClick(row){
  const pos = resolveXY(row);
  const r = { ...row, x: pos.x, y: pos.y };

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
  // 1) force=false の時は、まずローカルキャッシュを試す
  if(!force){
    const cached = loadItemsCache();
    if(cached && cached.length){
      allItems = cached;

      // 棚座標もキャッシュがあれば先に復元（起動直後でも①A等が光る）
      const shel = loadShelvesCache();
      if(shel) shelvesMap = shel;

      UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);

      const t = getItemsCacheTime();
      const dt = t ? new Date(t) : null;
      const timeLabel = dt
        ? `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`
        : "";

      UI.showMessage(`準備OK（キャッシュ${timeLabel ? "：" + timeLabel : ""}）。更新確認中…`);
      // ここで return しない：裏で最新データを取りに行く
    }else{
      UI.showMessage("データ読み込み中…");
    }
  }else{
    UI.showMessage("データ読み込み中…");
  }

  // 2) ネットワークから最新を取得（成功したらキャッシュ更新）
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

    // 3) ネット取得に失敗：キャッシュがあれば継続、無ければエラー表示
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
