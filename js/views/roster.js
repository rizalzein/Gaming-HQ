import { commit } from '../state.js';
import { PRIO_LABELS } from '../config.js';
import { setHTML, esc } from '../util/dom.js';
import { msUntilReset, fmtDuration } from '../util/date.js';
import { byPriority, dailyLoginTask, isDone, toggleTask, streak, isHolidayActive, gameById, taskById } from '../domain.js';

export function renderRoster(){
  const games = byPriority();
  if (!games.length){
    setHTML('roster', '<div class="empty">Belum ada game aktif. Tambahkan lewat ◈ 08 Pengaturan.</div>');
    return;
  }

  const holiday = isHolidayActive();

  setHTML('roster', games.map(g => {
    const task = dailyLoginTask(g);
    const done = task ? isDone(task) : false;
    const prio = holiday ? 2 : g.priority;
    const days = streak(g);

    return `<div class="gcard ${done ? 'done' : ''}" style="--gc:${esc(g.color)}">
      <div class="ginfo">
        <div class="gname">${esc(g.name)}</div>
        <div class="gmeta">
          <button type="button" class="prio p${prio}" data-act="game:cyclePrio" data-id="${esc(g.id)}"
                  title="Ganti prioritas">${holiday ? 'LOGIN' : esc(PRIO_LABELS[g.priority] ?? 'LOGIN')}</button>
          <span class="streak">beruntun <b>${days}</b> hari</span>
          <span class="resetin">· reset ${esc(fmtDuration(msUntilReset(g.reset)))}</span>
        </div>
      </div>
      <button type="button" class="claim ${done ? 'stamped' : ''}"
              data-act="task:toggle" data-id="${esc(task?.id ?? '')}">${done ? '✓ CLAIMED' : 'CLAIM'}</button>
    </div>`;
  }).join(''));
}

export const actions = {
  'task:toggle'({ id }){
    const task = taskById(id);
    if (!task) return;
    toggleTask(task);
    commit();
  },
  'game:cyclePrio'({ id }){
    const game = gameById(id);
    if (!game) return;
    game.priority = (game.priority + 1) % PRIO_LABELS.length;
    commit();
  },
};
