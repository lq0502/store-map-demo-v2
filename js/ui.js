// js/ui.js
const $ = (id) => document.getElementById(id);

export function clearPins(){
  document.querySelectorAll(".pin").forEach(el => el.remove());
}

export function addPin(row){
  const wrap = $("mapWrap");
  const pin = document.createElement("div");
  pin.className = "pin";
  pin.title = `${row.name ?? ""}（${row.area ?? ""}）`;
  pin.style.left = `${Number(row.x)}%`;
  pin.style.top  = `${Number(row.y)}%`;
  wrap.appendChild(pin);
}

// 渲染结果列表，onCardClick 是点击卡片时的回调函数
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