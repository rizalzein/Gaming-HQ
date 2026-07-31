const ESCAPES = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };

/** Escape untuk disisipkan ke innerHTML — termasuk kutip tunggal agar aman di atribut. */
export function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function byId(id){ return document.getElementById(id); }

export function setHTML(id, html){
  const el = byId(id);
  if (el) el.innerHTML = html;
}

export function setText(id, text){
  const el = byId(id);
  if (el) el.textContent = text;
}

/** Nilai input by id, sudah di-trim. */
export function val(id){
  const el = byId(id);
  return el ? el.value.trim() : '';
}

export function clearInputs(...ids){
  for (const id of ids){ const el = byId(id); if (el) el.value = ''; }
}
