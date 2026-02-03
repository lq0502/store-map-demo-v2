// js/api.js
const API_URL = "https://script.google.com/macros/s/AKfycbx1qC57Bm_ypQJGSNGG8UnHL_KatQncBCNPAjtaK7d5ETO__AHqIu5LV_WrqN_oA6D_gw/exec";

function norm(s){ return (s ?? "").toString().trim().toLowerCase(); }

function buildIndex(row){
  return [row.name, row.category, row.brand, row.keywords, row.area, row.note].map(norm).join(" ");
}

export async function loadItems({force=false}={}){
  const res = await fetch(API_URL, { cache: force ? "no-store" : "default" });
  if(!res.ok) throw new Error("API error: " + res.status);
  
  const data = await res.json();
  if(!data.items) throw new Error("Invalid JSON shape");
  
  // 增加 _index 字段用于搜索
  return data.items.map(r => ({...r, _index: buildIndex(r)}));
}

export { norm };