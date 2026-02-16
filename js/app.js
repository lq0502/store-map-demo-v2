// js/app.js
import { loadItems, norm, saveItemsCache, loadItemsCache, getItemsCacheTime } from './api.js';
import * as UI from './ui.js';
import { initScanner } from './scanner.js';

// State
let allItems = [];
let selectedCategory = "all";

const $ = (id) => document.getElementById(id);

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

  // 3. Render
  // Focus first item
  handleResultClick(found[0]); 
  
  // Render list
  UI.renderList(found, (row) => handleResultClick(row));

  // Update Status text（必要ならUI側に表示領域を用意して使う）
  const catLabel = (selectedCategory === "all") ? "全て" : selectedCategory;
  const msg = `カテゴリ：<b>${catLabel}</b>${q ? ` / キーワード：<b>${q}</b>` : ""}<br>候補：${found.length}件`;
  // 現状は msg を表示していない
}

function handleResultClick(row){
  UI.clearPins();
  UI.addPin(row);
  UI.updateMeta(row);
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
    const fresh = await loadItems({force});
    allItems = fresh;
    saveItemsCache(fresh);

    UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);
    UI.showMessage("準備OK。検索するか、カテゴリを選んでください。");
  }catch(e){
    console.error(e);

    // 3) ネット取得に失敗：キャッシュがあれば継続、無ければエラー表示
    const cached = loadItemsCache();
    if(cached && cached.length){
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
