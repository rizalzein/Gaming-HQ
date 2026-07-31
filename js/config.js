/**
 * Konstanta dan data preset. Semua di sini hanya jadi *nilai awal* —
 * begitu app dijalankan, datanya pindah ke state dan bisa diedit lewat UI.
 */

export const STORAGE_KEY    = 'markas-gacha';
export const SCHEMA_VERSION = 3;

/** Server Asia HoYoverse / Kuro reset 04:00 UTC+8 (= 03:00 WIB). */
export const DEFAULT_RESET = { tz: 480, hour: 4 };

export const DEFAULT_BUDGET_CAP = 400_000;

export const PRIO_LABELS = ['FOKUS', 'AKTIF', 'LOGIN'];

export const CADENCE_LABELS = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

export const TZ_CHOICES = [
  { v: 420,  l: 'UTC+7 — WIB / server SEA' },
  { v: 480,  l: 'UTC+8 — server Asia (HoYo, Kuro)' },
  { v: 540,  l: 'UTC+9 — server Korea / Jepang' },
  { v: 0,    l: 'UTC+0 — server Eropa' },
  { v: -300, l: 'UTC-5 — server Amerika' },
];

/**
 * Angka pity di bawah ini adalah nilai umum yang beredar, bukan angka resmi,
 * dan untuk game baru sebagian masih perkiraan. Semuanya bisa diedit per game
 * lewat Pengaturan → Banner.
 */
const b = (id, label, hard, soft, fifty) => ({ id, label, hard, soft, fifty });

const HOYO_BANNERS = [
  b('limited',  'Karakter (limited)', 90, 74, true),
  b('weapon',   'Senjata / Light Cone', 80, 64, false),
  b('standard', 'Standar', 90, 74, false),
];

const GENERIC_BANNERS = [
  b('limited',  'Karakter (limited)', 80, 70, true),
  b('weapon',   'Senjata', 80, 70, false),
];

export const GAME_PRESETS = [
  { id:'endfield', name:'Arknights: Endfield',    short:'Endfield', color:'#f5c542', banners: GENERIC_BANNERS },
  { id:'genshin',  name:'Genshin Impact',          short:'Genshin',  color:'#4fd8c4', banners: HOYO_BANNERS },
  { id:'wuwa',     name:'Wuthering Waves',         short:'WuWa',     color:'#9be15d', banners: [
      b('limited',  'Resonator (limited)', 80, 66, true),
      b('weapon',   'Senjata (dijamin)',   80, 66, false),
      b('standard', 'Standar',             80, 66, false),
    ] },
  { id:'hsr',      name:'Honkai: Star Rail',       short:'HSR',      color:'#a78bfa', banners: HOYO_BANNERS },
  { id:'zzz',      name:'Zenless Zone Zero',       short:'ZZZ',      color:'#ff8a3d', banners: HOYO_BANNERS },
  { id:'nte',      name:'Neverness to Everness',   short:'NTE',      color:'#ff5fa2', banners: GENERIC_BANNERS },
  { id:'sla',      name:'Solo Leveling: ARISE',    short:'SL:ARISE', color:'#6d5cff', banners: GENERIC_BANNERS },
  { id:'hi3',      name:'Honkai Impact 3rd',       short:'HI3',      color:'#6ec6ff', banners: [
      b('limited',  'Expansion Supply', 90, 74, false),
      b('standard', 'Standar',          90, 74, false),
    ] },
];

/** Prioritas awal per game (0 = FOKUS, 1 = AKTIF, 2 = LOGIN). */
export const SEED_PRIORITIES = {
  zzz: 0, genshin: 0, endfield: 1, wuwa: 1, hsr: 1, nte: 2, sla: 2, hi3: 2,
};

// Contoh isi untuk pemasangan baru. Agenda pribadi tidak ditaruh di sini —
// tambahkan lewat UI supaya tersimpan di browser, bukan ikut masuk repo.
export const SEED_EVENTS = [
  { name:'HSR 4.4 Phase 2 — Cerydra, Anaxa, Aventurine rerun', game:'hsr', date:'2026-08-05' },
  { name:'ZZZ: klaim selector S-Rank + 1.600 Polychrome + 20 Signal Search', game:'zzz', date:'2026-08-07' },
  { name:'HSR: klaim Gilgamesh/Archer gratis (kalau belum)', game:'hsr',   date:'2026-08-07' },
  { name:'Endfield: banner Arcane tutup → Phase 2 Liino mulai', game:'endfield', date:'2026-08-09' },
  { name:'⚠️ Genshin 6.7 + event Fontinalia BERAKHIR',     game:'genshin', date:'2026-08-11' },
  { name:'Genshin 7.0 Snezhnaya rilis (elemen baru)',       game:'genshin', date:'2026-08-12' },
  { name:'WuWa 3.5 berakhir (Suisui & Aemeath tutup)',      game:'wuwa',    date:'2026-08-19' },
  { name:'NTE 1.2 berakhir',                                game:'nte',     date:'2026-08-19' },
  { name:'WuWa 3.6 rilis (Qingxiao, Mengzhou)',             game:'wuwa',    date:'2026-08-20' },
  { name:'HSR 4.5 rilis (Robin Summeretto)',                game:'hsr',     date:'2026-08-26' },
];

export const SEED_PATCHES = [
  { game:'endfield', label:'Endfield 1.4 P2 — Liino',    date:'9 Agu' },
  { game:'genshin',  label:'Genshin 7.0 — Snezhnaya',    date:'12 Agu' },
  { game:'wuwa',     label:'WuWa 3.6 — Qingxiao',        date:'±20 Agu' },
  { game:'nte',      label:'NTE 1.3',                    date:'±20 Agu' },
  { game:'hsr',      label:'HSR 4.5 — Robin Summeretto', date:'±26 Agu' },
  { game:'zzz',      label:'ZZZ 3.2',                    date:'±9 Sep' },
];

// Posisi story diisi sendiri lewat ◈ 06 — sengaja dikosongkan agar progres
// pribadi tidak tersimpan di dalam kode.
export const SEED_STORY = {};

export const SEED_HOLIDAY = {
  mode : null,            // null = ikut tanggal, true/false = paksa on/off
  label: '',
  start: '',
  end  : '',
  tips : [
    'Game prioritas rendah — login + claim, jangan main',
    'Game utama — buka, klaim daily, tutup',
    'Jangan buka event besar, jangan pull, jangan farming',
  ],
};
