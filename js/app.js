// js/app.js
import { loadItems, norm } from './api.js';
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

  // Update Status text
  const catLabel = (selectedCategory === "all") ? "全て" : selectedCategory;
  const msg = `カテゴリ：<b>${catLabel}</b>${q ? ` / キーワード：<b>${q}</b>` : ""}<br>候補：${found.length}件`;
  // 这里可以只更新文字，不覆盖handleResultClick的结果，所以稍微调整UI逻辑
  // 但简单起见，我们保留在 focusResult 里的更新
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
async function init(force = false){
  try{
    UI.showMessage("データ読み込み中…");
    allItems = await loadItems({force});
    UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);
    UI.showMessage("準備OK。検索するか、カテゴリを選んでください。");
  }catch(e){
    console.error(e);
    UI.showMessage("データ取得に失敗しました。");
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