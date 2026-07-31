import { byId, esc } from '../util/dom.js';

let lastFocus = null;

export function closeModal(){
  const root = byId('modal-root');
  root.hidden = true;
  root.innerHTML = '';
  document.removeEventListener('keydown', onKey);
  lastFocus?.focus?.();
  lastFocus = null;
}

function onKey(e){
  if (e.key === 'Escape') closeModal();
}

/**
 * Modal berbasis <form>.
 *   openModal({ title, body, confirmLabel, extraLabel, onConfirm(form), onExtra() })
 * onConfirm / onExtra boleh mengembalikan false untuk membatalkan penutupan.
 */
export function openModal({ title, body, confirmLabel = 'Simpan', extraLabel, onConfirm, onExtra }){
  const root = byId('modal-root');
  lastFocus = document.activeElement;

  root.innerHTML = `
    <form class="modal" id="modal-form" novalidate>
      <h3>${esc(title)}</h3>
      ${body}
      <div class="modal-actions">
        ${extraLabel ? `<button type="button" class="btn danger" data-modal="extra">${esc(extraLabel)}</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" data-modal="cancel">Batal</button>
        <button type="submit" class="btn">${esc(confirmLabel)}</button>
      </div>
    </form>`;
  root.hidden = false;

  const form = byId('modal-form');

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (onConfirm?.(form) !== false) closeModal();
  });

  root.addEventListener('click', e => {
    if (e.target === root){ closeModal(); return; }
    const act = e.target.closest('[data-modal]')?.dataset.modal;
    if (act === 'cancel') closeModal();
    else if (act === 'extra' && onExtra?.() !== false) closeModal();
  });

  document.addEventListener('keydown', onKey);
  form.querySelector('input,select,textarea')?.focus();
}

/* ---- Helper penyusun field ---- */

export const field = (label, inner, hint = '') =>
  `<div class="field"><label>${esc(label)}</label>${inner}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;

export const input = (name, value = '', attrs = '') =>
  `<input name="${esc(name)}" value="${esc(value)}" ${attrs}>`;

export const select = (name, options, current) =>
  `<select name="${esc(name)}">${options.map(o =>
    `<option value="${esc(o.v)}" ${String(o.v) === String(current) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
