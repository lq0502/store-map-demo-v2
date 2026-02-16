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

  // 線分ベクトル
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);

  // 0に近い場合は線を出す意味がないのでスキップ
  if(len < 0.001) return;

  // 角度（deg）
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;

  const line = document.createElement("div");
  line.className = "rangeLine";

  // 見た目（style.cssを触らず、ここで完結）
  line.style.position = "absolute";
  line.style.left = `${x1}%`;
  line.style.top  = `${y1}%`;
  line.style.width = `${len}%`;

  // ★ここがポイント：太さ＆発光を控えめにして「隣のマスまで光って見える」現象を減らす
  line.style.height = "6px";                 // 太さ（10px→6px）
  line.style.borderRadius = "999px";

  line.style.transformOrigin = "0 50%";
  line.style.transform = `translateY(-50%) rotate(${deg}deg)`; // translate(0,-50%) と同等

  line.style.pointerEvents = "none";
  line.style.zIndex = "2";

  // “光る” 느낌：淡い発光 + 透明度（控えめ）
  line.style.background = "rgba(0, 180, 255, 0.30)";          // 少し薄く
  line.style.boxShadow  = "0 0 10px rgba(0, 180, 255, 0.35)"; // 18px→10px

  // ツールチップ（任意）
  line.title = `${row.name ?? ""}（${row.area ?? ""}〜${row.area2 ?? ""}）`;

  wrap.appendChild(line);
}

// 地図上にピンを1つ追加する関数（ラベル付き）
// - row.x,row.y は必須（%）
// - row.x2,row.y2 があれば、範囲を線で追加表示する
export function addPin(row){
  const wrap = $("mapWrap");
  if(!wrap) return;

  // 先に範囲線（必要なら）を描画
  if(row.x2 != null && row.y2 != null){
    addRangeLine(row);
  }

  const pin = document.createElement("div");
  pin.className = "pin";

  // マウスオーバー時のツールチップ
  pin.title = `${row.name ?? ""}（${row.area ?? ""}）`;

  // 座標を設定（%指定）
  pin.style.left = `${Number(row.x)}%`;
  pin.style.top  = `${Number(row.y)}%`;

  // --- ラベル（地図上に文字を出す） ---
  const labelText = (row.label ?? row.name ?? "").toString().trim();
  if(labelText){
    const label = document.createElement("div");
    label.className = "pinLabel";
    label.textContent = labelText;

    label.style.position = "absolute";
    label.style.left = "12px";
    label.style.top  = "-6px";
    label.style.padding = "4px 8px";
    label.style.borderRadius = "999px";
    label.style.border = "1px solid #eee";
    label.style.background = "rgba(255,255,255,.92)";
    label.style.boxShadow = "0 8px 16px rgba(0,0,0,.12)";
    label.style.fontSize = "12px";
    label.style.color = "#111";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none";

    pin.appendChild(label);
  }

  pin.style.zIndex = "3";
  wrap.appendChild(pin);
}

// 検索結果リストを描画する関数
export function renderList(found, onCardClick){
  const list = $("list");
  list.innerHTML = "";

  found.slice(0, 12).forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <strong>${row.name ?? "(名称なし)"}</strong>
      <div class="small">
        <span class="pill">${row.category ?? "カテゴリ未設定"}</span>
        <span class="pill">${row.brand ?? "ブランド未設定"}</span>
      </div>
      <div class="small">場所：${row.area ?? "-"} / 座標：${row.x ?? "-"}, ${row.y ?? "-"}</div>
    `;

    div.addEventListener("click", () => onCardClick(row, i));
    list.appendChild(div);
  });
}

// メッセージ更新
export function updateMeta(row){
  $("meta").innerHTML =
    `見つかった商品：<b>${row.name ?? "-"}</b><br>` +
    `カテゴリ：${row.category ?? "-"} / ブランド：${row.brand ?? "-"}<br>` +
    `場所：${row.area ?? "-"}${row.note ? "（" + row.note + "）" : ""}`;
}

export function showMessage(html){
  $("meta").innerHTML = html;
}

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
