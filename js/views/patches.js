import { S, commit, uid } from '../state.js';
import { SEED_PATCHES } from '../config.js';
import { setHTML, esc } from '../util/dom.js';
import { openModal, field, input, select } from '../ui/modal.js';
import { gameById, activeGames } from '../domain.js';
import { toast } from '../ui/toast.js';

const gameOptions = () => [{ v: '', l: '— Umum —' }, ...activeGames().map(g => ({ v: g.id, l: g.name }))];

export function renderPatches(){
  setHTML('patchlist', S.patches.length ? S.patches.map(p => {
    const game = gameById(p.game);
    return `<div class="patch" style="--pc:${esc(game?.color ?? '#6a739f')}">
      <span>${esc(p.label)}</span>
      <span>
        <span class="pd">${esc(p.date)}</span>
        <button type="button" class="del" data-act="patch:edit" data-id="${esc(p.id)}" title="Ubah">✎</button>
      </span>
    </div>`;
  }).join('') : '<div class="empty">Belum ada jadwal patch.</div>');
}

function patchModal(patch){
  const isNew = !patch;
  openModal({
    title: isNew ? 'Patch baru' : 'Ubah patch',
    body:
      field('Keterangan', input('label', patch?.label ?? '', 'placeholder="Misal: Genshin 7.0 — Snezhnaya" required')) +
      field('Game', select('game', gameOptions(), patch?.game ?? '')) +
      field('Tanggal', input('date', patch?.date ?? '', 'placeholder="Misal: 12 Agu atau ±20 Agu"'),
            'Bebas teks — pakai ± untuk tanggal yang masih perkiraan.'),
    confirmLabel: isNew ? 'Tambah' : 'Simpan',
    extraLabel: isNew ? undefined : 'Hapus',
    onConfirm(form){
      const label = form.label.value.trim();
      if (!label){ form.label.focus(); return false; }
      const patchData = { label, game: form.game.value, date: form.date.value.trim() };
      if (isNew) S.patches.push({ id: uid(), ...patchData });
      else Object.assign(patch, patchData);
      commit();
    },
    onExtra(){
      S.patches = S.patches.filter(p => p.id !== patch.id);
      commit();
    },
  });
}

export const actions = {
  'patch:new'(){ patchModal(null); },

  /** Sama seperti event: hanya menambahkan yang belum ada, tidak menggandakan. */
  'patch:loadSeed'(){
    const sudahAda = new Set(S.patches.map(p => `${p.label}|${p.date}`));
    const baru = SEED_PATCHES.filter(p => !sudahAda.has(`${p.label}|${p.date}`));

    if (!baru.length){ toast('Semua jadwal patch bawaan sudah ada.'); return; }
    if (!confirm(`Tambahkan ${baru.length} jadwal patch yang belum ada? Entri buatan Anda tidak disentuh.`)) return;

    S.patches.push(...baru.map(p => ({ id: uid(), ...p })));
    commit();
    toast(`${baru.length} jadwal patch ditambahkan.`);
  },
  'patch:edit'({ id }){
    const patch = S.patches.find(p => p.id === id);
    if (patch) patchModal(patch);
  },
};
