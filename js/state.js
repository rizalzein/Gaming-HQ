/**
 * Penyimpanan & migrasi state. Satu-satunya modul yang menyentuh localStorage.
 *
 * Skema v3 mengganti dua hal dari versi lama:
 *   - checks[tanggal][gameId]  →  progress[periodKey][taskId]  (mendukung mingguan/bulanan)
 *   - pity[gameId] = angka     →  pity[gameId][bannerId] = {count, guaranteed}
 */

import {
  STORAGE_KEY, LEGACY_STORAGE_KEY, SCHEMA_VERSION, GAME_PRESETS, DEFAULT_RESET,
  DEFAULT_BUDGET_CAP, SEED_PRIORITIES, SEED_EVENTS, SEED_PATCHES, SEED_STORY, SEED_HOLIDAY,
} from './config.js';

export let S = null;

const listeners = [];

/** Daftarkan callback yang dipanggil tiap state berubah. */
export function subscribe(fn){ listeners.push(fn); }

/** Simpan state lalu render ulang. Dipakai semua view setelah mengubah data. */
export function commit(){
  save();
  for (const fn of listeners) fn();
}

export function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------- Default ---------------- */

function makeGame(preset){
  return {
    id: preset.id,
    name: preset.name,
    short: preset.short,
    color: preset.color,
    enabled: true,
    priority: SEED_PRIORITIES[preset.id] ?? 2,
    reset: { ...DEFAULT_RESET, ...(preset.reset ?? {}) },
    banners: preset.banners.map(x => ({ ...x })),
  };
}

export function loginTaskId(gameId){ return `${gameId}:login`; }

export function defaultState(){
  const games = GAME_PRESETS.map(makeGame);
  return {
    version : SCHEMA_VERSION,
    games,
    tasks   : games.flatMap(g => [
      { id: loginTaskId(g.id), gameId: g.id, label: 'Login harian', cadence: 'daily', builtin: true },
      { id: uid(),             gameId: g.id, label: 'Misi mingguan', cadence: 'weekly' },
    ]),
    progress: {},
    events  : SEED_EVENTS.map(e => ({ id: uid(), ...e })),
    budget  : { cap: DEFAULT_BUDGET_CAP, months: {} },
    patches : SEED_PATCHES.map(p => ({ id: uid(), ...p })),
    story   : { ...SEED_STORY },
    pity    : {},
    holiday : { ...SEED_HOLIDAY, tips: [...SEED_HOLIDAY.tips] },
  };
}

/* ---------------- Migrasi ---------------- */

/** Ubah state v1/v2 (checks + prios + pity angka) ke bentuk v3. */
function fromLegacy(old){
  const base = defaultState();

  if (old.prios){
    for (const g of base.games){
      if (Number.isInteger(old.prios[g.id])) g.priority = old.prios[g.id];
    }
  }

  const progress = {};
  for (const [date, marks] of Object.entries(old.checks || {})){
    for (const [gid, done] of Object.entries(marks || {})){
      if (!done) continue;
      const key = 'd:' + date;
      (progress[key] ??= {})[loginTaskId(gid)] = true;
    }
  }

  const pity = {};
  for (const [gid, n] of Object.entries(old.pity || {})){
    if (n === null || n === undefined || n === '') continue;
    pity[gid] = { limited: { count: Number(n) || 0, guaranteed: false } };
  }

  // v2: budget = { 'YYYY-MM': [...] } tanpa plafon.
  const months = (old.budget && !old.budget.months) ? old.budget : (old.budget?.months ?? {});

  return {
    ...base,
    progress,
    pity,
    events : Array.isArray(old.events)  ? old.events.map(e  => ({ ...e, id: e.id ?? uid() })) : base.events,
    patches: Array.isArray(old.patches) ? old.patches.map(p => ({ ...p, id: p.id ?? uid() })) : base.patches,
    story  : { ...base.story, ...(old.story || {}) },
    budget : { cap: DEFAULT_BUDGET_CAP, months },
    holiday: { ...base.holiday, mode: old.holidayManual ?? null },
  };
}

