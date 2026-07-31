import { load, subscribe, setSaveErrorHandler } from './state.js';
import { toast } from './ui/toast.js';

import * as header   from './views/header.js';
import * as roster   from './views/roster.js';
import * as tasks    from './views/tasks.js';
import * as events   from './views/events.js';
import * as budget   from './views/budget.js';
import * as patches  from './views/patches.js';
import * as story    from './views/story.js';
import * as pity     from './views/pity.js';
import * as settings from './views/settings.js';
import * as syncView from './views/sync.js';

import { init as initSync, onSyncChange } from './sync/sync.js';

const views = [header, roster, tasks, events, budget, patches, story, pity, settings, syncView];

const actions = Object.assign({}, ...views.map(v => v.actions ?? {}));
const changes = Object.assign({}, ...views.map(v => v.changes ?? {}));
const submits = Object.assign({}, ...views.map(v => v.submits ?? {}));

function render(){
  header.renderHeader();
  roster.renderRoster();
  tasks.renderPeriodic();
  events.renderEvents();
  budget.renderBudget();
  patches.renderPatches();
  story.renderStory();
  pity.renderPity();
  settings.renderSettings();
  syncView.renderSync();
}

/* ---- Event delegation: satu listener untuk seluruh app ---- */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  changes[el.dataset.change]?.(el.dataset, el);
});

document.addEventListener('submit', e => {
  const fn = submits[e.target.id];
  if (!fn) return;
  e.preventDefault();
  fn(e.target);
});

/* ---- Bootstrap ---- */

setSaveErrorHandler(err => toast('Gagal menyimpan: ' + err.message, 'err'));
subscribe(render);

const { migrated, dariKunciLama } = load();
render();

if (migrated)           toast('Data lama berhasil dimigrasi ke format baru.');
else if (dariKunciLama) toast('Data dipindahkan ke penyimpanan Gaming HQ.');

// Sinkronisasi opsional — kalau Supabase belum dikonfigurasi, ini tidak
// melakukan apa pun dan tidak mengunduh apa pun.
onSyncChange(syncView.renderSync);
initSync().catch(err => console.warn('Sync gagal inisialisasi:', err));

// Hitung mundur reset dan pergantian hari-game.
setInterval(() => {
  header.renderHeader();
  roster.renderRoster();
}, 60_000);

// Kembali dari background (umum di HP) — pastikan tampilan tidak basi.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () => {
    // updateViaCache:'none' — jangan ambil sw.js dari HTTP cache saat mengecek
    // pembaruan, supaya versi baru terdeteksi segera setelah deploy.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(err => console.warn('SW gagal daftar:', err));
  });
}
