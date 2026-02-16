// js/ui.js

// ID取得の短縮関数
const $ = (id) => document.getElementById(id);

// 地図上のすべてのピンを削除する関数
export function clearPins(){
  // .pin クラスを持つ要素を全て見つけて削除
  document.querySelectorAll(".pin").forEach(el => el.remove());
}

// 地図上にピンを1つ追加する関数（ラベル付き）
export function addPin(row){
  const wrap = $("mapWrap"); // 地図の親要素
  const pin = document.createElement("div"); // div要素を作成
  pin.className = "pin"; // CSSで丸く赤く表示される

  // マウスオーバー時のツールチップ
  pin.title = `${row.name ?? ""}（${row.area ?? ""}）`;

  // 座標を設定（%指定）
  pin.style.left = `${Number(row.x)}%`;
  pin.style.top  = `${Number(row.y)}%`;

  // --- ラベル（地図上に文字を出す） ---
  // 表示文字：label があれば label、なければ name
  const labelText = (row.label ?? row.name ?? "").toString().trim();
  if(labelText){
    const label = document.createElement("div");
    label.className = "pinLabel";
    label.textContent = labelText;

    // ここで最低限の見た目を付ける（style.cssを触らずにui.jsだけで完結）
    // ※既存の .pin の transform を壊さないように、ラベルは子要素として配置する
    label.style.position = "absolute";
    label.style.left = "12px";     // ピンの右側へ
    label.style.top  = "-6px";     // 少し上へ
    label.style.padding = "4px 8px";
    label.style.borderRadius = "999px";
    label.style.border = "1px solid #eee";
    label.style.background = "rgba(255,255,255,.92)";
    label.style.boxShadow = "0 8px 16px rgba(0,0,0,.12)";
    label.style.fontSize = "12px";
    label.style.color = "#111";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none"; // ラベルでクリック判定を邪魔しない

    pin.appendChild(label);
  }

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
    `場所：${row.area ?? "-"}${row.note ? "（" + row.note + "）" : ""}`;
}

// 単純なメッセージを表示する汎用関数（エラーや読み込み中など）
export function showMessage(html){
  $("meta").innerHTML = html;
}

// カテゴリボタンの一覧を描画する関数
export function renderCategoryButtons(items, activeCat, onCatClick){
  const bar = $("catBar");
  if(!bar) return;

  const cats = Array.from(
    new Set(items.map(r => (r.category ?? "").trim()).filter(Boolean))
  ).sort((a,b)=>a.localeCompare(b,"ja"));

  const allCats = ["all", ...cats];
  bar.innerHTML = "";

  allCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "catBtn" + (activeCat === cat ? " active" : "");
    btn.textContent = (cat === "all") ? "全て" : cat;

    btn.addEventListener("click", () => onCatClick(cat));
    bar.appendChild(btn);
  });
}