/** Lengkapi field yang hilang / rusak agar render tidak pernah kena undefined. */
function fillGaps(s){
  const d = defaultState();
  const out = { ...d, ...s, version: SCHEMA_VERSION };

  out.games = (Array.isArray(s.games) && s.games.length ? s.games : d.games).map(g => ({
    ...g,
    enabled : g.enabled !== false,
    priority: Number.isInteger(g.priority) ? g.priority : 2,
    reset   : { ...DEFAULT_RESET, ...(g.reset || {}) },
    banners : Array.isArray(g.banners) ? g.banners : [],
  }));

  out.tasks = Array.isArray(s.tasks) ? s.tasks.filter(t => t && t.id) : d.tasks;
  for (const g of out.games){
    if (!out.tasks.some(t => t.id === loginTaskId(g.id))){
      out.tasks.push({ id: loginTaskId(g.id), gameId: g.id, label: 'Login harian', cadence: 'daily', builtin: true });
    }
  }

  if (!out.progress || typeof out.progress !== 'object') out.progress = {};
  if (!Array.isArray(out.events))  out.events  = [];
  if (!Array.isArray(out.patches)) out.patches = [];
  if (!out.story || typeof out.story !== 'object') out.story = {};
  if (!out.pity  || typeof out.pity  !== 'object') out.pity  = {};

  const budget = (out.budget && typeof out.budget === 'object') ? out.budget : {};
  out.budget = {
    cap   : typeof budget.cap === 'number' ? budget.cap : DEFAULT_BUDGET_CAP,
    months: (budget.months && typeof budget.months === 'object') ? budget.months : {},
  };

  out.holiday = { ...d.holiday, ...(out.holiday || {}) };
  if (!Array.isArray(out.holiday.tips)) out.holiday.tips = [...d.holiday.tips];

  return out;
}

/**
 * v3 menyeragamkan jam reset semua game ke 04:00 UTC+8. Dua di antaranya
 * ternyata berbeda: NTE reset 05:00 waktu server, dan Solo Leveling: ARISE
 * tidak memakai server regional sama sekali — resetnya serentak 00:00 UTC.
 *
 * Koreksi hanya diterapkan kalau nilainya masih default lama persis, supaya
 * penyetelan manual yang sudah diubah pengguna tidak ikut tertimpa.
 */
const V4_RESET_FIX = {
  nte: { tz: 480, hour: 5 },
  sla: { tz: 0,   hour: 0 },
};

function toV4(s){
  if (!Array.isArray(s.games)) return s;
  for (const game of s.games){
    const fix = V4_RESET_FIX[game.id];
    if (!fix) continue;
    const { tz, hour } = game.reset ?? {};
    if (tz === 480 && hour === 4) game.reset = { ...fix };
  }
  return s;
}

export function migrate(raw){
  if (!raw || typeof raw !== 'object') return defaultState();

  const version = raw.version ?? raw.dataVersion ?? 1;
  let s = raw;
  if (version < 3) s = fromLegacy(s);
  if (version < 4) s = toV4(s);
  return fillGaps(s);
}

/* ---------------- Persistence ---------------- */

let onSaveError = () => {};
export function setSaveErrorHandler(fn){ onSaveError = fn; }

export function load(){
  let raw = null;
  let dariKunciLama = false;

  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null){
      raw = JSON.parse(current);
    } else {
      const warisan = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (warisan !== null){
        raw = JSON.parse(warisan);
        dariKunciLama = true;
      }
    }
  } catch (e){
    console.error('Data tersimpan rusak, memakai default:', e);
  }

  const skemaLama = raw && (raw.version ?? raw.dataVersion ?? 1) < SCHEMA_VERSION;
  S = migrate(raw);

  // Tulis ulang sekali kalau skemanya naik versi atau isinya baru dipindahkan
  // dari kunci lama, supaya pemuatan berikutnya langsung memakai kunci baru.
  if (skemaLama || dariKunciLama) save();

  return { migrated: !!skemaLama, dariKunciLama, fresh: !raw };
}

export function save(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    return true;
  } catch (e){
    console.error('Gagal menyimpan:', e);
    onSaveError(e);
    return false;
  }
}

/** Ganti seluruh state (dipakai saat restore backup). Menerima format lama juga. */
export function replaceState(raw){
  S = migrate(raw);
  commit();
}

export function serialize(){
  return JSON.stringify(S, null, 2);
}

/** Perkiraan ukuran data di localStorage, dalam KB. */
export function storageSizeKB(){
  try {
    return Math.round((localStorage.getItem(STORAGE_KEY) || '').length / 1024 * 10) / 10;
  } catch { return 0; }
}
