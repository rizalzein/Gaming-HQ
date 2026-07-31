import { S, commit, uid } from '../state.js';
import { CADENCE_LABELS } from '../config.js';
import { setHTML, setText, esc } from '../util/dom.js';
import { openModal, field, input, select } from '../ui/modal.js';
import { periodicTasks, isDone, toggleTask, gameById, taskById } from '../domain.js';

const gameOptions = () => [{ v: '', l: '— Umum —' }, ...S.games.map(g => ({ v: g.id, l: g.name }))];

const cadenceOptions = Object.entries(CADENCE_LABELS).map(([v, l]) => ({ v, l }));

export function renderPeriodic(){
  const tasks = periodicTasks();

  if (!tasks.length){
    setText('periodic-tag', '');
    setHTML('periodic', '<div class="empty">Belum ada tugas berulang. Tekan “+ Tugas” untuk menambah misi mingguan, boss weekly, atau paket bulanan.</div>');
    return;
  }

  const done = tasks.filter(isDone).length;
  setText('periodic-tag', `${done}/${tasks.length} selesai periode ini`);

  setHTML('periodic', tasks.map(t => {
    const game = gameById(t.gameId);
    const finished = isDone(t);
    return `<div class="task ${finished ? 'done' : ''}" style="--gc:${esc(game?.color ?? '#6a739f')}">
      <button type="button" class="box" data-act="task:toggle" data-id="${esc(t.id)}"
              aria-pressed="${finished}" title="Tandai selesai">✓</button>
      <div class="tbody">
        <div class="tlabel">${esc(t.label)}</div>
        <div class="tmeta">
          <span class="cad ${esc(t.cadence)}">${esc(CADENCE_LABELS[t.cadence] ?? t.cadence)}</span>
          ${game ? ' · ' + esc(game.short) : ''}
        </div>
      </div>
      <button type="button" class="del" data-act="task:edit" data-id="${esc(t.id)}" title="Ubah">✎</button>
      <button type="button" class="del" data-act="task:delete" data-id="${esc(t.id)}" title="Hapus">✕</button>
    </div>`;
  }).join(''));
}

function taskModal(task){
  const isNew = !task;
  openModal({
    title: isNew ? 'Tugas baru' : 'Ubah tugas',
    body:
      field('Nama tugas', input('label', task?.label ?? '', 'placeholder="Misal: Weekly boss / Simulated Universe" required')) +
      field('Game', select('gameId', gameOptions(), task?.gameId ?? '')) +
      field('Pengulangan', select('cadence', cadenceOptions, task?.cadence ?? 'weekly'),
            'Periode dihitung dari jam reset game yang dipilih. Mingguan berganti tiap Senin.'),
    confirmLabel: isNew ? 'Tambah' : 'Simpan',
    extraLabel: isNew ? undefined : 'Hapus',
    onConfirm(form){
      const label = form.label.value.trim();
      if (!label){ form.label.focus(); return false; }
      const patch = { label, gameId: form.gameId.value, cadence: form.cadence.value };
      if (isNew) S.tasks.push({ id: uid(), ...patch });
      else Object.assign(task, patch);
      commit();
    },
    onExtra(){
      S.tasks = S.tasks.filter(t => t.id !== task.id);
      commit();
    },
  });
}

export const actions = {
  'task:new'(){ taskModal(null); },
  'task:edit'({ id }){
    const task = taskById(id);
    if (task) taskModal(task);
  },
  'task:delete'({ id }){
    const task = taskById(id);
    if (!task || !confirm(`Hapus tugas “${task.label}”?`)) return;
    S.tasks = S.tasks.filter(t => t.id !== id);
    commit();
  },
};
