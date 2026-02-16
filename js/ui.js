// js/ui.js

// ID取得の短縮関数
const $ = (id) => document.getElementById(id);

// 地図上のすべてのピン/ラインを削除する関数
export function clearPins(){
  // .pin（点）と .line（線）を全削除
  document.querySelectorAll(".pin, .line").forEach(el => el.remove());
}

// ===== 内部：ラベル文字を決める =====
function getLabelText(row){
  return (row.label ?? row.name ?? "").toString().trim();
}

// ===== 点（従来のピン＋ラベル） =====
function addPoint(row){
  const wrap = $("mapWrap");
  const pin = document.createElement("div");
  pin.className = "pin";

  // マウスオーバー時のツールチップ
  pin.title = `${row.name ?? ""}（${row.area ?? ""}）`;

  // 座標（%）
  pin.style.left = `${Number(row.x)}%`;
  pin.style.top  = `${Number(row.y)}%`;

  // ラベル（pinLabelクラスがあればそれを使用。無ければ最小スタイルをJSで付与）
  const labelText = getLabelText(row);
  if(labelText){
    const label = document.createElement("div");
    label.className = "pinLabel";
    label.textContent = labelText;

    // style.cssを触らずui.jsだけで完結させる最低限の見た目
    label.style.position = "absolute";
    label.style.left = "12px";     // ピン右
    label.style.top  = "-6px";     // 少し上
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

  wrap.appendChild(pin);
}

// ===== 線（横に長い商品の範囲表示） =====
// 前提：row.x,row.y,row.x2,row.y2 は「%」で入っている
function addLine(row){
  const wrap = $("mapWrap");

  const x1 = Number(row.x);
  const y1 = Number(row.y);
  const x2 = Number(row.x2);
  const y2 = Number(row.y2);

  // どれかが不正なら点表示にフォールバック
  if(!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)){
    addPoint(row);
    return;
  }

  // mapWrapの実サイズ(px)で距離と角度を計算
  const rect = wrap.getBoundingClientRect();
  const px1 = rect.width  * (x1 / 100);
  const py1 = rect.height * (y1 / 100);
  const px2 = rect.width  * (x2 / 100);
  const py2 = rect.height * (y2 / 100);

  const dx = px2 - px1;
  const dy = py2 - py1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const ang = Math.atan2(dy, dx) * 180 / Math.PI;

  // 线段本体
  const line = document.createElement("div");
  line.className = "line";
  line.title = `${row.name ?? ""}（${row.area ?? ""}〜${row.area2 ?? ""}）`;

  // 线段样式（不依赖style.css，JS内自带）
  line.style.position = "absolute";
  line.style.height = "10px";                 // 太さ
  line.style.borderRadius = "999px";
  line.style.background = "rgba(255,45,85,.25)";
  line.style.boxShadow = "0 0 14px rgba(255,45,85,.55)";
  line.style.transformOrigin = "0 50%";
  line.style.pointerEvents = "none";

  // 左端を (x1,y1) に置いて回転させる
  line.style.left = `${x1}%`;
  line.style.top  = `${y1}%`;
  line.style.width = `${len}px`;
  line.style.transform = `translate(0,-50%) rotate(${ang}deg)`;

  // 両端の丸（点っぽく見せる）
  const endA = document.createElement("div");
  const endB = document.createElement("div");
  [endA, endB].forEach(end => {
    end.style.position = "absolute";
    end.style.width = "14px";
    end.style.height = "14px";
    end.style.borderRadius = "999px";
    end.style.background = "#FF2D55";
    end.style.border = "3px solid #fff";
    end.style.boxShadow = "0 10px 18px rgba(0,0,0,.20)";
    end.style.top = "50%";
    end.style.transform = "translate(-50%,-50%)";
  });
  endA.style.left = "0";
  endB.style.left = "100%";
  line.appendChild(endA);
  line.appendChild(endB);

  // ラベル（線の中央に）
  const labelText = getLabelText(row);
  if(labelText){
    const label = document.createElement("div");
    label.className = "lineLabel";
    label.textContent = labelText;

    label.style.position = "absolute";
    label.style.left = "50%";
    label.style.top  = "-18px";
    label.style.transform = "translateX(-50%)";
    label.style.padding = "4px 8px";
    label.style.borderRadius = "999px";
    label.style.border = "1px solid #eee";
    label.style.background = "rgba(255,255,255,.92)";
    label.style.boxShadow = "0 8px 16px rgba(0,0,0,.12)";
    label.style.fontSize = "12px";
    label.style.color = "#111";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none";

    line.appendChild(label);
  }

  wrap.appendChild(line);
}

// 地図上にピン/ラインを1つ追加する関数（外部API）
export function addPin(row){
  // row.x2 / row.y2 があれば「線」、なければ「点」
  const hasLine =
    row.x2 !== undefined && row.y2 !== undefined &&
    row.x2 !== "" && row.y2 !== "";

  if(hasLine){
    addLine(row);
  }else{
    addPoint(row);
  }
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

// 画面上部のメッセージエリアを更新する関数
export function updateMeta(row){
  $("meta").innerHTML =
    `見つかった商品：<b>${row.name ?? "-"}</b><br>` +
    `カテゴリ：${row.category ?? "-"} / ブランド：${row.brand ?? "-"}<br>` +
    `場所：${row.area ?? "-"}${row.note ? "（" + row.note + "）" : ""}`;
}

// 単純なメッセージを表示する汎用関数
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
