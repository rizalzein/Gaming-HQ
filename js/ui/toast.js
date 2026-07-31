import { byId } from '../util/dom.js';

let timer = null;

export function toast(message, kind = 'ok'){
  const el = byId('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('err', kind === 'err');
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), kind === 'err' ? 4500 : 1400);
}
