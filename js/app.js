// js/app.js
// アプリのエントリーポイント
// - api.js から商品データを取得（loadItems）
// - UI描画は ui.js に委譲（ピン/リスト/カテゴリボタン/メッセージ）
// - QR読み取りは scanner.js に委譲（読み取った文字列で検索）

import { loadItems, norm, saveItemsCache, loadItemsCache, getItemsCacheTime } from './api.js';
import * as UI from './ui.js';
import { initScanner } from './scanner.js';

// ===== State（アプリ状態） =====
// 全商品データ（APIから取得した配列）
let allItems = [];
// 現在選択中のカテゴリ（"all" は全カテゴリ）
let selectedCategory = "all";

// document.getElementById の短縮ヘルパー
const $ = (id) => document.getElementById(id);

// --- Core Search Logic ---
// 検索を実行して、地図ピン・結果リスト・メッセージを更新する
function runSearch(){
  // 入力キーワード（小文字化・空白除去などは norm() に統一）
  const q = norm($("q").value);
  // 検索モード（検索対象フィールドの指定）
  const mode = $("mode").value;

  // 既存表示を一旦クリア
  UI.clearPins();
  $("list").innerHTML = "";

  // 1) カテゴリで絞り込み（カテゴリが "all" 以外の時のみ）
  let pool = allItems;
  if (selectedCategory !== "all") {
    pool = pool.filter(r => norm(r.category) === norm(selectedCategory));
  }

  // 2) キーワードで絞り込み（入力がある時のみ）
  // modeに応じて対象フィールドを変える
  let found = pool;
  if (q) {
    found = pool.filter(r => {
      if(mode === "name") return norm(r.name).includes(q);
      if(mode === "category") return norm(r.category).includes(q);
      if(mode === "brand") return norm(r.brand).includes(q);
      if(mode === "keywords") return norm(r.keywords).includes(q);
      // all：_index（複数フィールド結合済み）で横断検索
      return r._index.includes(q);
    });
  }

  // 何も条件がない場合は、操作ガイドを表示して終了
  if (!q && selectedCategory === "all") {
    UI.showMessage("カテゴリを選ぶか、検索キーワードを入力してください。");
    return;
  }

  // ヒットなし
  if(found.length === 0){
    UI.showMessage("一致する商品が見つかりませんでした。");
    return;
  }

  // 3) 描画
  // 先頭の候補を「フォーカス」として地図にピンを置き、metaを更新
  handleResultClick(found[0]); 
  
  // 結果リスト（最大件数は ui.js 側で制限）を描画
  // カードクリックでフォーカス商品を切り替える
  UI.renderList(found, (row) => handleResultClick(row));

  // 検索状態テキスト（必要なら UI に専用エリア/関数を用意して表示）
  const catLabel = (selectedCategory === "all") ? "全て" : selectedCategory;
  const msg = `カテゴリ：<b>${catLabel}</b>${q ? ` / キーワード：<b>${q}</b>` : ""}<br>候補：${found.length}件`;
  // ここでは msg を表示していない（表示場所の設計次第で利用）
}

// 結果の1件を選択（フォーカス）した時の処理
// - ピンを1つだけ表示（いったん全削除）
// - meta に商品情報を表示
function handleResultClick(row){
  UI.clearPins();
  UI.addPin(row);
  UI.updateMeta(row);
}

// カテゴリボタンが押された時の処理
// - 選択カテゴリを更新
// - カテゴリボタンの見た目（active）を再描画
// - 同じ条件で検索を再実行
function handleCategoryClick(cat){
  selectedCategory = cat;
  UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);
  runSearch();
}

// --- Initialization ---
// データ取得＆初期描画
// force=true の場合はキャッシュ無視で取り直す（再読込ボタン用）
async function init(force = false){
  // 1) force でない場合、まずローカルキャッシュで即表示
  if(!force){
    const cached = loadItemsCache();
    if(cached && cached.length){
      allItems = cached;
      UI.renderCategoryButtons(allItems, selectedCategory, handleCategoryClick);

      const t = getItemsCacheTime();
      const dt = t ? new Date(t) : null;
      const timeLabel = dt ? `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}` : "";
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

    // キャッシュ表示後に更新できた場合も、最終的に通常のメッセージに戻す
    UI.showMessage("準備OK。検索するか、カテゴリを選んでください。");
  }catch(e){
    console.error(e);

    // 3) ネット取得に失敗した場合：キャッシュが出ていれば継続、無ければエラー表示
    const cached = loadItemsCache();
    if(cached && cached.length){
      // キャッシュで動作可能：メッセージだけ更新
      UI.showMessage("準備OK（キャッシュ）。現在オフラインの可能性があります。");
    }else{
      UI.showMessage("データ取得に失敗しました。");
    }
  }
}


// --- Event Listeners ---
// 検索ボタン
$("btn").addEventListener("click", runSearch);
// 再読込（force=true で取り直し）
$("refresh").addEventListener("click", () => init(true));
// Enterキーでも検索
$("q").addEventListener("keydown", (e) => { if(e.key === "Enter") runSearch(); });

// QRスキャナ初期化
// 読み取ったテキストを検索欄へ入れて検索実行
initScanner((text) => {
  $("q").value = text;
  runSearch();
});

// PWA Service Worker 登録（対応ブラウザのみ）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

// Start：初回起動（通常取得）
init(false);

