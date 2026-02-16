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
// ★重要：%ではなく「px」で線を描く（縦横比でズレない）
function addRangeLine(row){
  const wrap = $("mapWrap");
  if(!wrap) return;

  const x1p = Number(row.x);
  const y1p = Number(row.y);
  const x2p = Number(row.x2);
  const y2p = Number(row.y2);

  // 数値として成立していない場合は描画しない
  if(!Number.isFinite(x1p) || !Number.isFinite(y1p) || !Number.isFinite(x2p) || !Number.isFinite(y2p)) return;

  // % → px（ここがズレの根本対策）
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  if(!W || !H) return;

  const x1 = (x1p / 100) * W;
  const y1 = (y1p / 100) * H;
  const x2 = (x2p / 100) * W;
  const y2 = (y2p / 100) * H;

  // 線分ベクトル（px）
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);

  // 0に近い場合はスキップ
  if(len < 0.5) return;

  // 角度（deg）
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;

  const line = document.createElement("div");
  line.className = "rangeLine";

  // 見た目（style.cssを触らず、ここで完結）
  line.style.position = "absolute";
  line.style.left = `${x1}px`;
  line.style.top  = `${y1}px`;
  line.style.width = `${len}px`;
  line.style.height = "4px";                 // 太さ
  line.style.borderRadius = "999px";
  line.style.transformOrigin = "0 50%";
  line.style.transform = `translate(0, -50%) rotate(${deg}deg)`;
  line.style.pointerEvents = "none";
  line.style.zIndex = "2";

  // “光る” 느낌：控えめ
  line.style.background = "rgba(0, 180, 255, 0.30)";
  line.style.boxShadow  = "0 0 8px rgba(0, 180, 255, 0.35)";

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

    // style.cssを触らずにui.jsだけで完結
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

  // 線より上に
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
