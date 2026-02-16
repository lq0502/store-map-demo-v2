// js/ui.js

// ID取得の短縮関数
const $ = (id) => document.getElementById(id);

// 地図上のすべてのピン/線を削除する関数
export function clearPins(){
  // ピン（点）
  document.querySelectorAll(".pin").forEach(el => el.remove());
  // 範囲表示（線）
  document.querySelectorAll(".rangeLine").forEach(el => el.remove());
}

// 範囲（開始〜終了）を線で表示する（x,y -> x2,y2）
function addRangeLine(row){
  const wrap = $("mapWrap");
  if(!wrap) return;

  const x1 = Number(row.x);
  const y1 = Number(row.y);
  const x2 = Number(row.x2);
  const y2 = Number(row.y2);

  // 数値として成立していない場合は描画しない
  if(!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return;

  // wrapは position:relative 前提（既存CSSにあり）
  const line = document.createElement("div");
  line.className = "rangeLine";

  // 線分ベクトル
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);

  // 0に近い場合は線を出す意味がないのでスキップ
  if(len < 0.001) return;

  // 角度（deg）
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;

  // 見た目（style.cssを触らず、ここで完結）
  // - left/top は開始点
  // - width は距離（%）
  // - transform-origin を左端にして回転
  line.style.position = "absolute";
  line.style.left = `${x1}%`;
  line.style.top  = `${y1}%`;
  line.style.width = `${len}%`;
  line.style.height = "10px";              // 太さ（好みで調整可）
  line.style.borderRadius = "999px";
  line.style.transformOrigin = "0 50%";
  line.style.transform = `translate(0, -50%) rotate(${deg}deg)`;
  line.style.pointerEvents = "none";
  line.style.zIndex = "2";                 // ピンより下にしたい場合は調整

  // “光る” 느낌：淡い発光 + 透明度
  line.style.background = "rgba(0, 180, 255, 0.35)";
  line.style.boxShadow  = "0 0 18px rgba(0, 180, 255, 0.45)";

  // ツールチップ（任意）
  line.title = `${row.name ?? ""}（${row.area ?? ""}〜${row.area2 ?? ""}）`;

  wrap.appendChild(line);
}

// 地図上にピンを1つ追加する関数（ラベル付き）
// - row.x,row.y は必須（%）
// - row.x2,row.y2 があれば、範囲を線で追加表示する
export function addPin(row){
  const wrap = $("mapWrap"); // 地図の親要素
  if(!wrap) return;

  // 先に範囲線（必要なら）を描画
  // ※ピンの前に置くことで、視覚的に「線の上に点」が乗る
  if(row.x2 != null && row.y2 != null){
    addRangeLine(row);
  }

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

  // 地図の要素に追加（rangeLineより上に見せたいので zIndex を少し上げる）
  pin.style.zIndex = "3";
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
