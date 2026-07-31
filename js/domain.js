/** Logika turunan di atas state: periode tugas, streak, prioritas, pity. */

import { S, loginTaskId } from './state.js';
import { DEFAULT_RESET } from './config.js';
import { periodKey, dayKey, addDays, localDayKey } from './util/date.js';

export const gameById     = id => S.games.find(g => g.id === id);
export const enabledGames = ()  => S.games.filter(g => g.enabled);

export const byPriority = () =>
  [...enabledGames()].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

export function resetOf(task){
  return gameById(task.gameId)?.reset ?? DEFAULT_RESET;
}

export function keyFor(task, date = new Date()){
  return periodKey(task.cadence, resetOf(task), date);
}

export const taskById = id => S.tasks.find(t => t.id === id);

export function isDone(task){
  return !!S.progress[keyFor(task)]?.[task.id];
}

export function toggleTask(task){
  const key = keyFor(task);
  const bucket = (S.progress[key] ??= {});
  if (bucket[task.id]){
    delete bucket[task.id];
    if (!Object.keys(bucket).length) delete S.progress[key];
  } else {
    bucket[task.id] = true;
  }
}

export const dailyLoginTask = game => S.tasks.find(t => t.id === loginTaskId(game.id));

/** Jumlah hari-game berturut-turut game itu di-login, berakhir hari ini. */
export function streak(game){
  const id = loginTaskId(game.id);
  let key = dayKey(game.reset);
  if (!S.progress['d:' + key]?.[id]) key = addDays(key, -1);   // hari ini belum diklaim, jangan putus streak
  let n = 0;
  while (S.progress['d:' + key]?.[id] && n < 3650){
    n++;
    key = addDays(key, -1);
  }
  return n;
}

export function loginCount(){
  const games = enabledGames();
  const done = games.filter(g => {
    const t = dailyLoginTask(g);
    return t && isDone(t);
  }).length;
  return { done, total: games.length };
}

const CADENCE_ORDER = { weekly: 0, monthly: 1, daily: 2 };

/** Semua tugas selain login bawaan, untuk section "Tugas Berulang". */
export function periodicTasks(){
  return S.tasks
    .filter(t => !t.builtin)
    .sort((a, b) =>
      CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence] ||
      (gameById(a.gameId)?.priority ?? 9) - (gameById(b.gameId)?.priority ?? 9) ||
      a.label.localeCompare(b.label));
}

export function isHolidayActive(){
  const h = S.holiday;
  if (typeof h.mode === 'boolean') return h.mode;
  return autoHoliday();
}

export function autoHoliday(){
  const h = S.holiday;
  if (!h.start || !h.end) return false;
  const t = localDayKey();
  return t >= h.start && t <= h.end;
}

export function pityOf(gameId, bannerId){
  return S.pity[gameId]?.[bannerId] ?? { count: 0, guaranteed: false };
}

export function setPity(gameId, bannerId, patch){
  const bucket = (S.pity[gameId] ??= {});
  bucket[bannerId] = { ...pityOf(gameId, bannerId), ...patch };
}
