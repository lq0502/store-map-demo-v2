// js/ui.js

// ID取得の短縮関数
const $ = (id) => document.getElementById(id);

// 地図上のすべてのピンを削除する関数
export function clearPins(){
  // .pin クラスを持つ要素を全て見つけて削除
  document.querySelectorAll(".pin").forEach(el => el.remove());
}

// 地図上にピンを1つ追加する関数
export function addPin(row){
  const wrap = $("mapWrap"); // 地図の親要素
  const pin = document.createElement("div"); // div要素を作成
  pin.className = "pin"; // クラス名を設定（CSSで丸く赤く表示される）
  
  // マウスオーバー時に商品名を表示するツールチップ
  // ?? "" は、row.name が null/undefined なら空文字にするという意味
  pin.title = `${row.name ?? ""}（${row.area ?? ""}）`;
  
  // 座標を設定（%指定）
  pin.style.left = `${Number(row.x)}%`;
  pin.style.top  = `${Number(row.y)}%`;
  
  // 地図の要素に追加
  wrap.appendChild(pin);
}

// 検索結果リストを描画する関数
// found: 見つかったデータの配列, onCardClick: クリック時の処理関数
export function renderList(found, onCardClick){
  const list = $("list");
  list.innerHTML = ""; // 一旦リストを空にする
  
  // 最初から12件だけ表示（多すぎると重くなるため）
  found.slice(0, 12).forEach((row, i) => {
    const div = document.createElement("div"); // カード用のdiv作成
    div.className = "card";
    
    // カードの中身のHTMLを作成（テンプレートリテラル）
    // ?? 演算子でデータがない場合の「未設定」表示などを制御
    div.innerHTML = `
      <strong>${row.name ?? "(名称なし)"}</strong>
      <div class="small">
        <span class="pill">${row.category ?? "カテゴリ未設定"}</span>
        <span class="pill">${row.brand ?? "ブランド未設定"}</span>
      </div>
      <div class="small">場所：${row.area ?? "-"} / 座標：${row.x ?? "-"}, ${row.y ?? "-"}</div>
    `;
    
    // クリックされたら onCardClick を実行
    div.addEventListener("click", () => onCardClick(row, i));
    list.appendChild(div); // 画面に追加
  });
}

// 画面上部のメッセージエリア（「〇〇が見つかりました」）を更新する関数
export function updateMeta(row){
  $("meta").innerHTML =
    `見つかった商品：<b>${row.name ?? "-"}</b><br>` +
    `カテゴリ：${row.category ?? "-"} / ブランド：${row.brand ?? "-"}<br>` +
    `場所：${row.area ?? "-"}${row.note ? "（" + row.note + "）" : ""}`; // メモがあればカッコ書きで追加
}

// 単純なメッセージを表示する汎用関数（エラーや読み込み中など）
export function showMessage(html){
  $("meta").innerHTML = html;
}

// カテゴリボタンの一覧を描画する関数
export function renderCategoryButtons(items, activeCat, onCatClick){
  const bar = $("catBar");
  if(!bar) return; // エレメントがなければ終了

  // 全アイテムからカテゴリ名だけ抜き出し、重複を消して（Set）、あいうえお順にソート
  const cats = Array.from(
    new Set(items.map(r => (r.category ?? "").trim()).filter(Boolean)) // filter(Boolean)で空文字を除去
  ).sort((a,b)=>a.localeCompare(b,"ja")); // 日本語順ソート

  // 先頭に「all（全て）」を追加
  const allCats = ["all", ...cats];
  bar.innerHTML = ""; // 一旦クリア

  // ボタンを一つずつ作成
  allCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    // 現在選択中なら "active" クラスを付けて黒くする
    btn.className = "catBtn" + (activeCat === cat ? " active" : "");
    btn.textContent = (cat === "all") ? "全て" : cat; // "all" の表示名は "全て"
    
    // クリック時の処理を登録
    btn.addEventListener("click", () => onCatClick(cat));
    bar.appendChild(btn); // 画面に追加
  });
}
