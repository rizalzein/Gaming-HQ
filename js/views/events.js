import { S, commit, uid } from '../state.js';
import { setHTML, esc, byId, clearInputs } from '../util/dom.js';
import { shortDate } from '../util/format.js';
import { daysUntil } from '../util/date.js';
import { gameById } from '../domain.js';
import { toast } from '../ui/toast.js';

export function renderEvents(){
  const sorted = [...S.events].sort((a, b) => a.date.localeCompare(b.date));

  setHTML('evlist', sorted.length ? sorted.map(ev => {
    const d = daysUntil(ev.date);
    const game = gameById(ev.game);
    const cls = [d < 0 ? 'past' : (d <= 6 ? 'urgent' : ''), ev.money ? 'money' : ''].filter(Boolean).join(' ');
    const big = d < 0 ? 'lewat' : (d === 0 ? 'HARI INI' : d);
    const small = (d <= 0) ? '' : 'HARI LAGI';

    return `<div class="ev ${cls}">
      <div class="days">${big}<small>${small}</small></div>
      <div class="evbody">
        <div class="evname">${esc(ev.name)}</div>
        <div class="evsub">${game ? esc(game.name) + ' · ' : ''}${esc(shortDate(ev.date))}</div>
      </div>
      <button type="button" class="del" data-act="event:delete" data-id="${esc(ev.id)}" title="Hapus">✕</button>
    </div>`;
  }).join('') : '<div class="empty">Belum ada deadline tercatat.</div>');

  syncGameSelect();
}

/** Pilihan game di form event mengikuti daftar game yang bisa berubah. */
function syncGameSelect(){
  const sel = byId('ev-game');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Umum —</option>' +
    S.games.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
  if (current) sel.value = current;
}

export const actions = {
  'event:delete'({ id }){
    S.events = S.events.filter(e => e.id !== id);
    commit();
  },
  'event:clearPast'(){
    const stale = S.events.filter(e => daysUntil(e.date) < 0);
    if (!stale.length){ toast('Tidak ada deadline yang sudah lewat.'); return; }
    if (!confirm(`Hapus ${stale.length} deadline yang sudah lewat?`)) return;
    S.events = S.events.filter(e => daysUntil(e.date) >= 0);
    commit();
    toast(`${stale.length} deadline dibersihkan.`);
  },
};

export const submits = {
  'ev-form'(){
    const name = byId('ev-name').value.trim();
    const date = byId('ev-date').value;
    if (!name || !date){ toast('Isi nama event dan tanggalnya dulu.', 'err'); return; }
    S.events.push({ id: uid(), name, game: byId('ev-game').value, date });
    clearInputs('ev-name', 'ev-date');
    commit();
  },
};
