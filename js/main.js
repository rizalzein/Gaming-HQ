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

const actions = Object.assign({}, ...views.map(v => v.actions ?? {}), {
  'nav:go'({ tab }){ location.hash = '#/' + tab; },
});
const changes = Object.assign({}, ...views.map(v => v.changes ?? {}));
const submits = Object.assign({}, ...views.map(v => v.submits ?? {}));

/* ---- Routing sisi klien ----
 * Aplikasi tetap satu halaman; tab hanya memilih section mana yang tampil.
 * Alamatnya ikut berubah (#/koleksi) supaya tombol Back di HP berfungsi dan
 * tab yang sedang dibuka bertahan saat halaman dimuat ulang.
 */
const TABS = [
  { id: 'beranda', sections: ['sec-daily',  'sec-periodic'] },
  { id: 'koleksi', sections: ['sec-story',  'sec-catalog']  },
  { id: 'jadwal',  sections: ['sec-events', 'sec-patches']  },
  { id: 'gacha',   sections: ['sec-budget', 'sec-pity']     },
  { id: 'atur',    sections: ['sec-settings', 'sec-sync']   },
];

const RENDERERS = {
  'sec-daily'   : roster.renderRoster,
  'sec-periodic': tasks.renderPeriodic,
  'sec-story'   : story.renderStory,
  'sec-catalog' : settings.renderCatalog,
  'sec-events'  : events.renderEvents,
  'sec-patches' : patches.renderPatches,
  'sec-budget'  : budget.renderBudget,
  'sec-pity'    : pity.renderPity,
  'sec-settings': settings.renderSettings,
  'sec-sync'    : syncView.renderSync,
};

function currentTab(){
  const id = location.hash.replace(/^#\/?/, '');
  return TABS.find(t => t.id === id) ?? TABS[0];
}

function applyTab(active){
  for (const tab of TABS){
    const tampil = tab === active;
    for (const id of tab.sections){
      const el = document.getElementById(id);
      if (el) el.hidden = !tampil;
    }
  }
  for (const btn of document.querySelectorAll('#tabbar button')){
    const on = btn.dataset.tab === active.id;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  }
}

function render(){
  const active = currentTab();
  header.renderHeader();
  applyTab(active);
  // Hanya section yang tampil yang dirender — katalog 50 item tidak perlu
  // dibangun ulang setiap kali sesuatu di Beranda berubah.
  for (const id of active.sections) RENDERERS[id]?.();
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

// Pindah tab: render ulang lalu kembali ke atas, supaya tidak mendarat di
// tengah halaman mengikuti posisi gulir tab sebelumnya.
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0 });
});

// Hitung mundur reset dan pergantian hari-game.
setInterval(() => {
  header.renderHeader();
  if (currentTab().id === 'beranda') roster.renderRoster();
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
